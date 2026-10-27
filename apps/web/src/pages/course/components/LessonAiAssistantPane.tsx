import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  AlertCircle,
  Bot,
  Calculator,
  Check,
  Compass,
  Copy,
  FlaskConical,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/useAuth';
import { toast } from '../../../context/useToast';
import {
  courseService,
  type LessonAiMessage,
  type LessonAiSessionItem,
} from '../../../services/course.service';

interface LessonAiAssistantPaneProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle?: string;
  courseGrade?: string;
}

// Danh sách gợi ý câu hỏi nhanh (Prompt Suggestions) theo đúng bài học
const PROMPT_SUGGESTIONS = [
  {
    icon: Lightbulb,
    label: 'Tóm tắt kiến thức trọng tâm',
    query: 'Thầy tóm tắt giúp em các công thức và kiến thức trọng tâm của bài học này với ạ.',
  },
  {
    icon: Compass,
    label: 'Gợi ý hướng giải bài tập',
    query: 'Thầy hướng dẫn cho em các bước tư duy và phương pháp giải dạng bài tập bài này với ạ.',
  },
  {
    icon: FlaskConical,
    label: 'Giải thích hiện tượng & bản chất',
    query: 'Thầy giải thích giúp em các hiện tượng và bản chất lý thuyết trong bài giảng này ạ.',
  },
  {
    icon: Zap,
    label: 'Phương pháp giải nhanh & lưu ý',
    query: 'Bài học này có những mẹo ghi nhớ hay các lỗi sai học sinh thường gặp không ạ?',
  },
];

// Danh sách phím tắt ký hiệu hóa học nhanh
const QUICK_FORMULA_SYMBOLS = [
  { label: '→', insert: ' \\rightarrow ' },
  { label: '↑ (Khí)', insert: '\\uparrow ' },
  { label: '↓ (Tủa)', insert: '\\downarrow ' },
  { label: '⇌ (Thuận nghịch)', insert: ' \\rightleftharpoons ' },
  { label: 't° (Nhiệt)', insert: ' \\xrightarrow{t^o} ' },
  { label: '$H_2SO_4$', insert: '$H_2SO_4$' },
  { label: '$C_M$', insert: '$C_M$' },
  { label: '$n = m/M$', insert: '$n = \\frac{m}{M}$' },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInline(str: string): string {
  // In đậm: **text**
  let s = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // In nghiêng: *text*
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*([^*]|$)/g, '$1<em>$2</em>$3');
  return s;
}

/**
 * Hàm phân tích và render an toàn Markdown kết hợp KaTeX cho biểu thức Toán/Lý/Hóa.
 * Sử dụng kiến trúc Token Placeholder để triệt tiêu 100% hiện tượng split rò rỉ mã SVG path KaTeX ra ngoài.
 */
function renderMarkdownWithKatex(rawText: string): string {
  if (!rawText) return '';

  const blockMathStore: string[] = [];
  const inlineMathStore: string[] = [];
  const codeBlockStore: string[] = [];
  const inlineCodeStore: string[] = [];

  let text = rawText;

  // 1. Tách Code Block ```lang ... ```
  text = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const idx = codeBlockStore.length;
    codeBlockStore.push(
      `<pre class="tku-ai-code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
    );
    return `@@CODE_BLOCK_${idx}@@`;
  });

  // 2. Tách Inline Code `code`
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    const idx = inlineCodeStore.length;
    inlineCodeStore.push(`<code class="tku-ai-inline-code">${escapeHtml(code)}</code>`);
    return `@@CODE_INLINE_${idx}@@`;
  });

  // 3. Chuẩn hóa LaTeX delimiters: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // 4. Tách Block Math $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math: string) => {
    const idx = blockMathStore.length;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
      blockMathStore.push(`<div class="tku-ai-katex-block">${rendered}</div>`);
    } catch {
      blockMathStore.push(`<pre class="tku-ai-katex-fallback">$$${escapeHtml(math.trim())}$$</pre>`);
    }
    return `@@KATEX_BLOCK_${idx}@@`;
  });

  // 5. Tách Inline Math $ ... $
  text = text.replace(/\$([^$\n]+?)\$/g, (_, math: string) => {
    const idx = inlineMathStore.length;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
      inlineMathStore.push(`<span class="tku-ai-katex-inline">${rendered}</span>`);
    } catch {
      inlineMathStore.push(`<code>$${escapeHtml(math.trim())}$</code>`);
    }
    return `@@KATEX_INLINE_${idx}@@`;
  });

  // 6. Phân tích các khối Markdown từng dòng
  const lines = text.split('\n');
  const htmlLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlLines.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlLines.push('</ol>');
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Dòng trống
    if (!trimmed) {
      closeLists();
      continue;
    }

    // Khối Block KaTeX hoặc Code Block
    if (trimmed.startsWith('@@KATEX_BLOCK_') || trimmed.startsWith('@@CODE_BLOCK_')) {
      closeLists();
      htmlLines.push(trimmed);
      continue;
    }

    // Đường kẻ ngang: --- hoặc ***
    if (/^([-]{3,}|\*{3,})$/.test(trimmed)) {
      closeLists();
      htmlLines.push('<hr class="tku-ai-md-hr" />');
      continue;
    }

    // Markdown Headings: ##, ###, ####
    if (line.startsWith('#### ')) {
      closeLists();
      htmlLines.push(`<h5 class="tku-ai-md-h5">${formatInline(line.slice(5))}</h5>`);
      continue;
    }
    if (line.startsWith('### ')) {
      closeLists();
      htmlLines.push(`<h4 class="tku-ai-md-h4">${formatInline(line.slice(4))}</h4>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeLists();
      htmlLines.push(`<h3 class="tku-ai-md-h3">${formatInline(line.slice(3))}</h3>`);
      continue;
    }

    // Markdown Blockquote: >
    if (line.startsWith('> ')) {
      closeLists();
      htmlLines.push(`<blockquote class="tku-ai-md-quote">${formatInline(line.slice(2))}</blockquote>`);
      continue;
    }

    // Bullet list: - hoặc *
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (bulletMatch) {
      if (inOl) {
        htmlLines.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        htmlLines.push('<ul class="tku-ai-md-list">');
        inUl = true;
      }
      htmlLines.push(`<li>${formatInline(bulletMatch[3])}</li>`);
      continue;
    }

    // Numbered list: 1. hoặc 2.
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inUl) {
        htmlLines.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        htmlLines.push('<ol class="tku-ai-md-ol">');
        inOl = true;
      }
      htmlLines.push(`<li>${formatInline(numberedMatch[3])}</li>`);
      continue;
    }

    // Dòng thông thường
    closeLists();
    htmlLines.push(`<p class="tku-ai-md-p">${formatInline(line)}</p>`);
  }

  closeLists();

  let finalHtml = htmlLines.join('');

  // 7. Khôi phục tất cả Token Placeholders
  blockMathStore.forEach((html, i) => {
    finalHtml = finalHtml.split(`@@KATEX_BLOCK_${i}@@`).join(html);
  });
  inlineMathStore.forEach((html, i) => {
    finalHtml = finalHtml.split(`@@KATEX_INLINE_${i}@@`).join(html);
  });
  codeBlockStore.forEach((html, i) => {
    finalHtml = finalHtml.split(`@@CODE_BLOCK_${i}@@`).join(html);
  });
  inlineCodeStore.forEach((html, i) => {
    finalHtml = finalHtml.split(`@@CODE_INLINE_${i}@@`).join(html);
  });

  return finalHtml;
}

export const LessonAiAssistantPane: React.FC<LessonAiAssistantPaneProps> = React.memo(({
  courseId,
  lessonId,
  lessonTitle,
  courseTitle,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LessonAiMessage[]>([]);
  const [sessions, setSessions] = useState<LessonAiSessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSymbols, setShowSymbols] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  // Tải danh sách các phiên trò chuyện (Sessions) của bài học
  const fetchSessions = useCallback(async () => {
    try {
      const res = await courseService.getLessonAiSessions(courseId, lessonId);
      setSessions(res.sessions || []);
    } catch {
      // Bỏ qua lỗi ngầm khi tải danh sách sessions
    }
  }, [courseId, lessonId]);

  // Tải tin nhắn của một phiên trò chuyện cụ thể
  const fetchHistory = useCallback(
    async (targetSessionId?: string) => {
      setIsLoadingHistory(true);
      setErrorMessage(null);
      try {
        const res = await courseService.getLessonAiHistory(courseId, lessonId, targetSessionId);
        setMessages(res.history || []);
        setCurrentSessionId(res.activeSessionId || null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử trò chuyện.';
        setErrorMessage(msg);
      } finally {
        setIsLoadingHistory(false);
        setTimeout(() => scrollToBottom(false), 150);
      }
    },
    [courseId, lessonId, scrollToBottom],
  );

  // Khởi động nạp dữ liệu ban đầu song song qua Promise.all
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [sessionsRes, historyRes] = await Promise.all([
          courseService.getLessonAiSessions(courseId, lessonId).catch(() => ({ sessions: [] })),
          courseService.getLessonAiHistory(courseId, lessonId),
        ]);
        if (!isMounted) return;
        setSessions(sessionsRes.sessions || []);
        setMessages(historyRes.history || []);
        setCurrentSessionId(historyRes.activeSessionId || null);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử trò chuyện.';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
          setTimeout(() => scrollToBottom(false), 150);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [courseId, lessonId, scrollToBottom]);

  // Bắt đầu một phiên trò chuyện mới (Màn hình sạch sẽ, không xóa lịch sử cũ)
  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSessionsDrawer(false);
    setErrorMessage(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Chọn một phiên cũ từ danh sách lịch sử
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === currentSessionId) {
      setShowSessionsDrawer(false);
      return;
    }
    fetchHistory(sessionId);
    setShowSessionsDrawer(false);
  };

  // Xóa một phiên trò chuyện riêng lẻ
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await courseService.deleteLessonAiSession(courseId, lessonId, sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      toast.success('Đã xóa đoạn chat thành công!');

      // Nếu xóa chính phiên đang mở trên màn hình, chuyển về phiên mới sạch sẽ
      if (currentSessionId === sessionId) {
        handleStartNewChat();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa đoạn chat.';
      toast.error(msg);
    }
  };

  // Tự động điều chỉnh chiều cao của khung nhập
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  // Chèn nhanh ký hiệu hóa học vào vị trí con trỏ
  const handleInsertSymbol = (symbol: string) => {
    if (!textareaRef.current) {
      setInputValue((prev) => prev + symbol);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = inputValue;
    const nextText = text.substring(0, start) + symbol + text.substring(end);
    setInputValue(nextText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + symbol.length;
        textareaRef.current.selectionEnd = start + symbol.length;
      }
    }, 0);
  };

  const tempCounterRef = useRef<number>(0);

  // Gửi câu hỏi đến Gia sư AI
  const handleSendQuestion = useCallback(
    async (overrideQuestion?: string) => {
      const questionToSend = (overrideQuestion || inputValue).trim();
      if (!questionToSend || isAsking) return;

      // Reset ô nhập
      if (!overrideQuestion) {
        setInputValue('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }

      // Optimistic UI: Tạo tin nhắn tạm phía học sinh
      tempCounterRef.current += 1;
      const tempId = `temp_${tempCounterRef.current}`;
      const optimisticMessage: LessonAiMessage = {
        id: tempId,
        sessionId: currentSessionId || undefined,
        question: questionToSend,
        answer: '', // Chờ AI trả lời
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setIsAsking(true);
      setErrorMessage(null);
      setTimeout(() => scrollToBottom(true), 50);

      try {
        const response = await courseService.askLessonAi(
          courseId,
          lessonId,
          questionToSend,
          currentSessionId || undefined,
        );

        // Cập nhật câu trả lời từ AI
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? response : msg)),
        );

        // Nếu trước đó đang ở phiên mới, ghi nhận sessionId mới tạo
        if (!currentSessionId && response.sessionId) {
          setCurrentSessionId(response.sessionId);
        }

        // Tải lại danh sách sessions để cập nhật tiêu đề và số lượng tin nhắn trên menu
        fetchSessions();
        setTimeout(() => scrollToBottom(true), 100);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gia sư AI hiện chưa thể phản hồi.';
        toast.error(msg);
        // Xóa tin nhắn tạm nếu thất bại
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setErrorMessage(msg);
      } finally {
        setIsAsking(false);
      }
    },
    [inputValue, isAsking, courseId, lessonId, currentSessionId, fetchSessions, scrollToBottom],
  );

  // Xử lý phím Enter gửi câu hỏi (Shift+Enter để xuống dòng)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  // Sao chép câu trả lời vào clipboard
  const handleCopyAnswer = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Đã sao chép nội dung hướng dẫn!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Format thời gian hiển thị tin nhắn
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format thời gian hiển thị trong danh sách phiên
  const formatSessionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Tên viết tắt của học sinh
  const studentFullName = user?.fullName;
  const studentInitials = (() => {
    if (!studentFullName) return 'HS';
    const parts = studentFullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  })();

  return (
    <div className="tku-ai-pane">
      {/* 1. THANH HEADER PHỤ GIA SƯ AI */}
      <div className="tku-ai-sub-header">
        <div className="tku-ai-sub-header__info">
          <div className="tku-ai-sub-header__avatar">
            <Bot size={20} className="tku-ai-sub-header__bot-icon" />
          </div>
          <div className="tku-ai-sub-header__text">
            <div className="tku-ai-sub-header__title-row">
              <span className="tku-ai-sub-header__title">Gia sư AI TKU</span>
              {/* Đã xóa badge model theo yêu cầu */}
            </div>
            <p className="tku-ai-sub-header__desc">
              Đang đồng hành cùng bài học: <strong>{lessonTitle}</strong>
              {courseTitle ? ` (${courseTitle})` : ''}
            </p>
          </div>
        </div>

        <div className="tku-ai-sub-header__actions">
          {/* Nút Tạo đoạn chat mới (như ChatGPT, Gemini) */}
          <button
            type="button"
            className="tku-ai-btn-new-chat"
            onClick={handleStartNewChat}
            title="Tạo đoạn chat mới (lịch sử các đoạn chat cũ vẫn được lưu giữ)"
          >
            <Plus size={15} />
            <span>Đoạn chat mới</span>
          </button>

          {/* Nút Xem lịch sử các đoạn chat cũ */}
          <button
            type="button"
            className={`tku-ai-btn-history ${showSessionsDrawer ? 'is-active' : ''}`}
            onClick={() => setShowSessionsDrawer((prev) => !prev)}
            title="Xem lại lịch sử các đoạn chat trước đó của bài học này"
          >
            <History size={15} />
            <span>Lịch sử ({sessions.length})</span>
          </button>
        </div>
      </div>

      {/* 1.1 PANEL DANH SÁCH LỊCH SỬ CÁC ĐOẠN CHAT (SESSIONS POPOVER / DRAWER) */}
      {showSessionsDrawer && (
        <div className="tku-ai-sessions-drawer">
          <div className="tku-ai-sessions-drawer__header">
            <div className="tku-ai-sessions-drawer__title-wrap">
              <History size={16} className="tku-ai-sessions-drawer__icon" />
              <h4 className="tku-ai-sessions-drawer__title">Lịch sử các đoạn chat</h4>
              <span className="tku-ai-sessions-drawer__count">{sessions.length} đoạn chat</span>
            </div>
            <button
              type="button"
              className="tku-ai-sessions-drawer__close"
              onClick={() => setShowSessionsDrawer(false)}
              title="Đóng danh sách lịch sử"
            >
              <X size={16} />
            </button>
          </div>

          <div className="tku-ai-sessions-drawer__list">
            {sessions.length === 0 ? (
              <div className="tku-ai-sessions-drawer__empty">
                <MessageSquare size={28} className="tku-ai-sessions-drawer__empty-icon" />
                <p>Chưa có đoạn chat nào trong bài học này.</p>
                <span>Mọi câu hỏi em gửi sẽ được tự động lưu lại thành các đoạn chat riêng biệt như ChatGPT.</span>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = currentSessionId === sess.sessionId;
                return (
                  <div
                    key={sess.sessionId}
                    className={`tku-ai-session-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleSelectSession(sess.sessionId)}
                  >
                    <div className="tku-ai-session-item__icon-wrap">
                      <MessageSquare size={15} />
                    </div>
                    <div className="tku-ai-session-item__content">
                      <div className="tku-ai-session-item__title-row">
                        <p className="tku-ai-session-item__title" title={sess.title}>
                          {sess.title}
                        </p>
                        {isActive && <span className="tku-ai-session-item__badge-active">Đang mở</span>}
                      </div>
                      <div className="tku-ai-session-item__meta">
                        <span>{formatSessionTime(sess.createdAt)}</span>
                        <span className="tku-ai-session-item__dot">•</span>
                        <span>{sess.messageCount} câu trao đổi</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tku-ai-session-item__del-btn"
                      onClick={(e) => handleDeleteSession(sess.sessionId, e)}
                      title="Xóa đoạn chat này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="tku-ai-sessions-drawer__footer">
            <button
              type="button"
              className="tku-ai-sessions-drawer__btn-new"
              onClick={handleStartNewChat}
            >
              <Plus size={14} />
              <span>Bắt đầu đoạn chat mới</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. KHUNG HIỂN THỊ NỘI DUNG TIN NHẮN */}
      <div className="tku-ai-messages-container" aria-live="polite">
        {isLoadingHistory ? (
          <div className="tku-ai-loading-state">
            <Loader2 size={32} className="tku-ai-spin" />
            <p>Đang chuẩn bị phiên học tập cùng Gia sư AI...</p>
          </div>
        ) : messages.length === 0 ? (
          /* TRẠNG THÁI RỖNG CHÀO ĐÓN */
          <div className="tku-ai-welcome-box">
            <div className="tku-ai-welcome-hero">
              <div className="tku-ai-welcome-badge">
                <Sparkles size={28} />
              </div>
              <h3 className="tku-ai-welcome-title">Xin chào, {user?.fullName || 'Học viên TKU'}! 👋</h3>
              <p className="tku-ai-welcome-desc">
                Thầy là <strong>Gia sư AI TKU</strong>, người đồng hành cùng em trong bài học{' '}
                <strong>"{lessonTitle}"</strong>. Với phương pháp sư phạm <em>Socratic</em>, thầy sẽ
                giúp em phân tích bản chất hiện tượng, công thức hóa học và từng bước tư duy để em tự
                tin tìm ra lời giải chính xác nhất.
              </p>
            </div>

            {/* Nút gợi ý nhanh khởi đầu */}
            <div className="tku-ai-welcome-suggestions">
              <span className="tku-ai-suggestions-title">💡 Em có thể bắt đầu với các gợi ý:</span>
              <div className="tku-ai-pills-grid">
                {PROMPT_SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="tku-ai-quick-pill"
                      onClick={() => handleSendQuestion(item.query)}
                      disabled={isAsking}
                    >
                      <Icon size={16} className="tku-ai-quick-pill__icon" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* DANH SÁCH BONG BÓNG TIN NHẮN */
          <div className="tku-ai-messages-list">
            {messages.map((item) => (
              <React.Fragment key={item.id}>
                {/* 1. Tin nhắn của Học sinh */}
                <div className="tku-ai-msg tku-ai-msg--user">
                  <div className="tku-ai-msg__avatar tku-ai-msg__avatar--user">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || 'Học sinh'}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{studentInitials}</span>
                    )}
                  </div>
                  <div className="tku-ai-msg__content-wrap">
                    <div className="tku-ai-msg__meta">
                      <span className="tku-ai-msg__sender">{user?.fullName || 'Em'}</span>
                      <span className="tku-ai-msg__time">{formatTime(item.createdAt)}</span>
                    </div>
                    <div className="tku-ai-bubble tku-ai-bubble--user">
                      <p>{item.question}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Tin nhắn của Gia sư AI */}
                {item.answer ? (
                  <div className="tku-ai-msg tku-ai-msg--bot">
                    <div className="tku-ai-msg__avatar tku-ai-msg__avatar--bot">
                      <Bot size={20} />
                    </div>
                    <div className="tku-ai-msg__content-wrap">
                      <div className="tku-ai-msg__meta">
                        <span className="tku-ai-msg__sender">Gia sư AI TKU</span>
                        {/* Đã xóa badge Socratic Tutor theo yêu cầu */}
                        <span className="tku-ai-msg__time">{formatTime(item.createdAt)}</span>
                      </div>
                      <div className="tku-ai-bubble tku-ai-bubble--bot">
                        <div
                          className="tku-ai-rendered-content"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdownWithKatex(item.answer),
                          }}
                        />
                        <div className="tku-ai-bubble__actions">
                          <button
                            type="button"
                            className="tku-ai-btn-copy"
                            onClick={() => handleCopyAnswer(item.answer, item.id)}
                            title="Sao chép câu trả lời"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check size={14} className="tku-ai-copy-success" />
                                <span>Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </React.Fragment>
            ))}

            {/* HIỆU ỨNG GIA SƯ AI ĐANG SUY NGHĨ (THINKING INDICATOR) */}
            {isAsking && (
              <div className="tku-ai-msg tku-ai-msg--bot">
                <div className="tku-ai-msg__avatar tku-ai-msg__avatar--bot tku-ai-avatar--pulsing">
                  <Bot size={20} />
                </div>
                <div className="tku-ai-msg__content-wrap">
                  <div className="tku-ai-msg__meta">
                    <span className="tku-ai-msg__sender">Gia sư AI TKU</span>
                    <span className="tku-ai-thinking-badge">
                      <Sparkles size={12} className="tku-ai-spin" />
                      <span>Thinking Mode</span>
                    </span>
                  </div>
                  <div className="tku-ai-bubble tku-ai-bubble--bot tku-ai-bubble--thinking">
                    <div className="tku-ai-typing-indicator">
                      <span className="tku-ai-typing-dot" />
                      <span className="tku-ai-typing-dot" />
                      <span className="tku-ai-typing-dot" />
                    </div>
                    <span className="tku-ai-thinking-text">
                      Thầy đang suy nghĩ, phân tích bản chất hóa học và cấu trúc phương pháp giải cho em...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. THANH GỢI Ý & CÔNG CỤ NHẬP LIỆU */}
      <div className="tku-ai-toolbar">
        {messages.length > 0 && (
          <div className="tku-ai-toolbar__prompts">
            <div className="tku-ai-prompts-scroll">
              {PROMPT_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="tku-ai-prompt-chip"
                    onClick={() => handleSendQuestion(item.query)}
                    disabled={isAsking}
                    title={item.query}
                  >
                    <Icon size={12} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={`tku-ai-btn-formula-toggle ${showSymbols ? 'is-active' : ''}`}
              onClick={() => setShowSymbols((prev) => !prev)}
              title="Chèn nhanh công thức Toán / Hóa"
            >
              <Calculator size={13} />
              <span>Ký hiệu</span>
            </button>
          </div>
        )}

        {/* Thanh phím tắt chèn nhanh ký hiệu (Chỉ hiện khi học sinh bấm mở) */}
        {showSymbols && (
          <div className="tku-ai-toolbar__symbols">
            <div className="tku-ai-symbols-scroll">
              {QUICK_FORMULA_SYMBOLS.map((sym, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="tku-ai-symbol-btn"
                  onClick={() => handleInsertSymbol(sym.insert)}
                  title={`Chèn ${sym.label}`}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. THANH NHẬP LIỆU THÔNG MINH */}
      <div className="tku-ai-input-bar">
        {errorMessage && (
          <div className="tku-ai-error-tip">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="tku-ai-input-wrapper">
          <textarea
            ref={textareaRef}
            className="tku-ai-textarea"
            placeholder="Hỏi Gia sư AI về bài học này... (Nhấn Enter để gửi)"
            rows={1}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            maxLength={3000}
          />
          <button
            type="button"
            className={`tku-ai-send-btn ${inputValue.trim() && !isAsking ? 'is-active' : ''}`}
            onClick={() => handleSendQuestion()}
            disabled={!inputValue.trim() || isAsking}
            title="Gửi câu hỏi (Enter)"
          >
            {isAsking ? (
              <Loader2 size={16} className="tku-ai-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>

        <div className="tku-ai-input-footer">
          <span className="tku-ai-input-tip">
            Nhấn <strong>Enter</strong> để gửi câu hỏi • Hỗ trợ công thức LaTeX chuẩn xác
          </span>
          <span className="tku-ai-char-count">{inputValue.length}/3000</span>
        </div>
      </div>
    </div>
  );
});

LessonAiAssistantPane.displayName = 'LessonAiAssistantPane';
