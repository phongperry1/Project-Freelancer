export type GradeLevel = 'all' | '10' | '11' | '12' | 'exam' | 'other';

export interface Course {
  id: string;
  title: string;
  grade: GradeLevel;
  teacher: string;
  teacherAvatar?: string | null;
  rating?: number;
  lessonCount: number;
  chapterCount?: number;
  studentCount?: number;
  price?: number;
  originalPrice?: number;
  thumbnailUrl?: string | null;
  badge?: string;
  description?: string | null;
}

export interface CourseFilterTab {
  key: GradeLevel;
  label: string;
}
