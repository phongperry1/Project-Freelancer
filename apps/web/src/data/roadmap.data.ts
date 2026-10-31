/**
 * Roadmap Data Types for TKU E-Learning Platform
 * Lưu ý: Toàn bộ lộ trình và khóa học được truy vấn trực tiếp từ cơ sở dữ liệu PostgreSQL (qua Course, Chapter, Lesson, Enrollment)
 */

export interface RoadmapMilestone {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  duration: string;
  description: string;
  keyTopics: string[];
  outcome: string;
  targetScoreHint?: string;
  gradeMatch: '10' | '11' | '12' | 'exam' | 'other';
  courseKeywordMatches: string[];
}

export interface RoadmapItem {
  id: string;
  key: 'exam' | '12' | '11' | '10' | 'other';
  title: string;
  shortName: string;
  badgeLabel: string;
  badgeClass: string;
  iconName: 'Sparkles' | 'GraduationCap' | 'FlaskConical' | 'BookOpen' | 'Award';
  targetAudience: string;
  estimatedDuration: string;
  targetScore: string;
  summary: string;
  highlights: string[];
  milestones: RoadmapMilestone[];
}
