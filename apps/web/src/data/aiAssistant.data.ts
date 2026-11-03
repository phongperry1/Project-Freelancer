import type { AiFeatureHighlight, ChatMessage } from '../types/chat.types';

export const AI_FEATURE_HIGHLIGHTS: AiFeatureHighlight[] = [
  {
    id: 'ai-context-lesson',
    title: 'Hỏi đáp bám sát bài giảng',
    description: 'Thắc mắc ở mốc thời gian nào trong video, mở panel AI hỏi và nhận lời giải chi tiết cho đúng nội dung đó.',
  },
  {
    id: 'ai-math-chem-latex',
    title: 'Công thức Toán & Hóa học chuẩn xác',
    description: 'Tự động hiển thị công thức phân tử, chuỗi phản ứng và phương trình hóa học rõ ràng, chuẩn xác.',
  },
  {
    id: 'ai-history-review',
    title: 'Lưu lịch sử đoạn chat theo từng bài học',
    description: 'Tự động lưu giữ các phiên hỏi đáp của từng bài giảng để học sinh ôn tập lại kiến thức bất cứ lúc nào.',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    content: 'Thầy ơi, ở phút 04:20 video bài giảng, hiện tượng khi cho từ từ NaOH vào AlCl3 dư là gì ạ?',
  },
  {
    id: 'msg-2',
    sender: 'assistant',
    content:
      'Chào em! Tại mốc 04:20 của bài giảng:\n\n• Hiện tượng: Xuất hiện kết tủa keo trắng Al(OH)3. Vì dung dịch AlCl3 còn dư nên kết tủa không tan.\n\n• Phương trình ion rút gọn:\nAl³⁺ + 3OH⁻ → Al(OH)3↓',
  },
];
