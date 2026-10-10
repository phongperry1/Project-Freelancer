import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface LecturerCourseItem {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: 'ACTIVE' | 'HIDDEN';
  statusText: string;
  studentCount: number;
  chapterCount: number;
  lessonCount: number;
  updatedAt: string;
  createdAt: string;
  chapters: Array<{
    id: string;
    title: string;
    sortOrder: number;
    lessonCount: number;
    lessons: Array<{
      id: string;
      title: string;
      sortOrder: number;
      durationMinutes?: number | null;
      status: string;
      videoUrl?: string | null;
    }>;
  }>;
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

@Injectable()
export class LecturerService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  async getAssignedCourses(
    userId: string,
    role?: string,
  ): Promise<LecturerCoursesResponse> {
    const whereClause = role === 'ADMIN' ? {} : { teacherId: userId };

    const rawCourses = await this.prisma.course.findMany({
      where: whereClause,
      include: {
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
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            chapters: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let totalStudents = 0;
    let totalLessons = 0;
    let activeCourses = 0;
    let hiddenCourses = 0;

    const courses: LecturerCourseItem[] = rawCourses.map((c) => {
      if (c.status === 'ACTIVE') {
        activeCourses++;
      } else {
        hiddenCourses++;
      }

      const studentCount = c._count.enrollments;
      totalStudents += studentCount;

      const lessonCount = c.chapters.reduce(
        (acc, ch) => acc + (ch._count?.lessons || 0),
        0,
      );
      totalLessons += lessonCount;

      const updatedDate = c.updatedAt || c.createdAt;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug || undefined,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        status: (c.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE') as
          | 'ACTIVE'
          | 'HIDDEN',
        statusText: c.status === 'HIDDEN' ? 'Đã ẩn' : 'Đang hoạt động',
        studentCount,
        chapterCount: c._count.chapters,
        lessonCount,
        updatedAt: `Cập nhật ${this.formatDate(updatedDate)}`,
        createdAt: this.formatDate(c.createdAt),
        chapters: c.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          sortOrder: ch.sortOrder,
          lessonCount: ch.lessons.length,
          lessons: ch.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            sortOrder: l.sortOrder,
            durationMinutes: null,
            status: l.status,
            videoUrl: l.videoUrl,
          })),
        })),
      };
    });

    return {
      stats: {
        totalCourses: rawCourses.length,
        activeCourses,
        hiddenCourses,
        totalStudents,
        totalLessons,
      },
      courses,
    };
  }

  async getCourseDetail(
    userId: string,
    courseId: string,
    role?: string,
  ): Promise<LecturerCourseItem> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
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
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            chapters: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học yêu cầu.');
    }

    if (role !== 'ADMIN' && course.teacherId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý khóa học này.',
      );
    }

    const lessonCount = course.chapters.reduce(
      (acc, ch) => acc + (ch._count?.lessons || 0),
      0,
    );

    return {
      id: course.id,
      title: course.title,
      slug: course.slug || undefined,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      status: (course.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE') as
        | 'ACTIVE'
        | 'HIDDEN',
      statusText: course.status === 'HIDDEN' ? 'Đã ẩn' : 'Đang hoạt động',
      studentCount: course._count.enrollments,
      chapterCount: course._count.chapters,
      lessonCount,
      updatedAt: `Cập nhật ${this.formatDate(course.updatedAt || course.createdAt)}`,
      createdAt: this.formatDate(course.createdAt),
      chapters: course.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        sortOrder: ch.sortOrder,
        lessonCount: ch.lessons.length,
        lessons: ch.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          sortOrder: l.sortOrder,
          durationMinutes: null,
          status: l.status,
          videoUrl: l.videoUrl,
        })),
      })),
    };
  }

  async getDashboardData(userId: string, role?: string) {
    const assigned = await this.getAssignedCourses(userId, role);
    return {
      stats: {
        totalCourses: assigned.stats.totalCourses,
        publishedCourses: assigned.stats.activeCourses,
        draftCourses: assigned.stats.hiddenCourses,
        totalStudents: assigned.stats.totalStudents,
        newStudentsThisMonth: 0,
        pendingGrading: 0,
        essayCount: 0,
        quizCount: 0,
        averageProgress: 0,
        progressChange: 0,
      },
      courses: assigned.courses.slice(0, 5).map((c) => ({
        id: c.id,
        title: c.title,
        symbol: c.title.charAt(0).toUpperCase() || '∑',
        symbolType: 'blue' as const,
        studentsCount: c.studentCount,
        chaptersCount: c.chapterCount,
        updatedAt: c.updatedAt,
        progressPercent: 0,
      })),
      activities: [],
      submissions: [],
      tasks: [],
    };
  }

  async addChapter(
    userId: string,
    courseId: string,
    role?: string,
    title: string = '',
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học để thêm chương.');
    }
    if (role !== 'ADMIN' && course.teacherId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý nội dung khóa học này.',
      );
    }

    const lastChapter = await this.prisma.chapter.findFirst({
      where: { courseId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (lastChapter?.sortOrder ?? 0) + 1;

    return this.prisma.chapter.create({
      data: {
        courseId,
        title: title.trim() || `Chương ${sortOrder}`,
        sortOrder,
      },
    });
  }

  async updateChapter(
    userId: string,
    chapterId: string,
    role?: string,
    title: string = '',
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học.');
    }
    if (role !== 'ADMIN' && chapter.course.teacherId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa chương học này.',
      );
    }

    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: title.trim(),
      },
    });
  }

  async deleteChapter(userId: string, chapterId: string, role?: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học.');
    }
    if (role !== 'ADMIN' && chapter.course.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa chương học này.');
    }

    return this.prisma.chapter.delete({
      where: { id: chapterId },
    });
  }

  async addLesson(
    userId: string,
    chapterId: string,
    role?: string,
    data: {
      title: string;
      content?: string | null;
      videoUrl?: string | null;
      status?: 'DRAFT' | 'PUBLISHED';
    } = { title: '' },
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: { select: { teacherId: true } } },
    });
    if (!chapter) {
      throw new NotFoundException('Không tìm thấy chương học để thêm bài.');
    }
    if (role !== 'ADMIN' && chapter.course.teacherId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm bài học vào chương này.',
      );
    }

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { chapterId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (lastLesson?.sortOrder ?? 0) + 1;

    return this.prisma.lesson.create({
      data: {
        chapterId,
        title: data.title.trim() || `Bài ${sortOrder}`,
        content: data.content ?? null,
        videoUrl: data.videoUrl ?? null,
        status: data.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        sortOrder,
      },
    });
  }

  async updateLesson(
    userId: string,
    lessonId: string,
    role?: string,
    data: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
      status?: 'DRAFT' | 'PUBLISHED';
    } = {},
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: { include: { course: { select: { teacherId: true } } } },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học.');
    }
    if (role !== 'ADMIN' && lesson.chapter.course.teacherId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa bài học này.',
      );
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  async deleteLesson(userId: string, lessonId: string, role?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: { include: { course: { select: { teacherId: true } } } },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học.');
    }
    if (role !== 'ADMIN' && lesson.chapter.course.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài học này.');
    }

    return this.prisma.lesson.delete({
      where: { id: lessonId },
    });
  }
}
