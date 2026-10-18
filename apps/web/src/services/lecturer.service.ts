import { authService } from './auth.service';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export interface LessonSummary {
  id: string;
  title: string;
  sortOrder: number;
  durationMinutes?: number | null;
  videoUrl?: string | null;
  content?: string | null;
}

export interface ChapterSummary {
  id: string;
  title: string;
  sortOrder: number;
  lessonCount: number;
  lessons: LessonSummary[];
}

export type LessonItem = LessonSummary;
export type ChapterItem = ChapterSummary;

export type AssessmentType = 'QUIZ' | 'TEST' | 'EXAM';
export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'TEXT';
export type AssignmentStatus = 'DRAFT' | 'ASSIGNED' | 'CLOSED';

export interface QuestionOption {
  id: string;
  content: string;
  isCorrect: boolean;
}

export interface QuestionItem {
  id: string;
  content: string;
  type: QuestionType;
  score: number;
  options: QuestionOption[];
  solutionText: string;
  solutionFileUrl?: string | null;
  sortOrder: number;
}

export interface AssignSettings {
  targetType: 'ALL' | 'CUSTOM';
  selectedStudentIds: string[];
  startDate: string;
  dueDate: string;
  durationMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScoreImmediately: boolean;
  showSolution: 'IMMEDIATELY' | 'AFTER_DEADLINE' | 'NEVER';
  maxAttempts: number;
}

export interface AssignmentItem {
  id: string;
  title: string;
  type: AssessmentType;
  courseId: string;
  courseTitle: string;
  lessonId?: string | null;
  lessonTitle?: string | null;
  chapterTitle?: string | null;
  durationMinutes: number | null;
  status: AssignmentStatus;
  statusText?: string;
  totalScore: number;
  questionCount: number;
  assignedStudentsCount: number;
  submittedCount: number;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  questions: QuestionItem[];
  assignSettings?: AssignSettings;
}

/**
 * Automatically distributes totalTarget points (default: 10.0) equally among questions,
 * adjusting minor rounding remainders so the sum is guaranteed to equal exactly 10.00.
 */
export function distributeScoresEqually(
  questions: QuestionItem[],
  totalTarget = 10,
): QuestionItem[] {
  const count = questions.length;
  if (count === 0) return [];

  // Calculate base score with 2 decimal places
  const baseScore = Math.floor((totalTarget / count) * 100) / 100;
  // Calculate remainder to distribute cent by cent
  let remainderCents = Math.round((totalTarget - baseScore * count) * 100);

  return questions.map((q) => {
    let score = baseScore;
    if (remainderCents > 0) {
      score = Math.round((score + 0.01) * 100) / 100;
      remainderCents -= 1;
    }
    return {
      ...q,
      score,
    };
  });
}

export interface CourseStudentItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  enrolledAt?: string;
}

export interface StudentSubmissionAnswer {
  questionId: string;
  questionNumber: number;
  questionContent: string;
  selectedOptionId?: string | null;
  selectedOptionContent?: string | null;
  correctOptionId?: string | null;
  correctOptionContent?: string | null;
  isCorrect: boolean;
  scoreAwarded: number;
  questionScore: number;
  solutionText?: string | null;
}

export interface StudentSubmissionDetail {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCode?: string;
  studentClass?: string;
  avatarUrl?: string | null;
  attemptNumber: number;
  score: number;
  totalScore: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentMinutes: number;
  submittedAt: string;
  isLate: boolean;
  status: 'SUBMITTED' | 'GRADED' | 'NOT_SUBMITTED';
  statusText: string;
  gradeTier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'AVERAGE' | 'WEAK';
  gradeTierText: string;
  feedback?: string;
  answers: StudentSubmissionAnswer[];
}

export interface QuestionAccuracyStat {
  questionId: string;
  questionNumber: number;
  content: string;
  score: number;
  type: QuestionType;
  correctCount: number;
  totalAttempts: number;
  correctRate: number; // 0 - 100
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  difficultyText: string;
}

export interface GradeDistributionItem {
  range: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface AssessmentResultsSummary {
  assessment: AssignmentItem;
  totalStudents: number;
  submittedCount: number;
  unsubmittedCount: number;
  submissionRate: number; // 0 - 100
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number; // 0 - 100
  passedCount: number;
  failedCount: number;
  gradeDistribution: GradeDistributionItem[];
  questionStats: QuestionAccuracyStat[];
  submissions: StudentSubmissionDetail[];
}

export interface LecturerCourseItem {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: 'ACTIVE' | 'HIDDEN';
  statusText: string;
  studentCount: number;
  studentsCount?: number;
  chapterCount: number;
  chaptersCount?: number;
  lessonCount: number;
  updatedAt: string;
  createdAt: string;
  chapters?: ChapterSummary[];
  symbol?: string;
  symbolType?: 'blue' | 'purple' | 'teal';
  progressPercent?: number;
}

export interface LecturerCoursesStats {
  totalCourses: number;
  activeCourses: number;
  hiddenCourses: number;
  totalStudents: number;
  totalLessons: number;
}

export interface LecturerCoursesResponse {
  stats: LecturerCoursesStats;
  courses: LecturerCourseItem[];
}

export interface LecturerDashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  newStudentsThisMonth: number;
  pendingGrading: number;
  essayCount: number;
  quizCount: number;
  averageProgress: number;
  progressChange: number;
}

export interface LecturerActivityItem {
  day: string;
  graded: number;
  submitted: number;
}

export interface LecturerSubmissionItem {
  id: string;
  studentName: string;
  studentClass?: string;
  studentInitials?: string;
  examTitle: string;
  submittedAt: string;
  status: 'pending' | 'recheck';
  statusText: string;
}

export interface LecturerTaskItem {
  id: string;
  title: string;
  context: string;
  dueText: string;
  dueType: 'urgent' | 'today' | 'normal';
  completed: boolean;
}

export interface LecturerDashboardData {
  stats: LecturerDashboardStats;
  courses: LecturerCourseItem[];
  activities: LecturerActivityItem[];
  submissions: LecturerSubmissionItem[];
  tasks: LecturerTaskItem[];
}

const emptyDashboardData: LecturerDashboardData = {
  stats: {
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalStudents: 0,
    newStudentsThisMonth: 0,
    pendingGrading: 0,
    essayCount: 0,
    quizCount: 0,
    averageProgress: 0,
    progressChange: 0,
  },
  courses: [],
  activities: [],
  submissions: [],
  tasks: [],
};

const emptyCoursesResponse: LecturerCoursesResponse = {
  stats: {
    totalCourses: 0,
    activeCourses: 0,
    hiddenCourses: 0,
    totalStudents: 0,
    totalLessons: 0,
  },
  courses: [],
};

class LecturerService {
  /**
   * Helper fetch with automatic retry on network errors (e.g., when NestJS backend is still booting up).
   */
  private async fetchWithBootRetry(
    input: string,
    init?: RequestInit,
    maxRetries = 6,
    delayMs = 1500,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(input, init);
        if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        return res;
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Connection timeout to backend server');
  }

  async getDashboardData(): Promise<LecturerDashboardData> {
    const token = authService.getStoredToken();
    if (!token) return emptyDashboardData;

    const res = await this.fetchWithBootRetry(
      `${API_BASE_URL}/lecturer/dashboard`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      return emptyDashboardData;
    }

    const json = await res.json();
    return json || emptyDashboardData;
  }

  async getAssignedCourses(): Promise<LecturerCoursesResponse> {
    const token = authService.getStoredToken();
    if (!token) return emptyCoursesResponse;

    const res = await this.fetchWithBootRetry(
      `${API_BASE_URL}/lecturer/courses`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      return emptyCoursesResponse;
    }

    const json = await res.json();
    return json || emptyCoursesResponse;
  }

  async getMyCourses(): Promise<LecturerCoursesResponse> {
    return this.getAssignedCourses();
  }

  async getCourseDetail(courseId: string): Promise<LecturerCourseItem> {
    const token = authService.getStoredToken();
    if (!token) {
      throw new Error('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    }

    const res = await this.fetchWithBootRetry(
      `${API_BASE_URL}/lecturer/courses/${courseId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải thông tin khóa học và giáo trình.');
    }

    return await res.json();
  }

  async addChapter(courseId: string, title: string): Promise<ChapterSummary> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/courses/${courseId}/chapters`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tạo chương mới.');
    }
    return await res.json();
  }

  async updateChapter(chapterId: string, title: string): Promise<ChapterSummary> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/chapters/${chapterId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật chương.');
    }
    return await res.json();
  }

  async deleteChapter(chapterId: string): Promise<{ success: boolean; message?: string }> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/chapters/${chapterId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể xóa chương học.');
    }
    return await res.json();
  }

  async addLesson(
    chapterId: string,
    data: {
      title: string;
      content?: string | null;
      videoUrl?: string | null;
    },
  ): Promise<LessonSummary> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/chapters/${chapterId}/lessons`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể thêm bài học.');
    }
    return await res.json();
  }

  async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
    },
  ): Promise<LessonSummary> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/lessons/${lessonId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật bài học.');
    }
    return await res.json();
  }

  async deleteLesson(lessonId: string): Promise<{ success: boolean; message?: string }> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể xóa bài học.');
    }
    return await res.json();
  }

  async uploadVideo(file: File): Promise<{ url: string }> {
    const token = authService.getStoredToken();
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`${API_BASE_URL}/lecturer/upload/video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải lên video bài giảng.');
    }
    return await res.json();
  }

  // ============================================================
  // ASSESSMENTS & EXAMS (POSTGRESQL DATABASE VIA NESTJS API)
  // ============================================================

  private mapApiToAssignment(item: {
    id: string;
    title?: string;
    type?: AssessmentType;
    courseId: string;
    courseTitle?: string;
    course?: { title?: string };
    lessonId?: string | null;
    lessonTitle?: string | null;
    lesson?: { title?: string; chapter?: { title?: string } };
    chapterTitle?: string | null;
    durationMinutes?: number | null;
    status?: AssignmentStatus;
    statusText?: string;
    totalScore?: number;
    questionCount?: number;
    assignedStudentsCount?: number;
    submittedCount?: number;
    startDate?: string | null;
    dueDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
    questions?: Array<{
      id?: string;
      content?: string;
      type?: QuestionType;
      score?: number;
      sortOrder?: number;
      solutionText?: string | null;
      solutionFileUrl?: string | null;
      options?: Array<{
        id?: string;
        content?: string;
        isCorrect?: boolean;
      }>;
    }>;
  }): AssignmentItem {
    const questions: QuestionItem[] = (item.questions || []).map((q, idx) => ({
      id: q.id || `q-${idx + 1}`,
      content: q.content || '',
      type: q.type || 'SINGLE_CHOICE',
      score: Number(q.score) || 1,
      sortOrder: q.sortOrder || idx + 1,
      solutionText: q.solutionText || '',
      solutionFileUrl: q.solutionFileUrl || null,
      options: (q.options || []).map((opt, optIdx) => ({
        id: opt.id || `opt-${optIdx + 1}`,
        content: opt.content || '',
        isCorrect: Boolean(opt.isCorrect),
      })),
    }));

    const rawTotal = questions.reduce(
      (sum, q) => sum + (Number(q.score) || 0),
      0,
    );
    const totalScore = Math.round(rawTotal * 100) / 100;

    return {
      id: item.id,
      title: item.title || '',
      type: item.type || 'QUIZ',
      courseId: item.courseId,
      courseTitle: item.courseTitle || item.course?.title || 'Khóa học',
      lessonId: item.lessonId || null,
      lessonTitle: item.lessonTitle || item.lesson?.title || null,
      chapterTitle: item.chapterTitle || item.lesson?.chapter?.title || null,
      durationMinutes: item.durationMinutes ?? 15,
      status: item.status || 'DRAFT',
      statusText:
        item.statusText ||
        (item.status === 'ASSIGNED'
          ? 'Đang mở'
          : item.status === 'CLOSED'
            ? 'Đã đóng'
            : 'Bản nháp'),
      totalScore: item.totalScore ?? totalScore,
      questionCount: item.questionCount ?? questions.length,
      assignedStudentsCount: item.assignedStudentsCount ?? 0,
      submittedCount: item.submittedCount ?? 0,
      startDate: item.startDate || null,
      dueDate: item.dueDate || null,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      questions,
    };
  }

  async getAssessments(courseId?: string): Promise<AssignmentItem[]> {
    const token = authService.getStoredToken();
    if (!token) return [];
    const url = `${API_BASE_URL}/lecturer/assessments${
      courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
    }`;
    try {
      const res = await this.fetchWithBootRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data.map((d) => this.mapApiToAssignment(d)) : [];
    } catch {
      return [];
    }
  }

  async getAssessmentById(id: string): Promise<AssignmentItem | null> {
    if (!id) return null;
    const token = authService.getStoredToken();
    try {
      const res = await this.fetchWithBootRetry(`${API_BASE_URL}/lecturer/assessments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data ? this.mapApiToAssignment(data) : null;
    } catch {
      return null;
    }
  }

  async getCourseStudents(courseId: string): Promise<CourseStudentItem[]> {
    if (!courseId) return [];
    const token = authService.getStoredToken();
    try {
      const res = await this.fetchWithBootRetry(`${API_BASE_URL}/lecturer/courses/${courseId}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async createAssessment(data: {
    title: string;
    type: AssessmentType;
    courseId: string;
    lessonId?: string | null;
    durationMinutes?: number | null;
  }): Promise<AssignmentItem> {
    const token = authService.getStoredToken();
    const payload = {
      title: data.title.trim(),
      type: data.type,
      courseId: data.courseId,
      lessonId: data.lessonId || null,
      durationMinutes: data.durationMinutes ?? 15,
      questions: [
        {
          content: 'Nội dung câu hỏi số 1...',
          type: 'SINGLE_CHOICE',
          score: 10,
          sortOrder: 1,
          solutionText: '',
          options: [
            { content: 'Lựa chọn A', isCorrect: true, sortOrder: 1 },
            { content: 'Lựa chọn B', isCorrect: false, sortOrder: 2 },
            { content: 'Lựa chọn C', isCorrect: false, sortOrder: 3 },
            { content: 'Lựa chọn D', isCorrect: false, sortOrder: 4 },
          ],
        },
      ],
    };

    const res = await fetch(`${API_BASE_URL}/lecturer/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tạo bài tập.');
    }

    const created = await res.json();
    return this.mapApiToAssignment(created);
  }

  async saveAssessment(assignment: AssignmentItem): Promise<AssignmentItem> {
    const token = authService.getStoredToken();
    const payload = {
      title: assignment.title.trim(),
      type: assignment.type,
      courseId: assignment.courseId,
      lessonId: assignment.lessonId || null,
      durationMinutes: assignment.durationMinutes,
      startDate: assignment.startDate,
      dueDate: assignment.dueDate,
      questions: assignment.questions.map((q, idx) => ({
        content: q.content,
        type: q.type,
        score: Number(q.score) || 1,
        sortOrder: idx + 1,
        solutionText: q.solutionText || null,
        solutionFileUrl: q.solutionFileUrl || null,
        options: q.options.map((opt, optIdx) => ({
          content: opt.content,
          isCorrect: Boolean(opt.isCorrect),
          sortOrder: optIdx + 1,
        })),
      })),
    };

    const res = await fetch(
      `${API_BASE_URL}/lecturer/assessments/${assignment.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể lưu bài tập.');
    }

    const updated = await res.json();
    return this.mapApiToAssignment(updated);
  }

  async updateAssessment(
    id: string,
    data: {
      title?: string;
      type?: AssessmentType;
      courseId?: string;
      lessonId?: string | null;
      durationMinutes?: number | null;
      startDate?: string | null;
      dueDate?: string | null;
    },
  ): Promise<AssignmentItem> {
    const token = authService.getStoredToken();
    const res = await fetch(`${API_BASE_URL}/lecturer/assessments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật bài tập.');
    }

    const updated = await res.json();
    return this.mapApiToAssignment(updated);
  }

  async deleteAssessment(id: string): Promise<boolean> {
    if (!id) return false;
    const token = authService.getStoredToken();
    try {
      const res = await fetch(`${API_BASE_URL}/lecturer/assessments/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ============================================================
  // ASSESSMENT RESULTS & ANALYTICS
  // ============================================================

  async getAssessmentResults(
    assessmentId: string,
  ): Promise<AssessmentResultsSummary | null> {
    if (!assessmentId) return null;
    const token = authService.getStoredToken();
    if (!token) return null;

    try {
      const res = await this.fetchWithBootRetry(
        `${API_BASE_URL}/lecturer/assessments/${assessmentId}/results`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data as AssessmentResultsSummary;
    } catch {
      return null;
    }
  }

  async saveSubmissionFeedback(
    submissionId: string,
    feedback: string,
  ): Promise<boolean> {
    try {
      localStorage.setItem(`tku_feedback_${submissionId}`, feedback.trim());
      return true;
    } catch {
      return false;
    }
  }
}

export const lecturerService = new LecturerService();
