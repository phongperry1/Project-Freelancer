import type { FeatureItem } from '../types/feature.types';

export const PLATFORM_FEATURES: FeatureItem[] = [
  {
    id: 'feature-video',
    title: 'Bài giảng chất lượng',
    description: 'Xem bài giảng video từ giảng viên hàng đầu, theo dõi dễ dàng tiến độ học tập.',
    iconName: 'video',
  },
  {
    id: 'feature-exam',
    title: 'Đề thi & Kiểm tra',
    description: 'Làm bài kiểm tra, xem điểm số trực tuyến và đáp án giải thích chi tiết tức thì.',
    iconName: 'file-text',
  },
  {
    id: 'feature-ai',
    title: 'Hỏi đáp với AI',
    description: 'Đặt câu hỏi trực tiếp và nhận câu trả lời chi tiết tức thời từ trợ lý AI Hóa học.',
    iconName: 'sparkles',
  },
  {
    id: 'feature-progress',
    title: 'Theo dõi tiến độ',
    description: 'Ghi chú nhanh, lưu vết thông minh và theo dõi mức độ tiến bộ qua từng ngày học.',
    iconName: 'bar-chart',
  },
];
