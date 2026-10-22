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
  grade?: '10' | '11' | '12' | 'exam' | 'other';
  gradeText?: string;
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
  content?: string | null;
}

export interface CourseChapter {
  id: string;
  title: string;
  sortOrder: number;
  lessons: CourseLesson[];
}

export interface AdminActivationKeyItem {
  id: string;
  key: string;
  courseId: string;
  expiresAt: string;
  usedById: string | null;
  createdAt: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  usedBy?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AdminActivationKeysResponse {
  courseId: string;
  courseTitle: string;
  totalKeys: number;
  activeCount: number;
  usedCount: number;
  expiredCount: number;
  keys: AdminActivationKeyItem[];
}

export interface AdminAllActivationKeysResponse {
  stats: {
    totalKeys: number;
    activeCount: number;
    usedCount: number;
    expiredCount: number;
  };
  courses: Array<{ id: string; title: string }>;
  keys: Array<AdminActivationKeyItem & { courseTitle: string }>;
}


export interface AdminCourseDetail {
  id: string;
  title: string;
  grade?: '10' | '11' | '12' | 'exam' | 'other';
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

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  formattedDateOfBirth: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  roleText: string;
  status: 'ACTIVE' | 'SUSPENDED';
  statusText: string;
  enrolledCoursesCount: number;
  taughtCoursesCount: number;
  devicesCount: number;
  createdAt: string;
  formattedCreatedAt: string;
  timeAgo: string;
}

export interface AdminUsersResponse {
  stats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    studentCount: number;
    teacherCount: number;
    adminCount: number;
  };
  users: AdminUserItem[];
}

export interface AdminUserDeviceItem {
  id: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string | null;
  isTrusted: boolean;
  lastLoginAt: string;
  formattedLastLoginAt: string;
}

export interface AdminUserCourseItem {
  id: string;
  title: string;
  status: string;
  statusText: string;
  thumbnailUrl: string | null;
  studentCount?: number;
  progress?: number;
  createdAt: string;
  formattedCreatedAt: string;
}

export interface AdminUserDetailResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  formattedDateOfBirth: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  roleText: string;
  status: 'ACTIVE' | 'SUSPENDED';
  statusText: string;
  createdAt: string;
  formattedCreatedAt: string;
  timeAgo: string;
  devices: AdminUserDeviceItem[];
  taughtCourses: AdminUserCourseItem[];
  enrolledCourses: AdminUserCourseItem[];
  stats: {
    enrolledCoursesCount: number;
    taughtCoursesCount: number;
    devicesCount: number;
  };
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status?: 'ACTIVE' | 'SUSPENDED';
  avatarUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

export interface BulkCreateUsersPayload {
  users: Array<{
    fullName: string;
    email: string;
    password?: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    status?: 'ACTIVE' | 'SUSPENDED';
    avatarUrl?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
  }>;
}

export interface BulkCreateUsersResponse {
  total: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ email: string; reason: string }>;
  createdUsers: AdminUserItem[];
}


export interface CreateCoursePayload {
  title: string;
  teacherId: string;
  grade?: '10' | '11' | '12' | 'exam' | 'other';
  description: string;
  thumbnailUrl: string;
  status?: 'ACTIVE' | 'HIDDEN';
  initialChapters?: string[];
}

export interface UpdateCoursePayload {
  title?: string;
  teacherId?: string;
  grade?: '10' | '11' | '12' | 'exam' | 'other';
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

  getUsersList(): Promise<AdminUsersResponse> {
    return requestWithAuth<AdminUsersResponse>(
      '/admin/users',
      'GET',
      undefined,
      'Không thể tải danh sách người dùng.',
    );
  },

  getUserById(id: string): Promise<AdminUserDetailResponse> {
    return requestWithAuth<AdminUserDetailResponse>(
      `/admin/users/${id}`,
      'GET',
      undefined,
      'Không thể tải chi tiết người dùng.',
    );
  },

  updateUserStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ): Promise<AdminUserItem> {
    return requestWithAuth<AdminUserItem>(
      `/admin/users/${id}/status`,
      'PUT',
      { status },
      'Không thể cập nhật trạng thái người dùng.',
    );
  },

  createUser(payload: CreateUserPayload): Promise<AdminUserItem> {
    return requestWithAuth<AdminUserItem>(
      '/admin/users',
      'POST',
      payload,
      'Không thể tạo tài khoản người dùng.',
    );
  },

  bulkCreateUsers(payload: BulkCreateUsersPayload): Promise<BulkCreateUsersResponse> {
    return requestWithAuth<BulkCreateUsersResponse>(
      '/admin/users/bulk',
      'POST',
      payload,
      'Không thể nhập danh sách người dùng.',
    );
  },

  getCourseActivationKeys(courseId: string): Promise<AdminActivationKeysResponse> {
    return requestWithAuth<AdminActivationKeysResponse>(
      `/admin/courses/${courseId}/activation-keys`,
      'GET',
      undefined,
      'Không thể tải danh sách mã key của khóa học.',
    );
  },

  createCourseActivationKeys(
    courseId: string,
    payload: { expiresInHours: number; quantity?: number },
  ): Promise<{
    message: string;
    totalCreated: number;
    expiresAt: string;
    keys: AdminActivationKeyItem[];
  }> {
    return requestWithAuth(
      `/admin/courses/${courseId}/activation-keys`,
      'POST',
      payload,
      'Không thể tạo mã key cho khóa học.',
    );
  },

  deleteActivationKey(keyId: string): Promise<{ message: string; id: string }> {
    return requestWithAuth(
      `/admin/activation-keys/${keyId}`,
      'DELETE',
      undefined,
      'Không thể xóa mã key.',
    );
  },

  getAllActivationKeys(params?: {
    courseId?: string;
    status?: string;
    search?: string;
  }): Promise<AdminAllActivationKeysResponse> {
    const query = new URLSearchParams();
    if (params?.courseId && params.courseId !== 'ALL') query.set('courseId', params.courseId);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search?.trim()) query.set('search', params.search.trim());
    const qs = query.toString() ? `?${query.toString()}` : '';

    return requestWithAuth<AdminAllActivationKeysResponse>(
      `/admin/activation-keys${qs}`,
      'GET',
      undefined,
      'Không thể tải danh sách mã key hệ thống.',
    );
  },
};





