import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PublicCourseDto {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  teacher: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  studentCount: number;
  chapterCount: number;
  lessonCount: number;
  grade: '10' | '11' | '12' | 'exam' | 'other';
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function detectGradeLevel(
  title: string,
  description?: string | null,
): '10' | '11' | '12' | 'exam' | 'other' {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  // Ưu tiên kiểm tra từ khóa luyện thi đại học / THPT Quốc gia
  if (
    text.includes('thpt') ||
    text.includes('đại học') ||
    text.includes('luyện thi') ||
    text.includes('quốc gia') ||
    text.includes('đgnl') ||
    text.includes('tsa')
  ) {
    return 'exam';
  }

  // Dùng regex word boundary để tránh match nhầm các số như "100 câu", "2012"
  if (/\b(lớp\s*12|hóa\s*12|12)\b/i.test(text)) {
    return '12';
  }
  if (/\b(lớp\s*11|hóa\s*11|11)\b/i.test(text)) {
    return '11';
  }
  if (/\b(lớp\s*10|hóa\s*10|10)\b/i.test(text)) {
    return '10';
  }

  return 'other';
}

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách khóa học công khai đang hoạt động (ACTIVE)
   * Tối ưu hóa: Chỉ đếm số lượng lessons thông qua _count thay vì nạp toàn bộ danh sách lesson vào bộ nhớ
   */
  async getPublicCourses(query?: {
    grade?: string;
    search?: string;
  }): Promise<{ courses: PublicCourseDto[]; total: number }> {
    const rawCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        ...(query?.search?.trim()
          ? {
              OR: [
                { title: { contains: query.search.trim(), mode: 'insensitive' } },
                { description: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnailUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        chapters: {
          select: {
            id: true,
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mappedCourses: PublicCourseDto[] = rawCourses.map((c) => {
      const lessonCount = c.chapters.reduce(
        (sum, ch) => sum + ch._count.lessons,
        0,
      );
      const grade = detectGradeLevel(c.title, c.description);

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        teacher: {
          id: c.teacher.id,
          fullName: c.teacher.fullName,
          avatarUrl: c.teacher.avatarUrl,
        },
        studentCount: c._count.enrollments,
        chapterCount: c.chapters.length,
        lessonCount,
        grade,
      };
    });

    const filtered =
      query?.grade && query.grade !== 'all'
        ? mappedCourses.filter((c) => c.grade === query.grade)
        : mappedCourses;

    return {
      courses: filtered,
      total: filtered.length,
    };
  }

  /**
   * Xem chi tiết khóa học công khai theo ID
   * Có kiểm tra định dạng UUID bảo vệ cơ sở dữ liệu
   */
  async getPublicCourseById(id: string): Promise<
    PublicCourseDto & {
      chapters: Array<{
        id: string;
        title: string;
        sortOrder: number;
        lessons: Array<{
          id: string;
          title: string;
          sortOrder: number;
        }>;
      }>;
    }
  > {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('Khóa học không tồn tại hoặc mã định danh không hợp lệ.');
    }

    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnailUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        chapters: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            sortOrder: true,
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course || course.status !== 'ACTIVE') {
      throw new NotFoundException('Khóa học không tồn tại hoặc đã bị ẩn.');
    }

    const lessonCount = course.chapters.reduce(
      (sum, ch) => sum + ch.lessons.length,
      0,
    );

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      teacher: {
        id: course.teacher.id,
        fullName: course.teacher.fullName,
        avatarUrl: course.teacher.avatarUrl,
      },
      studentCount: course._count.enrollments,
      chapterCount: course.chapters.length,
      lessonCount,
      grade: detectGradeLevel(course.title, course.description),
      chapters: course.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        sortOrder: ch.sortOrder,
        lessons: ch.lessons.map((ls) => ({
          id: ls.id,
          title: ls.title,
          sortOrder: ls.sortOrder,
        })),
      })),
    };
  }
}
