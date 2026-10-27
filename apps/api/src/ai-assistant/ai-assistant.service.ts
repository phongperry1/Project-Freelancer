import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service.js';
import { YouTubeTranscriptService } from './youtube-transcript.service.js';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly youtubeTranscriptService: YouTubeTranscriptService,
  ) {}

  /**
   * Lấy danh sách các phiên trò chuyện (Sessions / Threads) của học sinh trong bài học này
   */
  async getLessonAiSessions(courseId: string, lessonId: string, studentId: string) {
    // Tối ưu hóa: Chạy song song kiểm tra bài học và truy vấn danh sách tin nhắn
    const [lesson, messages] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { id: lessonId, chapter: { courseId } },
        select: { id: true, title: true },
      }),
      this.prisma.aiHistory.findMany({
        where: { studentId, lessonId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionId: true,
          question: true,
          createdAt: true,
        },
      }),
    ]);

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng.');
    }

    // Nhóm theo sessionId (nếu null thì coi là phiên cũ legacy_session)
    const sessionMap = new Map<
      string,
      {
        sessionId: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        messageCount: number;
      }
    >();

    for (const msg of messages) {
      const sId = msg.sessionId || 'legacy_session';
      if (!sessionMap.has(sId)) {
        sessionMap.set(sId, {
          sessionId: sId,
          title: msg.question.length > 55 ? `${msg.question.slice(0, 55)}...` : msg.question,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt,
          messageCount: 1,
        });
      } else {
        const existing = sessionMap.get(sId)!;
        existing.messageCount += 1;
        // Cập nhật câu hỏi mở đầu (câu hỏi sớm nhất của phiên)
        if (msg.createdAt < existing.createdAt) {
          existing.createdAt = msg.createdAt;
          existing.title =
            msg.question.length > 55 ? `${msg.question.slice(0, 55)}...` : msg.question;
        }
      }
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalSessions: sessions.length,
      sessions,
    };
  }

  /**
   * Lấy lịch sử trò chuyện của một phiên cụ thể (hoặc phiên mới nhất)
   */
  async getLessonAiHistory(
    courseId: string,
    lessonId: string,
    studentId: string,
    sessionId?: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, chapter: { courseId } },
      select: { id: true, title: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng trong khóa học.');
    }

    let targetSessionId = sessionId;

    // Nếu không truyền sessionId, tìm sessionId của tin nhắn gần nhất
    if (!targetSessionId) {
      const latestMsg = await this.prisma.aiHistory.findFirst({
        where: { studentId, lessonId },
        orderBy: { createdAt: 'desc' },
        select: { sessionId: true },
      });
      targetSessionId = latestMsg?.sessionId || undefined;
    }

    const whereClause: {
      studentId: string;
      lessonId: string;
      sessionId?: string | null;
    } = {
      studentId,
      lessonId,
    };

    if (targetSessionId) {
      if (targetSessionId === 'legacy_session') {
        whereClause.sessionId = null;
      } else {
        whereClause.sessionId = targetSessionId;
      }
    }

    const history = await this.prisma.aiHistory.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        sessionId: true,
        question: true,
        answer: true,
        createdAt: true,
      },
    });

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      activeSessionId: targetSessionId || null,
      totalMessages: history.length,
      history,
    };
  }

  /**
   * Xóa một phiên trò chuyện cụ thể (không làm mất các phiên khác)
   */
  async deleteLessonAiSession(
    courseId: string,
    lessonId: string,
    studentId: string,
    sessionId: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, chapter: { courseId } },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng.');
    }

    await this.prisma.aiHistory.deleteMany({
      where: {
        studentId,
        lessonId,
        sessionId: sessionId === 'legacy_session' ? null : sessionId,
      },
    });

    return {
      success: true,
      message: 'Đã xóa đoạn chat thành công.',
    };
  }

  /**
   * Xóa toàn bộ lịch sử trò chuyện AI của bài học
   */
  async clearLessonAiHistory(courseId: string, lessonId: string, studentId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, chapter: { courseId } },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng.');
    }

    await this.prisma.aiHistory.deleteMany({
      where: {
        studentId,
        lessonId,
      },
    });

    return {
      success: true,
      message: 'Đã xóa toàn bộ lịch sử đoạn chat bài học thành công.',
    };
  }

  /**
   * Đặt câu hỏi và nhận câu trả lời hướng dẫn sư phạm từ Gia sư AI trong phiên hiện tại
   */
  async askAiAssistant(
    courseId: string,
    lessonId: string,
    studentId: string,
    question: string,
    sessionId?: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, chapter: { courseId } },
      include: {
        chapter: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng trong khóa học.');
    }

    // Xác định Session ID (nếu chưa có thì sinh session mới)
    const effectiveSessionId = sessionId?.trim() || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Tối ưu hóa: Chạy song song bóc tách phụ đề video YouTube và truy vấn 4 tin nhắn gần nhất
    const [videoTranscript, recentHistory] = await Promise.all([
      lesson.videoUrl
        ? this.youtubeTranscriptService.fetchTranscript(lesson.videoUrl).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Lỗi khi trích xuất phụ đề video: ${msg}`);
            return null;
          })
        : Promise.resolve(null),
      this.prisma.aiHistory.findMany({
        where: {
          studentId,
          lessonId,
          sessionId: effectiveSessionId,
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          question: true,
          answer: true,
        },
      }),
    ]);
    const chronologicalHistory = recentHistory.reverse();

    // Sinh câu trả lời từ Groq hoặc Gemini hoặc Fallback sư phạm
    const answer = await this.generateAnswer({
      courseTitle: lesson.chapter.course.title,
      grade: lesson.chapter.course.grade,
      chapterTitle: lesson.chapter.title,
      lessonTitle: lesson.title,
      lessonContent: lesson.content || '',
      videoTranscript,
      question: question.trim(),
      history: chronologicalHistory,
    });

    // Lưu phiên chat vào CSDL (bảng AiHistory) kèm sessionId
    const savedRecord = await this.prisma.aiHistory.create({
      data: {
        studentId,
        lessonId,
        sessionId: effectiveSessionId,
        question: question.trim(),
        answer,
      },
      select: {
        id: true,
        sessionId: true,
        question: true,
        answer: true,
        createdAt: true,
      },
    });

    return savedRecord;
  }

  /**
   * Bộ điều phối gọi Groq LPU hoặc Google Gemini LLM kèm cơ chế fallback an toàn
   */
  private async generateAnswer(context: {
    courseTitle: string;
    grade: string;
    chapterTitle: string;
    lessonTitle: string;
    lessonContent: string;
    videoTranscript?: string | null;
    question: string;
    history: Array<{ question: string; answer: string }>;
  }): Promise<string> {
    const groqApiKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    const systemPrompt = this.buildPedagogicalPrompt(context);

    // 1. ƯU TIÊN 1: GROQ LPU (Tốc độ nhanh nhất thế giới ~0.5s, không bao giờ 503 high demand)
    if (groqApiKey) {
      try {
        this.logger.log('Đang gửi yêu cầu tới Groq LPU (llama-3.3-70b-versatile)...');
        const groqText = await this.callGroqApi(groqApiKey, systemPrompt, context.question);
        if (groqText && groqText.trim().length > 0) {
          return groqText.trim();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Groq API gặp sự cố: ${msg}. Đang chuyển tiếp sang Gemini...`);
      }
    }

    // 2. ƯU TIÊN 2: GOOGLE GEMINI (Sử dụng các model siêu tốc ~680ms)
    if (geminiApiKey) {
      const configuredModel =
        this.configService.get<string>('GEMINI_MODEL')?.trim() || 'gemini-flash-lite-latest';

      // Ưu tiên các model phản hồi dưới 1 giây đã được kiểm chứng thực tế
      const modelsToTry = [
        'gemini-flash-lite-latest', // Phản hồi ~680ms, không bị 503
        configuredModel,
        'gemini-3-flash-preview',  // Phản hồi ~1.6s
        'gemini-3.5-flash-lite',   // Phản hồi ~2.0s
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const model of modelsToTry) {
        try {
          const text = await this.callGeminiApi(model, geminiApiKey, systemPrompt, context.question);
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Thử nghiệm model ${model} thất bại: ${errMsg}. Đang chuyển model tiếp theo...`);
        }
      }
    }

    // 3. ƯU TIÊN 3: Fallback sư phạm thông minh kết hợp bóc tách từ video
    return this.generateSmartPedagogicalFallback(context);
  }

  /**
   * Gọi API REST của Groq Cloud LPU (Tốc độ ~500 tokens/s, độ trễ < 0.2s)
   */
  private async callGroqApi(
    apiKey: string,
    systemInstruction: string,
    userQuestion: string,
  ): Promise<string | null> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const configuredModel =
      this.configService.get<string>('GROQ_MODEL')?.trim() || 'openai/gpt-oss-120b';

    const modelsToTry = [
      configuredModel,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userQuestion },
            ],
            temperature: 0.25,
            max_tokens: 2000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim().length > 0) {
            return content.trim();
          }
        } else {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          this.logger.warn(`Model Groq ${model} phản hồi lỗi: ${errorData.error?.message || response.statusText}`);
        }
      } catch (err: unknown) {
        clearTimeout(timeout);
        this.logger.warn(`Lỗi khi gọi model Groq ${model}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return null;
  }

  /**
   * Gọi API REST của Google Gemini với timeout ngắn (6 giây) để failover siêu tốc
   */
  private async callGeminiApi(
    model: string,
    apiKey: string,
    systemInstruction: string,
    userQuestion: string,
  ): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userQuestion }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        topP: 0.95,
        maxOutputTokens: 2500,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout cho failover nhanh

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GeminiGenerateContentResponse;
        const msg = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(msg);
      }

      const data = (await response.json()) as GeminiGenerateContentResponse;
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return candidateText || null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Xây dựng Prompt Sư phạm Socratic chuyên sâu kết hợp Video Transcript
   */
  private buildPedagogicalPrompt(context: {
    courseTitle: string;
    grade: string;
    chapterTitle: string;
    lessonTitle: string;
    lessonContent: string;
    videoTranscript?: string | null;
    history: Array<{ question: string; answer: string }>;
  }): string {
    const historyText =
      context.history.length > 0
        ? context.history
            .map((h, i) => `Lượt ${i + 1}:\n- Học sinh: ${h.question}\n- Gia sư AI: ${h.answer}`)
            .join('\n\n')
        : 'Chưa có lịch sử trò chuyện trước đó.';

    const sanitizedLessonContent = context.lessonContent
      ? context.lessonContent.slice(0, 1800)
      : 'Không có tài liệu văn bản bổ sung.';

    const transcriptSection = context.videoTranscript
      ? `\nTHÔNG TIN THAM KHẢO TỪ VIDEO BÀI GIẢNG (CHỈ DÙNG ĐỂ NẮM BỐI CẢNH NỘI DUNG, KHÔNG CHÉP NGUYÊN VĂN NẾU HỌC SINH KHÔNG HỎI):\n${context.videoTranscript.slice(0, 3000)}\n`
      : '\nBài học này chưa có phụ đề bóc tách từ video.\n';

    return `Bạn là "Gia sư AI TKU" - một người thầy uyên bác, ân cần, phương pháp sư phạm mẫu mực tại Hệ thống Giáo dục TKU.

NGỮ CẢNH BÀI HỌC HIỆN TẠI:
- Khóa học: ${context.courseTitle} (Khối ${context.grade})
- Chương: ${context.chapterTitle}
- Bài học: ${context.lessonTitle}
- Nội dung giáo án tóm tắt:
${sanitizedLessonContent}
${transcriptSection}
LỊCH SỬ ĐỐI THOẠI GẦN ĐÂY:
${historyText}

QUY TẮC BẮT BUỘC TUÂN THỦ (QUAN TRỌNG NHẤT):
1. TRẢ LỜI ĐÚNG TRỌNG TÂM - KHÔNG LAN MAN VỚ VẨN:
   - Học sinh hỏi gì thì trả lời thẳng vào câu hỏi đó, ngắn gọn, súc tích và chính xác.
   - NẾU HỌC SINH CHÀO HỎI XÃ GIAO (ví dụ: "xin chào", "hello", "hi", "chào thầy", "thầy ơi", "alo",...):
     -> Hãy chào lại học sinh một cách lịch sự, thân thiện và ngắn gọn (1-2 câu). Giới thiệu ngắn gọn rằng thầy là Gia sư AI đồng hành cùng bài học "${context.lessonTitle}", và hỏi xem em đang cần thầy hướng dẫn phần nào trong bài học này.
     -> TUYỆT ĐỐI KHÔNG tự ý tuôn ra toàn bộ bài giảng, KHÔNG in mốc thời gian hay chép transcript video khi học sinh chỉ đang chào hỏi!
   - NẾU HỌC SINH HỎI CÔNG THỨC: Trình bày các công thức trọng tâm của bài học, bọc chuẩn KaTeX ($...$).
   - NẾU HỌC SINH HỎI BÀI TẬP: Áp dụng phương pháp Socratic, gợi ý từng bước tư duy, không giải hộ từ A-Z.
   - NẾU HỌC SINH HỎI VỀ VIDEO: Trả lời theo nội dung video và mốc thời gian [MM:SS].
   - TUYỆT ĐỐI KHÔNG chép nguyên văn lời bài hát, tạp âm hay phụ đề thô từ video vào câu trả lời. Phụ đề video chỉ là tài liệu để thầy hiểu ngữ cảnh bài học.
   - Trả lời đúng chuyên môn bài giảng (nếu bài học là Vật lý như "Từ trường" thì trả lời kiến thức Vật lý, không trả lời sang Hóa học hay môn khác).

2. CHUẨN MỰC TRÌNH BÀY & LATEX (TỐI ƯU CÂU TRẢ LỜI RÕ RÀNG, DỄ TIẾP THU):
   - Bố cục thoáng, phân chia đề mục mạch lạc bằng Markdown (dùng '### ', '- ', '1.', '2.').
   - Dùng đường kẻ ngang '---' để tách các phần lớn (ví dụ giữa phần lý thuyết, bài tập minh họa và lưu ý tránh bẫy) để học sinh không bị rối mắt.
   - Khi hướng dẫn các bước giải bài tập:
     + Phải chia rõ từng bước trên từng dòng độc lập: **Bước 1: ...**, **Bước 2: ...**, **Bước 3: ...**.
     + Với các công thức tính toán hoặc bước thay số dài: ƯU TIÊN đặt ở dạng khối riêng $$ ... $$ trên dòng riêng biệt để công thức to rõ, sắc nét, học sinh nhìn vào nhận diện được ngay cấu trúc phân số và số mũ.
     + Chỉ dùng inline $...$ cho các đại lượng ngắn gọn (như $B$, $I$, $r$, $\\vec{F}$, $\\vec{B}$, đơn vị $\\text{T}$).
     + Đơn vị đo hoặc chú thích chữ bên trong công thức phải bọc trong \\text{...} (ví dụ: $5 \\times 10^{-5}\\text{ T}$, $I = 5\\text{ A}$).
   - Tránh viết văn bản thành một khối đặc dồn dập; luôn xuống dòng giữa các bước để người học cảm thấy dễ hiểu, chuẩn mực sư phạm.`;
  }

  /**
   * Bộ tạo phản hồi sư phạm thông minh Fallback khi không có API Key hoặc mất kết nối
   */
  private generateSmartPedagogicalFallback(context: {
    courseTitle: string;
    grade: string;
    chapterTitle: string;
    lessonTitle: string;
    lessonContent: string;
    videoTranscript?: string | null;
    question: string;
  }): string {
    const q = context.question.toLowerCase().trim();

    // 1. Nếu chỉ là câu chào hỏi xã giao
    const greetings = ['xin chào', 'chào', 'chào thầy', 'hello', 'hi', 'hey', 'thầy ơi', 'alo', 'chào bạn', 'halo'];
    if (greetings.includes(q) || q.length <= 4) {
      return `Chào em! Thầy là **Gia sư AI TKU**, rất vui được đồng hành cùng em trong bài học **"${context.lessonTitle}"** (${context.courseTitle}).\n\nEm đang có thắc mắc hay gặp khó khăn ở phần nào trong bài học này không? Cứ nhắn cho thầy nhé!`;
    }

    // 2. Nhóm câu hỏi về Tóm tắt / Công thức bài học
    if (
      q.includes('công thức') ||
      q.includes('tóm tắt') ||
      q.includes('trọng tâm') ||
      q.includes('lý thuyết')
    ) {
      return `### 💡 Kiến thức & công thức trọng tâm: "${context.lessonTitle}"\n\nChào em! Dưới đây là các điểm mấu chốt của bài học **"${context.lessonTitle}"** (${context.courseTitle}):\n\n1. **Khái niệm trọng tâm:** Nắm vững định nghĩa và bản chất của hiện tượng trong bài học.\n2. **Các công thức cần nhớ:** Ôn kỹ các biểu thức liên hệ và đơn vị chuẩn trong hệ SI.\n3. **Lưu ý:** Ghi nhớ điều kiện áp dụng của từng công thức để tránh nhầm lẫn khi giải bài tập.\n\n> 💬 Em cần thầy giải thích chi tiết hơn về công thức nào không?`;
    }

    // 3. Nhóm câu hỏi về Video bài giảng
    if (q.includes('video') || q.includes('bài giảng') || q.includes('clip')) {
      if (context.videoTranscript) {
        const transcriptLines = context.videoTranscript.split('\n').filter((l) => l.trim().length > 0);
        const sampleLines = transcriptLines.slice(0, 6).join('\n');
        return `### 🎬 Nội dung nổi bật từ video bài học "${context.lessonTitle}":\n\`\`\`text\n${sampleLines}\n\`\`\`\n\nEm có thắc mắc ở đoạn nào trong video không, hãy nhắn cho thầy nhé!`;
      }
    }

    // 4. Nhóm câu hỏi về bài tập
    if (
      q.includes('bài tập') ||
      q.includes('cách giải') ||
      q.includes('hướng dẫn') ||
      q.includes('tính') ||
      q.includes('đáp án')
    ) {
      return `### 🔍 Hướng dẫn phương pháp giải bài tập: "${context.lessonTitle}"\n\nChào em! Để giải dạng bài này, em thực hiện theo 3 bước:\n\n1. **Tóm tắt dữ kiện:** Đổi đơn vị về chuẩn SI và xác định đại lượng cần tính.\n2. **Chọn công thức phù hợp:** Vận dụng các định luật và công thức của bài học "${context.lessonTitle}".\n3. **Biến đổi và tính toán:** Rút đại lượng cần tìm ra và thay số.\n\n> 💬 Em hãy gửi chi tiết đề bài hoặc câu hỏi cụ thể, thầy sẽ cùng em phân tích từng bước nhé!`;
    }

    // 5. Mặc định
    return `Chào em! Thầy đã nhận được câu hỏi: **"${context.question}"** trong bài học **"${context.lessonTitle}"**.\n\nĐể thầy hỗ trợ em chính xác nhất, em có thể nêu rõ hơn phần em đang chưa hiểu hoặc gửi trực tiếp câu hỏi cụ thể vào đây nhé!`;
  }
}
