import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
    type: 'USER' | 'COURSE' | 'CONTENT' | 'KEY';
    title: string;
    description: string;
    timeAgo: string;
  }>;
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
        this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
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
          take: 4,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            role: true,
            createdAt: true,
          },
        }),
        this.prisma.course.findMany({
          take: 2,
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
      let status: 'ACTIVE' | 'PENDING' | 'DRAFT' = 'DRAFT';
      let statusText = 'Bản nháp';
      if (c.status === 'PUBLISHED') {
        status = 'ACTIVE';
        statusText = 'Đang hoạt động';
      } else if (c.status === 'ARCHIVED') {
        status = 'PENDING';
        statusText = 'Lưu trữ';
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
      type: 'USER' | 'COURSE' | 'CONTENT' | 'KEY';
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

    const sanitizedActivities = recentActivities.slice(0, 5).map(({ id, type, title, description, timeAgo }) => ({
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
      publishedCourses,
      archivedCourses,
      draftCourses,
      dbCourses,
      teachers,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.course.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.course.count({ where: { status: 'DRAFT' } }),
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
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const publishedPercentage =
      totalCourses > 0
        ? Math.round((publishedCourses / totalCourses) * 100)
        : 0;

    const courses: AdminCourseItem[] = dbCourses.map((c) => {
      let statusText = 'Bản nháp';
      if (c.status === 'PUBLISHED') statusText = 'Đang xuất bản';
      else if (c.status === 'ARCHIVED') statusText = 'Đã lưu trữ';

      const gradeMatch = c.title.match(/\b(1[0-2]|[1-9])\b/);
      const grade = gradeMatch ? gradeMatch[1] : 'Khác';

      const lessonCount = c.chapters.reduce(
        (sum, ch) => sum + ch._count.lessons,
        0,
      );

      const d = c.updatedAt || c.createdAt;
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      return {
        id: c.id,
        title: c.title,
        teacherName: c.teacher?.fullName || 'Chưa phân công',
        teacherId: c.teacher?.id || '',
        grade,
        studentCount: c._count.enrollments,
        lessonCount,
        status: c.status as 'PUBLISHED' | 'ARCHIVED' | 'DRAFT',
        statusText,
        updatedAt: `Cập nhật ${dateFormatted}`,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return {
      stats: {
        totalCourses,
        publishedCourses,
        archivedCourses,
        draftCourses,
        publishedPercentage,
      },
      courses,
      teachers,
    };
  }
}
