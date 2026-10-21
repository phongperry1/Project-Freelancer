export interface PublicCourseTeacher {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface PublicCourseItem {
  id: string;
  title: string;
  slug?: string | null;
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

export const courseService = {
  /**
   * Lấy danh sách khóa học công khai từ database
   */
  async getPublicCourses(params?: {
    grade?: string;
    search?: string;
  }): Promise<PublicCoursesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.grade && params.grade !== 'all') {
      searchParams.set('grade', params.grade);
    }
    if (params?.search?.trim()) {
      searchParams.set('search', params.search.trim());
    }

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/courses${queryString ? `?${queryString}` : ''}`;

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
};
