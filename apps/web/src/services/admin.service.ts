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
  title: string;
  teacherName: string;
  teacherId: string;
  grade: string;
  studentCount: number;
  lessonCount: number;
  status: 'PUBLISHED' | 'ARCHIVED' | 'DRAFT';
  statusText: string;
  updatedAt: string;
  createdAt: string;
}

export interface AdminCoursesResponse {
  stats: {
    totalCourses: number;
    publishedCourses: number;
    archivedCourses: number;
    draftCourses: number;
    publishedPercentage: number;
  };
  courses: AdminCourseItem[];
  teachers: Array<{ id: string; fullName: string }>;
}

async function fetchWithAuth<T>(
  endpoint: string,
  errorMessage: string,
): Promise<T> {
  const token = authService.getStoredToken();
  if (!token) {
    throw new Error('Chưa đăng nhập hoặc thiếu token xác thực.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshed = await authService.refreshTokens();
    if (refreshed?.accessToken) {
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
      });
      if (retryResponse.ok) {
        return (await retryResponse.json()) as T;
      }
    }
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }

  if (response.status === 403) {
    throw new Error('Bạn không có quyền truy cập trang quản trị hệ thống.');
  }

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export const adminService = {
  getDashboardStats(): Promise<DashboardStats> {
    return fetchWithAuth<DashboardStats>(
      '/admin/dashboard',
      'Không thể tải dữ liệu bảng điều khiển.',
    );
  },

  getCoursesList(): Promise<AdminCoursesResponse> {
    return fetchWithAuth<AdminCoursesResponse>(
      '/admin/courses',
      'Không thể tải danh sách khóa học.',
    );
  },
};
