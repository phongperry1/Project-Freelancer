import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateChapterDto,
  CreateActivationKeysDto,
} from './dto/course.dto.js';
import { CreateUserDto, BulkCreateUsersDto } from './dto/user.dto.js';

export interface AdminActivationKeyItem {
  id: string;
  key: string;
  courseId: string;
  expiresAt: Date;
  usedById: string | null;
  createdAt: Date;
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

export interface DashboardStatsResponse {
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
  recentCourses: Array<{
    id: string;
    code: string;
    title: string;
    subTitle: string;
    teacherName: string;
    studentCount: number;
    status: 'ACTIVE' | 'PENDING' | 'DRAFT';
    statusText: string;
  }>;
  recentActivities: Array<{
    id: string;
    type: 'USER' | 'COURSE' | 'CONTENT';
    title: string;
    description: string;
    timeAgo: string;
  }>;
}

export interface AdminCourseItem {
  id: string;
  title: string;
  grade: '10' | '11' | '12' | 'exam' | 'other';
  gradeText: string;
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



@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private formatTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return `${Math.floor(diffDay / 30)} tháng trước`;
  }

  private parseDateString(raw?: string): Date | null {
    if (!raw || !raw.trim()) return null;
    const trimmed = raw.trim();
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) return date;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDateOnly(date?: Date | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  private getRoleText(role: 'STUDENT' | 'TEACHER' | 'ADMIN'): string {
    if (role === 'TEACHER') return 'Giảng viên';
    if (role === 'ADMIN') return 'Quản trị viên';
    return 'Học sinh';
  }

  private getStatusText(status: 'ACTIVE' | 'SUSPENDED'): string {
    return status === 'SUSPENDED' ? 'Tạm khóa' : 'Đang hoạt động';
  }

  private formatDate(date?: Date | string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateTime(date?: Date | string | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hour}:${min} ${day}/${month}/${year}`;
  }

  private mapToAdminUserItem(user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
    _count?: {
      enrollments?: number;
      taughtCourses?: number;
      devices?: number;
    };
  }): AdminUserItem {
    const d = new Date(user.createdAt);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber ?? null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      formattedDateOfBirth: this.formatDateOnly(user.dateOfBirth),
      role: user.role,
      roleText: this.getRoleText(user.role),
      status: user.status,
      statusText: this.getStatusText(user.status),
      enrolledCoursesCount: user._count?.enrollments ?? 0,
      taughtCoursesCount: user._count?.taughtCourses ?? 0,
      devicesCount: user._count?.devices ?? 0,
      createdAt: user.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(d),
      timeAgo: this.formatTimeAgo(d),
    };
  }

  private getCodeFromTitle(title: string): string {
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const now = new Date();

    let totalUsers = 0;
    let activeUsers = 0;
    let activeCourses = 0;
    let totalLessons = 0;
    let studentCount = 0;
    let teacherCount = 0;
    let adminCount = 0;

    let recentDbCourses: Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      createdAt: Date;
      teacher: { fullName: string } | null;
      _count: { enrollments: number; chapters: number };
    }> = [];

    let recentUsers: Array<{
      id: string;
      fullName: string;
      role: string;
      createdAt: Date;
    }> = [];

    let recentCreatedCourses: Array<{
      id: string;
      title: string;
      createdAt: Date;
    }> = [];

    try {
      const [
        totalUsersRes,
        activeUsersRes,
        activeCoursesRes,
        totalLessonsRes,
        studentCountRes,
        teacherCountRes,
        adminCountRes,
        dbCourses,
        dbUsers,
        dbCreatedCourses,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.course.count({ where: { status: 'ACTIVE' } }),
        this.prisma.lesson.count(),
        this.prisma.user.count({ where: { role: 'STUDENT' } }),
        this.prisma.user.count({ where: { role: 'TEACHER' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.course.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            teacher: { select: { fullName: true } },
            _count: { select: { enrollments: true, chapters: true } },
          },
        }),
        this.prisma.user.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            role: true,
            createdAt: true,
          },
        }),
        this.prisma.course.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        }),
      ]);

      totalUsers = totalUsersRes;
      activeUsers = activeUsersRes;
      activeCourses = activeCoursesRes;
      totalLessons = totalLessonsRes;
      studentCount = studentCountRes;
      teacherCount = teacherCountRes;
      adminCount = adminCountRes;
      recentDbCourses = dbCourses;
      recentUsers = dbUsers;
      recentCreatedCourses = dbCreatedCourses;
    } catch {}

    const userGrowth = null;
    const courseGrowth = null;
    const lessonGrowth = null;

    const activeUserPercentage =
      totalUsers > 0
        ? Math.round((activeUsers / totalUsers) * 1000) / 10
        : 0;

    const monthNames = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ];

    const currentYear = now.getFullYear();
    const monthConfigs = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, 8 + i, 1);
      return {
        monthLabel: monthNames[d.getMonth()],
        startOfMonth: new Date(d.getFullYear(), d.getMonth(), 1),
        endOfMonth: new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    });

    const userActivityByMonth = await Promise.all(
      monthConfigs.map(async ({ monthLabel, startOfMonth, endOfMonth }) => {
        let mTotal = 0;
        let mStudents = 0;

        if (totalUsers > 0 && startOfMonth <= now) {
          try {
            const [total, students] = await Promise.all([
              this.prisma.user.count({
                where: {
                  createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                  },
                },
              }),
              this.prisma.user.count({
                where: {
                  role: 'STUDENT',
                  createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                  },
                },
              }),
            ]);
            mTotal = total;
            mStudents = students;
          } catch {}
        }

        return {
          month: monthLabel,
          studentCount: mStudents,
          totalCount: mTotal,
        };
      }),
    );

    const recentCourses = recentDbCourses.map((c) => {
      let status: 'ACTIVE' | 'PENDING' | 'DRAFT' = 'ACTIVE';
      let statusText = 'Đang hoạt động';
      if (c.status === 'ACTIVE') {
        status = 'ACTIVE';
        statusText = 'Đang hoạt động';
      } else {
        status = 'PENDING';
        statusText = 'Đã ẩn';
      }

      return {
        id: c.id,
        code: this.getCodeFromTitle(c.title),
        title: c.title,
        subTitle: `${c._count.chapters} chương học`,
        teacherName: c.teacher?.fullName || 'Chưa phân công',
        studentCount: c._count.enrollments,
        status,
        statusText,
      };
    });

    const recentActivities: Array<{
      id: string;
      type: 'USER' | 'COURSE' | 'CONTENT';
      title: string;
      description: string;
      timeAgo: string;
      timestamp: number;
    }> = [];

    for (const u of recentUsers) {
      recentActivities.push({
        id: `user-${u.id}`,
        type: 'USER',
        title:
          u.role === 'TEACHER'
            ? 'Thêm tài khoản giảng viên'
            : u.role === 'ADMIN'
              ? 'Tài khoản quản trị viên mới'
              : 'Học sinh mới đăng ký',
        description: `${u.fullName} vừa tham gia hệ thống`,
        timeAgo: this.formatTimeAgo(u.createdAt),
        timestamp: u.createdAt.getTime(),
      });
    }

    for (const c of recentCreatedCourses) {
      recentActivities.push({
        id: `course-${c.id}`,
        type: 'COURSE',
        title: 'Tạo khóa học mới',
        description: `Khóa học "${c.title}" đã được khởi tạo`,
        timeAgo: this.formatTimeAgo(c.createdAt),
        timestamp: c.createdAt.getTime(),
      });
    }

    recentActivities.sort((a, b) => b.timestamp - a.timestamp);

    const sanitizedActivities = recentActivities.slice(0, 20).map(({ id, type, title, description, timeAgo }) => ({
      id,
      type,
      title,
      description,
      timeAgo,
    }));

    return {
      totalUsers,
      activeCourses,
      totalLessons,
      activeUsers,
      activeUserPercentage,
      userGrowth,
      courseGrowth,
      lessonGrowth,
      userRoleDistribution: {
        students: studentCount,
        teachers: teacherCount,
        admins: adminCount,
        others: Math.max(0, totalUsers - (studentCount + teacherCount + adminCount)),
      },
      userActivityByMonth,
      recentCourses,
      recentActivities: sanitizedActivities,
    };
  }

  async getAdminCourses(): Promise<AdminCoursesResponse> {
    const [
      totalCourses,
      activeCourses,
      hiddenCourses,
      dbCourses,
      teachers,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'HIDDEN' } }),
      this.prisma.course.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { id: true, fullName: true } },
          _count: { select: { enrollments: true } },
          chapters: {
            select: {
              _count: { select: { lessons: true } },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: { id: true, fullName: true },
        orderBy: [{ fullName: 'asc' }],
      }),
    ]);

    const activePercentage =
      totalCourses > 0
        ? Math.round((activeCourses / totalCourses) * 100)
        : 0;

    const courses: AdminCourseItem[] = dbCourses.map((c) =>
      this.mapToAdminCourseItem(c),
    );

    return {
      stats: {
        totalCourses,
        activeCourses,
        hiddenCourses,
        activePercentage,
        publishedCourses: activeCourses,
        archivedCourses: hiddenCourses,
        draftCourses: 0,
        publishedPercentage: activePercentage,
      },
      courses,
      teachers: teachers.map((t) => ({
        id: t.id,
        fullName: t.fullName,
      })),
    };
  }

  private getGradeText(grade?: string): string {
    switch (grade) {
      case '10':
        return 'Hóa học Lớp 10';
      case '11':
        return 'Hóa học Lớp 11';
      case '12':
        return 'Hóa học Lớp 12';
      case 'exam':
        return 'Luyện thi THPT & ĐGNL';
      default:
        return 'Chuyên đề khác';
    }
  }

  private mapToAdminCourseItem(course: {
    id: string;
    title: string;
    grade?: string | null;
    thumbnailUrl?: string | null;
    teacherName?: string;
    teacherId: string;
    teacher?: { id: string; fullName: string } | null;
    chapters: Array<{ _count: { lessons: number } }>;
    _count: { enrollments: number };
    status: string;
    updatedAt?: Date | null;
    createdAt: Date;
  }): AdminCourseItem {
    const statusText = course.status === 'HIDDEN' ? 'Đã ẩn' : 'Đang hoạt động';

    const lessonCount = course.chapters.reduce(
      (sum, ch) => sum + ch._count.lessons,
      0,
    );

    const d = course.updatedAt || course.createdAt;
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const gradeVal = (course.grade as '10' | '11' | '12' | 'exam' | 'other') || '10';

    return {
      id: course.id,
      title: course.title,
      grade: gradeVal,
      gradeText: this.getGradeText(gradeVal),
      thumbnailUrl: course.thumbnailUrl || undefined,
      teacherName:
        course.teacher?.fullName || course.teacherName || 'Chưa phân công',
      teacherId: course.teacherId,
      studentCount: course._count.enrollments,
      lessonCount,
      status: (course.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE') as 'ACTIVE' | 'HIDDEN',
      statusText,
      updatedAt: `Cập nhật ${dateFormatted}`,
      createdAt: course.createdAt.toISOString(),
    };
  }

  async createCourse(dto: CreateCourseDto): Promise<AdminCourseItem> {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Tiêu đề khóa học không được để trống.');
    }
    if (!dto.teacherId || !dto.teacherId.trim()) {
      throw new BadRequestException('Vui lòng chọn giảng viên phụ trách, không được để trống.');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new BadRequestException('Mô tả khóa học không được để trống.');
    }
    if (!dto.thumbnailUrl || !dto.thumbnailUrl.trim()) {
      throw new BadRequestException('Ảnh bìa khóa học không được để trống.');
    }

    const teacher = await this.prisma.user.findFirst({
      where: {
        id: dto.teacherId,
        role: 'TEACHER',
      },
      select: { id: true, fullName: true, role: true },
    });
    if (!teacher) {
      throw new BadRequestException(
        'Giảng viên phụ trách không hợp lệ hoặc không có vai trò Giảng viên (TEACHER).',
      );
    }

    const duplicateCourse = await this.prisma.course.findFirst({
      where: {
        teacherId: dto.teacherId,
        title: { equals: dto.title.trim(), mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (duplicateCourse) {
      throw new BadRequestException(
        'Giảng viên này đã có khóa học với tiêu đề tương tự. Vui lòng kiểm tra lại.',
      );
    }

    const courseStatus = dto.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';

    const course = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        grade: dto.grade || '10',
        teacherId: dto.teacherId.trim(),
        description: dto.description.trim(),
        thumbnailUrl: dto.thumbnailUrl.trim(),
        status: courseStatus,
        ...(dto.initialChapters && dto.initialChapters.length > 0
          ? {
              chapters: {
                create: dto.initialChapters
                  .filter((ch) => ch && ch.trim().length > 0)
                  .map((title, index) => ({
                    title: title.trim(),
                    sortOrder: index + 1,
                  })),
              },
            }
          : {}),
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
        chapters: {
          select: {
            _count: { select: { lessons: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    return this.mapToAdminCourseItem(course);
  }

  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            avatarUrl: true,
          },
        },
        chapters: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
                videoUrl: true,
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học yêu cầu.');
    }
    return course;
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
  ): Promise<AdminCourseItem> {
    const existing = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, title: true, teacherId: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy khóa học để cập nhật.');
    }

    if (dto.teacherId !== undefined) {
      if (!dto.teacherId.trim()) {
        throw new BadRequestException(
          'Vui lòng chọn giảng viên phụ trách, không được để trống.',
        );
      }
      if (dto.teacherId !== existing.teacherId) {
        const teacher = await this.prisma.user.findFirst({
          where: { id: dto.teacherId, role: 'TEACHER' },
        });
        if (!teacher) {
          throw new BadRequestException(
            'Giảng viên phụ trách không hợp lệ hoặc không có vai trò Giảng viên (TEACHER).',
          );
        }
      }
    }

    if (dto.title !== undefined) {
      const trimmedTitle = dto.title.trim();
      if (!trimmedTitle) {
        throw new BadRequestException('Tên khóa học không được để trống.');
      }
      if (trimmedTitle.length < 5) {
        throw new BadRequestException('Tên khóa học cần tối thiểu 5 ký tự.');
      }
      if (trimmedTitle.length > 255) {
        throw new BadRequestException('Tên khóa học không được vượt quá 255 ký tự.');
      }
      if (trimmedTitle !== existing.title) {
        const duplicate = await this.prisma.course.findFirst({
          where: {
            id: { not: id },
            teacherId: dto.teacherId || existing.teacherId,
            title: { equals: trimmedTitle, mode: 'insensitive' },
          },
        });
        if (duplicate) {
          throw new BadRequestException(
            'Giảng viên này đã có khóa học với tiêu đề tương tự.',
          );
        }
      }
    }

    if (dto.description !== undefined) {
      if (!dto.description || !dto.description.trim()) {
        throw new BadRequestException('Mô tả khóa học không được để trống.');
      }
    }

    if (dto.thumbnailUrl !== undefined) {
      if (!dto.thumbnailUrl || !dto.thumbnailUrl.trim()) {
        throw new BadRequestException('Ảnh bìa khóa học không được để trống.');
      }
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId.trim() } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl.trim() }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
        chapters: {
          select: {
            _count: { select: { lessons: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    return this.mapToAdminCourseItem(course);
  }

  async deleteCourse(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học để xóa.');
    }

    if (course._count.enrollments > 0) {
      await this.prisma.course.update({
        where: { id },
        data: { status: 'HIDDEN' },
      });
      return {
        success: true,
        message:
          'Khóa học đã có học viên đăng ký nên được chuyển sang trạng thái Đã ẩn (HIDDEN).',
      };
    }

    await this.prisma.course.delete({ where: { id } });
    return {
      success: true,
      message: 'Khóa học đã được xóa thành công.',
    };
  }

  async addChapter(courseId: string, dto: CreateChapterDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học để thêm chương.');
    }

    const lastChapter = await this.prisma.chapter.findFirst({
      where: { courseId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const sortOrder =
      dto.sortOrder ?? (lastChapter ? lastChapter.sortOrder + 1 : 1);

    return this.prisma.chapter.create({
      data: {
        courseId,
        title: dto.title.trim(),
        sortOrder,
      },
    });
  }

  async getAdminUsers(): Promise<AdminUsersResponse> {
    const [userCounts, dbUsers] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role', 'status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: { in: ['STUDENT', 'TEACHER'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          phoneNumber: true,
          dateOfBirth: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              taughtCourses: true,
              devices: true,
            },
          },
        },
      }),
    ]);

    let studentCount = 0;
    let teacherCount = 0;
    let adminCount = 0;
    let activeUsers = 0;
    let suspendedUsers = 0;

    for (const group of userCounts) {
      const count = group._count._all;
      if (group.role === 'STUDENT') {
        studentCount += count;
      } else if (group.role === 'TEACHER') {
        teacherCount += count;
      } else if (group.role === 'ADMIN') {
        adminCount += count;
      }

      if (group.status === 'ACTIVE') {
        activeUsers += count;
      } else if (group.status === 'SUSPENDED') {
        suspendedUsers += count;
      }
    }

    const totalUsers = studentCount + teacherCount;
    const users: AdminUserItem[] = dbUsers.map((u) => this.mapToAdminUserItem(u));

    return {
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        studentCount,
        teacherCount,
        adminCount,
      },
      users,
    };
  }

  async getUserById(id: string): Promise<AdminUserDetailResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        devices: {
          orderBy: { lastLoginAt: 'desc' },
          take: 10,
        },
        taughtCourses: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                status: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            taughtCourses: true,
            devices: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng này trong hệ thống.');
    }

    const formattedDevices: AdminUserDeviceItem[] = user.devices.map((dev) => ({
      id: dev.id,
      deviceId: dev.deviceId,
      deviceName: dev.deviceName,
      ipAddress: dev.ipAddress,
      isTrusted: dev.isTrusted,
      lastLoginAt: dev.lastLoginAt.toISOString(),
      formattedLastLoginAt: this.formatDateTime(dev.lastLoginAt),
    }));

    const formattedTaughtCourses: AdminUserCourseItem[] = user.taughtCourses.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      statusText: c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ẩn',
      thumbnailUrl: c.thumbnailUrl,
      studentCount: c._count.enrollments,
      createdAt: c.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(c.createdAt),
    }));

    const formattedEnrolledCourses: AdminUserCourseItem[] = user.enrollments.map((en) => ({
      id: en.course.id,
      title: en.course.title,
      status: en.course.status,
      statusText: en.course.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ẩn',
      thumbnailUrl: en.course.thumbnailUrl,
      progress: en.progressPercent,
      createdAt: en.enrolledAt.toISOString(),
      formattedCreatedAt: this.formatDate(en.enrolledAt),
    }));

    const mappedUser = this.mapToAdminUserItem(user);

    return {
      ...mappedUser,
      devices: formattedDevices,
      taughtCourses: formattedTaughtCourses,
      enrolledCourses: formattedEnrolledCourses,
      stats: {
        enrolledCoursesCount: user._count.enrollments,
        taughtCoursesCount: user._count.taughtCourses,
        devicesCount: user._count.devices,
      },
    };
  }

  async updateUserStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ): Promise<AdminUserItem> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng này trong hệ thống.');
    }

    if (existing.role === 'ADMIN') {
      throw new BadRequestException('Không thể thay đổi trạng thái của tài khoản Quản trị viên.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
        dateOfBirth: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            taughtCourses: true,
            devices: true,
          },
        },
      },
    });

    return this.mapToAdminUserItem(updated);
  }

  async createUser(dto: CreateUserDto): Promise<AdminUserItem> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('Email này đã được sử dụng trên hệ thống.');
    }

    const rawPassword = dto.password?.trim() || 'Giangvien@123';
    const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id });
    const parsedDob = this.parseDateString(dto.dateOfBirth);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: dto.role,
        status: dto.status || 'ACTIVE',
        avatarUrl: dto.avatarUrl?.trim() || null,
        phoneNumber: dto.phoneNumber?.trim() || null,
        dateOfBirth: parsedDob,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
        dateOfBirth: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return this.mapToAdminUserItem(user);
  }

  async bulkCreateUsers(dto: BulkCreateUsersDto): Promise<{
    total: number;
    successCount: number;
    failedCount: number;
    errors: Array<{ email: string; reason: string }>;
    createdUsers: AdminUserItem[];
  }> {
    const createdUsers: AdminUserItem[] = [];
    const errors: Array<{ email: string; reason: string }> = [];

    const allEmails = Array.from(new Set(dto.users.map((u) => u.email.trim().toLowerCase())));
    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email));

    const defaultPasswordHash = await argon2.hash('Giangvien@123', { type: argon2.argon2id });

    for (const item of dto.users) {
      const normalizedEmail = item.email.trim().toLowerCase();
      try {
        if (existingEmailSet.has(normalizedEmail)) {
          errors.push({ email: normalizedEmail, reason: 'Email này đã tồn tại trên hệ thống.' });
          continue;
        }

        const rawPassword = item.password?.trim() || 'Giangvien@123';
        const passwordHash =
          rawPassword === 'Giangvien@123'
            ? defaultPasswordHash
            : await argon2.hash(rawPassword, { type: argon2.argon2id });

        const parsedDob = this.parseDateString(item.dateOfBirth);

        const user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            fullName: item.fullName.trim(),
            passwordHash,
            role: item.role,
            status: item.status || 'ACTIVE',
            avatarUrl: item.avatarUrl?.trim() || null,
            phoneNumber: item.phoneNumber?.trim() || null,
            dateOfBirth: parsedDob,
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            dateOfBirth: true,
            role: true,
            status: true,
            createdAt: true,
          },
        });

        existingEmailSet.add(normalizedEmail);
        createdUsers.push(this.mapToAdminUserItem(user));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tài khoản.';
        errors.push({ email: normalizedEmail, reason: msg });
      }
    }

    return {
      total: dto.users.length,
      successCount: createdUsers.length,
      failedCount: errors.length,
      errors,
      createdUsers,
    };
  }

  /**
   * Sinh mã key học thuật ngẫu nhiên: TKU-CHEM-XXXX-YYYY
   * Loại bỏ các ký tự dễ nhầm lẫn như 0, O, 1, I
   */
  private generateRandomKeyString(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const segment = (len: number) => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return str;
    };
    return `TKU-CHEM-${segment(4)}-${segment(4)}`;
  }

  /**
   * Admin tạo mã Key 1 lần cho khóa học với thời hạn hiệu lực cụ thể
   * Đúng 6 trường Database đã duyệt:
   * 1. id: UUID
   * 2. key: string unique
   * 3. courseId: UUID
   * 4. expiresAt: DateTime
   * 5. usedById: UUID (null khi chưa dùng)
   * 6. createdAt: DateTime
   */
  async createCourseActivationKeys(
    courseId: string,
    dto: CreateActivationKeysDto,
  ): Promise<{
    message: string;
    totalCreated: number;
    expiresAt: Date;
    keys: AdminActivationKeyItem[];
  }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại trên hệ thống.');
    }

    const hours = Number(dto.expiresInHours);
    if (isNaN(hours) || hours <= 0) {
      throw new BadRequestException(
        'Thời hạn hiệu lực của key phải là số giờ hợp lệ lớn hơn 0 (ví dụ 24h, 72h).',
      );
    }

    const quantity = Math.min(Math.max(1, Number(dto.quantity) || 1), 50);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    const now = new Date();

    // Sinh danh sách mã key ngẫu nhiên không trùng lặp trong bộ nhớ
    const keysSet = new Set<string>();
    while (keysSet.size < quantity) {
      keysSet.add(this.generateRandomKeyString());
    }
    const candidateKeys = Array.from(keysSet);

    // Kiểm tra 1 lần duy nhất trong DB xem có mã nào bị trùng không (thay vì lặp n lần)
    const existingRecords = await this.prisma.courseActivationKey.findMany({
      where: { key: { in: candidateKeys } },
      select: { key: true },
    });

    const existingKeySet = new Set(existingRecords.map((r) => r.key));
    const finalKeys: string[] = candidateKeys.filter((k) => !existingKeySet.has(k));

    while (finalKeys.length < quantity) {
      const extraKey = this.generateRandomKeyString();
      if (!keysSet.has(extraKey) && !existingKeySet.has(extraKey)) {
        finalKeys.push(extraKey);
      }
    }

    // Chèn toàn bộ mã key vào DB trong 1 Transaction nguyên tử duy nhất
    const newRecords = await this.prisma.$transaction(
      finalKeys.map((k) =>
        this.prisma.courseActivationKey.create({
          data: {
            key: k,
            courseId,
            expiresAt,
            usedById: null,
            createdAt: now,
          },
        }),
      ),
    );

    const createdKeys: AdminActivationKeyItem[] = newRecords.map((newKeyRecord) => ({
      id: newKeyRecord.id,
      key: newKeyRecord.key,
      courseId: newKeyRecord.courseId,
      expiresAt: newKeyRecord.expiresAt,
      usedById: newKeyRecord.usedById,
      createdAt: newKeyRecord.createdAt,
      status: 'ACTIVE',
      usedBy: null,
    }));

    return {
      message: `Đã tạo thành công ${createdKeys.length} mã key tham gia khóa học (hiệu lực ${hours} giờ).`,
      totalCreated: createdKeys.length,
      expiresAt,
      keys: createdKeys,
    };
  }

  /**
   * Lấy danh sách tất cả mã Key của khóa học kèm trạng thái thực tế
   */
  async getCourseActivationKeys(
    courseId: string,
  ): Promise<AdminActivationKeysResponse> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại.');
    }

    const records = await this.prisma.courseActivationKey.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const now = new Date();
    let activeCount = 0;
    let usedCount = 0;
    let expiredCount = 0;

    const keys: AdminActivationKeyItem[] = records.map((r) => {
      let status: 'ACTIVE' | 'USED' | 'EXPIRED';

      if (r.usedById) {
        status = 'USED';
        usedCount++;
      } else if (now > new Date(r.expiresAt)) {
        status = 'EXPIRED';
        expiredCount++;
      } else {
        status = 'ACTIVE';
        activeCount++;
      }

      return {
        id: r.id,
        key: r.key,
        courseId: r.courseId,
        expiresAt: r.expiresAt,
        usedById: r.usedById,
        createdAt: r.createdAt,
        status,
        usedBy: r.usedBy ?? null,
      };
    });

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalKeys: keys.length,
      activeCount,
      usedCount,
      expiredCount,
      keys,
    };
  }

  /**
   * Xóa hoặc thu hồi mã key chưa sử dụng
   */
  async deleteActivationKey(
    keyId: string,
  ): Promise<{ message: string; id: string }> {
    const existing = await this.prisma.courseActivationKey.findUnique({
      where: { id: keyId },
    });

    if (!existing) {
      throw new NotFoundException('Mã key không tồn tại trên hệ thống.');
    }

    if (existing.usedById) {
      throw new BadRequestException(
        'Không thể xóa mã key đã được học sinh sử dụng để bảo toàn dữ liệu đào tạo.',
      );
    }

    await this.prisma.courseActivationKey.delete({
      where: { id: keyId },
    });

    return {
      message: 'Xóa mã key thành công.',
      id: keyId,
    };
  }

  /**
   * Lấy danh sách toàn bộ mã key trên hệ thống cho trang quản trị chuyên biệt
   * Kèm thống kê, lọc theo khóa học, trạng thái và tìm kiếm
   */
  async getAllActivationKeys(options?: {
    courseId?: string;
    status?: string;
    search?: string;
  }): Promise<{
    stats: {
      totalKeys: number;
      activeCount: number;
      usedCount: number;
      expiredCount: number;
    };
    courses: Array<{ id: string; title: string }>;
    keys: Array<AdminActivationKeyItem & { courseTitle: string }>;
  }> {
    // 1. Lấy danh sách tất cả các khóa học phục vụ bộ lọc
    const courses = await this.prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });

    // 2. Xây dựng điều kiện tìm kiếm
    const where: Prisma.CourseActivationKeyWhereInput = {};
    if (options?.courseId && options.courseId !== 'ALL') {
      where.courseId = options.courseId;
    }

    if (options?.search?.trim()) {
      const keyword = options.search.trim();
      where.OR = [
        { key: { contains: keyword, mode: 'insensitive' } },
        {
          usedBy: {
            OR: [
              { fullName: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const records = await this.prisma.courseActivationKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: { id: true, title: true },
        },
        usedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const now = new Date();
    let totalKeys = 0;
    let activeCount = 0;
    let usedCount = 0;
    let expiredCount = 0;

    const allKeys = records.map((r) => {
      totalKeys++;
      let status: 'ACTIVE' | 'USED' | 'EXPIRED';

      if (r.usedById) {
        status = 'USED';
        usedCount++;
      } else if (now > new Date(r.expiresAt)) {
        status = 'EXPIRED';
        expiredCount++;
      } else {
        status = 'ACTIVE';
        activeCount++;
      }

      return {
        id: r.id,
        key: r.key,
        courseId: r.courseId,
        courseTitle: r.course?.title || 'Khóa học',
        expiresAt: r.expiresAt,
        usedById: r.usedById,
        createdAt: r.createdAt,
        status,
        usedBy: r.usedBy ?? null,
      };
    });

    // Lọc theo trạng thái nếu có
    const filteredKeys =
      options?.status && options.status !== 'ALL'
        ? allKeys.filter((k) => k.status === options.status)
        : allKeys;

    return {
      stats: {
        totalKeys,
        activeCount,
        usedCount,
        expiredCount,
      },
      courses,
      keys: filteredKeys,
    };
  }
}

