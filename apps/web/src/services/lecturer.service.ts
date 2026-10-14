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
  async getDashboardData(): Promise<LecturerDashboardData> {
    try {
      const token = authService.getStoredToken();
      if (!token) return emptyDashboardData;

      const res = await fetch(`${API_BASE_URL}/lecturer/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return emptyDashboardData;
      }

      const json = await res.json();
      return json || emptyDashboardData;
    } catch {
      return emptyDashboardData;
    }
  }

  async getAssignedCourses(): Promise<LecturerCoursesResponse> {
    try {
      const token = authService.getStoredToken();
      if (!token) return emptyCoursesResponse;

      const res = await fetch(`${API_BASE_URL}/lecturer/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return emptyCoursesResponse;
      }

      const json = await res.json();
      return json || emptyCoursesResponse;
    } catch {
      return emptyCoursesResponse;
    }
  }

  async getCourseDetail(courseId: string): Promise<LecturerCourseItem> {
    const token = authService.getStoredToken();
    if (!token) {
      throw new Error('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    }

    const res = await fetch(`${API_BASE_URL}/lecturer/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

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
}

export const lecturerService = new LecturerService();
