/**
 * QA Data Types for TKU E-Learning Platform
 * Lưu ý: Toàn bộ dữ liệu câu hỏi và thảo luận được truy vấn trực tiếp từ cơ sở dữ liệu (PostgreSQL qua Prisma Comment model)
 */

export interface QAAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  gradeLevel?: string;
}

export interface QAReply {
  id: string;
  author: QAAuthor;
  content: string;
  createdAt: string;
  likesCount?: number;
  isTeacherAnswer?: boolean;
}

export interface QAQuestionItem {
  id: string;
  title?: string;
  content: string;
  author: QAAuthor;
  grade: '10' | '11' | '12' | 'exam' | 'other';
  category?: string;
  tags?: string[];
  createdAt: string;
  viewsCount?: number;
  isAnsweredByTeacher?: boolean;
  repliesCount: number;
  replies: QAReply[];
}
