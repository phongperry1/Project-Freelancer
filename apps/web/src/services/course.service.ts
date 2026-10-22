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
};

