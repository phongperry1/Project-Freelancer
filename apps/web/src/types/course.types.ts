export type GradeLevel = 'all' | '10' | '11' | '12' | 'exam';

export interface Course {
  id: string;
  title: string;
  grade: GradeLevel;
  teacher: string;
  teacherAvatar?: string;
  rating: number;
  lessonCount: number;
  price: number;
  originalPrice?: number;
  thumbnailUrl: string;
  badge?: string;
  slug?: string;
}

export interface CourseFilterTab {
  key: GradeLevel;
  label: string;
}
