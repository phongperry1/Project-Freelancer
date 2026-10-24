import { authService } from './auth.service';

export interface PublicCourseTeacher {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface PublicCourseItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  teacher: PublicCourseTeacher;
  studentCount: number;
  chapterCount: number;
  lessonCount: number;
  grade: '10' | '11' | '12' | 'exam' | 'other';
  isEnrolled?: boolean;
}

export interface PublicCoursesResponse {
  courses: PublicCourseItem[];
  total: number;
}

export interface PublicCourseDetailLesson {
  id: string;
  title: string;
  sortOrder: number;
}

export interface PublicCourseDetailChapter {
  id: string;
  title: string;
  sortOrder: number;
  lessons: PublicCourseDetailLesson[];
}

export interface PublicCourseDetailResponse extends PublicCourseItem {
  chapters: PublicCourseDetailChapter[];
}

export interface LearningLessonItem {
  id: string;
  title: string;
  sortOrder: number;
  chapterId: string;
  hasVideo: boolean;
  videoUrl?: string | null;
  content?: string | null;
  isCompleted: boolean;
  progressPercent: number;
  lastPosition: number;
}

export interface LearningChapterItem {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LearningLessonItem[];
}

export interface CourseLearningRoomResponse {
  course: {
    id: string;
    title: string;
    grade: string;
    description: string | null;
    thumbnailUrl: string | null;
    teacher: PublicCourseTeacher;
  };
  enrollment: {
    enrolledAt: string;
    progressPercent: number;
    completedAt: string | null;
  };
  chapters: LearningChapterItem[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  currentLessonId: string | null;
}

export interface StudentAssessmentItem {
  id: string;
  courseId: string;
  lessonId: string | null;
  lessonTitle: string | null;
  title: string;
  type: 'QUIZ' | 'TEST' | 'EXAM';
  durationMinutes: number | null;
  startDate: string | null;
  dueDate: string | null;
  totalQuestions: number;
  submissionsCount: number;
  bestScore: number | null;
  latestSubmission: {
    id: string;
    attemptNumber: number;
    score: number | null;
    submittedAt: string | null;
  } | null;
}

export interface TakeAssessmentQuestionOption {
  id: string;
  content: string;
  sortOrder: number;
}

export interface TakeAssessmentQuestion {
  id: string;
  content: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';
  score: number;
  sortOrder: number;
  options: TakeAssessmentQuestionOption[];
}

export interface TakeAssessmentResponse {
  assessment: {
    id: string;
    courseId: string;
    courseTitle: string;
    courseGrade: string;
    lessonId: string | null;
    lessonTitle: string | null;
    title: string;
    type: 'QUIZ' | 'TEST' | 'EXAM';
    durationMinutes: number | null;
    startDate: string | null;
    dueDate: string | null;
    totalQuestions: number;
    attemptNumber: number;
  };
  questions: TakeAssessmentQuestion[];
}

export interface SubmitAssessmentPayload {
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    answerText?: string;
  }>;
}

export interface SubmitAssessmentResponse {
  submissionId: string;
  attemptNumber: number;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  submittedAt: string;
}

export interface AssessmentResultQuestionOption {
  id: string;
  content: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface AssessmentResultQuestion {
  id: string;
  content: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'TEXT';
  score: number;
  sortOrder: number;
  solutionText: string | null;
  solutionFileUrl: string | null;
  selectedOptionId: string | null;
  answerText: string | null;
  isCorrect: boolean;
  options: AssessmentResultQuestionOption[];
}

export interface AssessmentResultResponse {
  submission: {
    id: string;
    attemptNumber: number;
    score: number | null;
    submittedAt: string | null;
    createdAt: string;
  };
  assessment: {
    id: string;
    courseId: string;
    courseTitle: string;
    lessonId: string | null;
    lessonTitle: string | null;
    title: string;
    type: 'QUIZ' | 'TEST' | 'EXAM';
    durationMinutes: number | null;
    totalQuestions: number;
  };
  stats: {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
  };
  questions: AssessmentResultQuestion[];
}

export interface AssessmentHistoryItem {
  id: string;
  attemptNumber: number;
  score: number | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface AssessmentHistoryResponse {
  assessment: {
    id: string;
    title: string;
    type: 'QUIZ' | 'TEST' | 'EXAM';
    durationMinutes: number | null;
    totalQuestions: number;
  } | null;
  history: AssessmentHistoryItem[];
}

const RAW_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    authService.getStoredToken() ||
    localStorage.getItem('tku_access_token') ||
    localStorage.getItem('tku_token') ||
    localStorage.getItem('auth_token')
  );
};

export const courseService = {
  /**
   * Lấy danh sách khóa học công khai từ database
   */
  async getPublicCourses(params?: {
    grade?: string;
    search?: string;
  }): Promise<PublicCoursesResponse> {
    const token = getAuthToken();
    const searchParams = new URLSearchParams();
    if (params?.grade && params.grade !== 'all') {
      searchParams.set('grade', params.grade);
    }
    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/courses${queryString ? `?${queryString}` : ''}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        errorJson?.message || `Không thể tải danh sách khóa học (Mã lỗi: ${response.status})`,
      );
    }

    return (await response.json()) as PublicCoursesResponse;
  },

  /**
   * Lấy thông tin chi tiết một khóa học công khai theo ID
   */
  async getPublicCourseById(id: string): Promise<PublicCourseDetailResponse> {
    const url = `${API_BASE_URL}/courses/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        errorJson?.message || `Không thể tải thông tin khóa học (Mã lỗi: ${response.status})`,
      );
    }

    return (await response.json()) as PublicCourseDetailResponse;
  },

  /**
   * Kiểm tra xem học sinh đăng nhập hiện tại đã ghi danh khóa học chưa
   */
  async checkMyEnrollment(
    courseId: string,
  ): Promise<{ isEnrolled: boolean; enrolledAt?: string | null }> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/my-enrollment`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { isEnrolled: false, enrolledAt: null };
    }

    return (await response.json()) as {
      isEnrolled: boolean;
      enrolledAt?: string | null;
    };
  },

  /**
   * Kích hoạt mã Key tham gia khóa học dành cho học sinh
   */
  async enrollWithKey(
    courseId: string,
    key: string,
  ): Promise<{
    success: boolean;
    message: string;
    courseId: string;
    enrolledAt: string;
  }> {
    const token = getAuthToken();

    if (!token) {
      throw new Error('Vui lòng đăng nhập tài khoản học sinh để kích hoạt mã Key.');
    }

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/enroll-with-key`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: key.trim().toUpperCase() }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message || 'Không thể kích hoạt mã key. Vui lòng kiểm tra lại.',
      );
    }

    return data;
  },

  /**
   * Lấy dữ liệu phòng học bài giảng cho học sinh đã ghi danh
   */
  async getCourseLearningRoom(courseId: string): Promise<CourseLearningRoomResponse> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Vui lòng đăng nhập để vào phòng học.');
    }

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/learn`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể tải dữ liệu phòng học.');
    }

    return (await response.json()) as CourseLearningRoomResponse;
  },

  /**
   * Cập nhật tiến độ học tập của bài học (đánh dấu hoàn thành / lưu vị trí video)
   */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    data: { isCompleted?: boolean; lastPosition?: number; progressPercent?: number },
  ): Promise<{
    lessonProgress: {
      studentId: string;
      lessonId: string;
      isCompleted: boolean;
      lastPosition: number;
      progressPercent: number;
    };
    courseProgressPercent: number;
  }> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Vui lòng đăng nhập để lưu tiến độ học tập.');
    }

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể cập nhật tiến độ bài học.');
    }

    return await response.json();
  },

  /**
   * Lấy danh sách bài tập và đề thi của khóa học cho học sinh
   */
  async getStudentAssessments(courseId: string, lessonId?: string): Promise<StudentAssessmentItem[]> {
    const token = getAuthToken();
    if (!token) throw new Error('Vui lòng đăng nhập để xem danh sách bài kiểm tra.');

    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments${query}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể tải danh sách bài tập.');
    }

    return await response.json();
  },

  /**
   * Lấy đề thi để học sinh làm bài thi trực tuyến
   */
  async getAssessmentForTake(courseId: string, assessmentId: string): Promise<TakeAssessmentResponse> {
    const token = getAuthToken();
    if (!token) throw new Error('Vui lòng đăng nhập để làm bài thi.');

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}/take`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể tải dữ liệu đề thi.');
    }

    return await response.json();
  },

  /**
   * Học sinh nộp bài thi trực tuyến
   */
  async submitAssessment(
    courseId: string,
    assessmentId: string,
    payload: SubmitAssessmentPayload,
  ): Promise<SubmitAssessmentResponse> {
    const token = getAuthToken();
    if (!token) throw new Error('Vui lòng đăng nhập để nộp bài.');

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}/submit`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể nộp bài thi.');
    }

    return await response.json();
  },

  /**
   * Xem kết quả bài thi chi tiết, lời giải và file giải viết tay
   */
  async getAssessmentResult(
    courseId: string,
    assessmentId: string,
    submissionId: string,
  ): Promise<AssessmentResultResponse> {
    const token = getAuthToken();
    if (!token) throw new Error('Vui lòng đăng nhập để xem kết quả.');

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}/results/${encodeURIComponent(submissionId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể tải kết quả bài thi.');
    }

    return await response.json();
  },

  /**
   * Xem lịch sử các lần thi của học sinh
   */
  async getAssessmentHistory(courseId: string, assessmentId: string): Promise<AssessmentHistoryResponse> {
    const token = getAuthToken();
    if (!token) throw new Error('Vui lòng đăng nhập để xem lịch sử thi.');

    const url = `${API_BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}/history`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message || 'Không thể tải lịch sử thi.');
    }

    return await response.json();
  },
};

