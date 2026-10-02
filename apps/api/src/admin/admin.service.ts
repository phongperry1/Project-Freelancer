import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateChapterDto,
} from './dto/course.dto.js';

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

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async createUniqueSlug(baseTitle: string): Promise<string> {
    const baseSlug = this.generateSlug(baseTitle) || 'khoa-hoc';
    const existing = await this.prisma.course.findMany({
      where: {
        slug: { startsWith: baseSlug },
      },
      select: { slug: true },
    });
    const slugSet = new Set(existing.map((c) => c.slug));
    if (!slugSet.has(baseSlug)) {
      return baseSlug;
    }
    let counter = 1;
    while (slugSet.has(`${baseSlug}-${counter}`)) {
      counter++;
    }
    return `${baseSlug}-${counter}`;
  }

  private mapToAdminCourseItem(course: {
    id: string;
    slug?: string | null;
    title: string;
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

    return {
      id: course.id,
      slug: course.slug || undefined,
      title: course.title,
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

    const slug = await this.createUniqueSlug(dto.title);

    const course = await this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        slug,
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
        teacher: { select: { id: true, fullName: true, role: true } },
        chapters: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
                status: true,
                videoUrl: true,
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
}

