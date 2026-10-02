import { authService } from './auth.service';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export interface DashboardCourse {
  id: string;
  code: string;
  title: string;
  subTitle: string;
  teacherName: string;
  studentCount: number;
  status: 'ACTIVE' | 'PENDING' | 'DRAFT';
  statusText: string;
}

export interface DashboardActivity {
  id: string;
  type: 'USER' | 'COURSE' | 'CONTENT' | 'KEY';
  title: string;
  description: string;
  timeAgo: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeCourses: number;
  totalLessons: number;
  activeUsers: number;
  activeUserPercentage: number;
  userGrowth: number | null;
  courseGrowth: number | null;
  lessonGrowth: number | null;
  userRoleDistribution: {
    students: number;
    teachers: number;
    admins: number;
    others: number;
  };
  userActivityByMonth: Array<{
    month: string;
    studentCount: number;
    totalCount: number;
  }>;
  recentCourses: DashboardCourse[];
  recentActivities: DashboardActivity[];
}

export interface AdminCourseItem {
  id: string;
  slug?: string;
  title: string;
  thumbnailUrl?: string | null;
  teacherName: string;
  teacherId: string;
  studentCount: number;
  lessonCount: number;
  status: 'ACTIVE' | 'HIDDEN';
  statusText: string;
  updatedAt: string;
  createdAt: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  sortOrder: number;
  status: string;
  videoUrl: string | null;
}

export interface CourseChapter {
  id: string;
  title: string;
  sortOrder: number;
  lessons: CourseLesson[];
}

export interface AdminCourseDetail {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  status: 'ACTIVE' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
  teacher: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  chapters: CourseChapter[];
  _count: {
    enrollments: number;
  };
}

export interface AdminCoursesResponse {
  stats: {
    totalCourses: number;
    activeCourses: number;
    hiddenCourses: number;
    activePercentage: number;
    publishedCourses?: number;
    archivedCourses?: number;
    draftCourses?: number;
    publishedPercentage?: number;
  };
  courses: AdminCourseItem[];
  teachers: Array<{ id: string; fullName: string }>;
}

export interface CreateCoursePayload {
  title: string;
  teacherId: string;
  description: string;
  thumbnailUrl: string;
  status?: 'ACTIVE' | 'HIDDEN';
  initialChapters?: string[];
}

export interface UpdateCoursePayload {
  title?: string;
  teacherId?: string;
  description?: string;
  thumbnailUrl?: string;
  status?: 'ACTIVE' | 'HIDDEN';
}

async function requestWithAuth<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  errorMessage: string = 'Đã có lỗi xảy ra.',
): Promise<T> {
  const token = authService.getStoredToken();
  if (!token) {
    throw new Error('Chưa đăng nhập hoặc thiếu token xác thực.');
  }

  const makeReq = async (tk: string) => {
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${tk}`,
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: isFormData
        ? (body as FormData)
        : body
          ? JSON.stringify(body)
          : undefined,
    });
  };

  let response = await makeReq(token);

  if (response.status === 401) {
    const refreshed = await authService.refreshTokens();
    if (refreshed?.accessToken) {
      response = await makeReq(refreshed.accessToken);
    } else {
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
  }

  if (response.status === 403) {
    throw new Error('Bạn không có quyền truy cập trang quản trị hệ thống.');
  }

  if (!response.ok) {
    let errMsg = errorMessage;
    const errData = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    if (errData?.message) {
      errMsg = Array.isArray(errData.message)
        ? errData.message.join(', ')
        : errData.message;
    }
    throw new Error(errMsg);
  }

  return (await response.json()) as T;
}

export const adminService = {
  getDashboardStats(): Promise<DashboardStats> {
    return requestWithAuth<DashboardStats>(
      '/admin/dashboard',
      'GET',
      undefined,
      'Không thể tải dữ liệu bảng điều khiển.',
    );
  },

  getCoursesList(): Promise<AdminCoursesResponse> {
    return requestWithAuth<AdminCoursesResponse>(
      '/admin/courses',
      'GET',
      undefined,
      'Không thể tải danh sách khóa học.',
    );
  },

  createCourse(payload: CreateCoursePayload): Promise<AdminCourseItem> {
    return requestWithAuth<AdminCourseItem>(
      '/admin/courses',
      'POST',
      payload,
      'Không thể tạo khóa học mới.',
    );
  },

  uploadCourseThumbnail(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return requestWithAuth<{ url: string }>(
      '/admin/courses/upload-thumbnail',
      'POST',
      formData,
      'Không thể tải ảnh bìa lên hệ thống.',
    );
  },

  getCourseById(id: string): Promise<AdminCourseDetail> {
    return requestWithAuth<AdminCourseDetail>(
      `/admin/courses/${id}`,
      'GET',
      undefined,
      'Không thể tải chi tiết khóa học.',
    );
  },

  updateCourse(
    id: string,
    payload: UpdateCoursePayload,
  ): Promise<AdminCourseItem> {
    return requestWithAuth<AdminCourseItem>(
      `/admin/courses/${id}`,
      'PUT',
      payload,
      'Không thể cập nhật khóa học.',
    );
  },

  deleteCourse(id: string): Promise<{ success: boolean; message: string }> {
    return requestWithAuth<{ success: boolean; message: string }>(
      `/admin/courses/${id}`,
      'DELETE',
      undefined,
      'Không thể xóa khóa học.',
    );
  },

  addChapter(
    courseId: string,
    payload: { title: string; sortOrder?: number },
  ): Promise<Record<string, unknown>> {
    return requestWithAuth<Record<string, unknown>>(
      `/admin/courses/${courseId}/chapters`,
      'POST',
      payload,
      'Không thể tạo chương học mới.',
    );
  },
};


