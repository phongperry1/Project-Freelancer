import type { AiFeatureHighlight, ChatMessage } from '../types/chat.types';

export const AI_FEATURE_HIGHLIGHTS: AiFeatureHighlight[] = [
  {
    id: 'ai-247',
    title: 'Giải đáp 24/7',
    description: 'Phục vụ bất cứ khi nào học sinh cần học, dù là đêm muộn.',
  },
  {
    id: 'ai-step-by-step',
    title: 'Hướng dẫn chi tiết từng bước',
    description: 'Không chỉ đưa ra đáp án, AI giải thích chi tiết lý thuyết liên quan.',
  },
  {
    id: 'ai-smart-suggest',
    title: 'Gợi ý thông minh',
    description: 'Đề xuất các dạng bài tập tương tự để củng cố lỗ hổng kiến thức.',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    content: 'Cho em hỏi hiện tượng xảy ra khi cho dung dịch NaOH vào dung dịch AlCl3 dư là gì ạ?',
  },
  {
    id: 'msg-2',
    sender: 'assistant',
    content:
      'Chào em! Khi nhỏ từ từ NaOH vào dung dịch AlCl3 dư:\n\nHiện tượng: Ban đầu xuất hiện kết tủa keo trắng Al(OH)3. Do AlCl3 dư nên kết tủa không bị hòa tan.\n\nPhương trình:\nAlCl3 + 3NaOH → Al(OH)3↓ + 3NaCl',
  },
];
