import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PublicCourseDto {
  id: string;
  title: string;
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
  isEnrolled?: boolean;
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
  async getPublicCourses(
    query?: {
      grade?: string;
      search?: string;
    },
    studentId?: string | null,
  ): Promise<{ courses: PublicCourseDto[]; total: number }> {
    let enrolledCourseIds = new Set<string>();
    if (studentId) {
      const myEnrollments = await this.prisma.courseEnrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseId));
    }

    const hasGradeFilter = query?.grade && query.grade !== 'all';

    const rawCourses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        ...(hasGradeFilter ? { grade: query.grade } : {}),
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
        grade: true,
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
      const grade =
        (c.grade as '10' | '11' | '12' | 'exam' | 'other') ||
        detectGradeLevel(c.title, c.description);

      return {
        id: c.id,
        title: c.title,
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
        isEnrolled: studentId ? enrolledCourseIds.has(c.id) : false,
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
        grade: true,
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
      grade:
        (course.grade as '10' | '11' | '12' | 'exam' | 'other') ||
        detectGradeLevel(course.title, course.description),
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

  /**
   * Kiểm tra xem học sinh đã tham gia khóa học hay chưa
   */
  async checkStudentEnrollment(
    courseId: string,
    studentId?: string | null,
  ): Promise<{ isEnrolled: boolean; enrolledAt?: Date | null }> {
    if (!studentId || !UUID_REGEX.test(courseId)) {
      return { isEnrolled: false, enrolledAt: null };
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

    return {
      isEnrolled: !!enrollment,
      enrolledAt: enrollment?.enrolledAt ?? null,
    };
  }

  /**
   * Học sinh kích hoạt mã Key 1 lần để tham gia khóa học
   * - Xác thực khóa học
   * - Xác thực mã key (chưa dùng usedById = null, chưa hết hạn expiresAt > now)
   * - Dùng transaction để ghi danh và đánh dấu key đã sử dụng
   */
  async enrollWithKey(
    courseId: string,
    studentId: string,
    rawKey: string,
  ): Promise<{
    success: boolean;
    message: string;
    courseId: string;
    enrolledAt: Date;
  }> {
    if (!UUID_REGEX.test(courseId)) {
      throw new BadRequestException('Mã ID khóa học không đúng định dạng UUID.');
    }

    const cleanKey = rawKey?.trim().toUpperCase();
    if (!cleanKey) {
      throw new BadRequestException('Vui lòng nhập mã Key kích hoạt.');
    }

    // 1. Kiểm tra khóa học có tồn tại và đang hoạt động không
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, status: true },
    });

    if (!course || course.status !== 'ACTIVE') {
      throw new NotFoundException('Khóa học không tồn tại hoặc đã tạm dừng tiếp nhận học sinh.');
    }

    // 2. Tìm bản ghi mã key trong DB
    const keyRecord = await this.prisma.courseActivationKey.findUnique({
      where: { key: cleanKey },
    });

    if (!keyRecord) {
      throw new NotFoundException(
        'Mã Key kích hoạt không tồn tại trên hệ thống. Vui lòng kiểm tra lại chính xác từng ký tự.',
      );
    }

    // Kiểm tra xem key có thuộc về khóa học này không
    if (keyRecord.courseId !== courseId) {
      throw new BadRequestException(
        'Mã Key này không áp dụng cho khóa học này. Vui lòng kiểm tra lại mã khóa học của bạn.',
      );
    }

    // 3. Kiểm tra xem key đã được sử dụng chưa (Key 1 lần)
    if (keyRecord.usedById) {
      throw new BadRequestException(
        'Mã Key này đã được sử dụng trước đó. Mỗi mã key chỉ có hiệu lực kích hoạt 1 lần duy nhất.',
      );
    }

    // 4. Kiểm tra thời hạn hiệu lực của key (expiresAt)
    const now = new Date();
    if (now > new Date(keyRecord.expiresAt)) {
      throw new BadRequestException(
        'Mã Key này đã hết thời hạn hiệu lực và tự động bị hủy. Vui lòng liên hệ Quản trị viên hoặc Giảng viên để được cấp mã mới.',
      );
    }

    // 5. Thực hiện Transaction: Ghi nhận tham gia khóa học & Đánh dấu key đã dùng
    const result = await this.prisma.$transaction(async (tx) => {
      // Đánh dấu key đã được kích hoạt (sử dụng điều kiện usedById: null để chặn race condition khi nhiều yêu cầu gửi cùng lúc)
      const updateResult = await tx.courseActivationKey.updateMany({
        where: { id: keyRecord.id, usedById: null },
        data: { usedById: studentId },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException(
          'Mã Key này vừa được sử dụng bởi một tài khoản khác. Vui lòng kiểm tra lại.',
        );
      }

      // Tạo hoặc cập nhật bản ghi ghi danh khóa học
      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
        create: {
          courseId,
          studentId,
        },
        update: {
          enrolledAt: new Date(),
        },
      });

      return { enrollment };
    });

    return {
      success: true,
      message: `Chúc mừng bạn đã kích hoạt thành công khóa học "${course.title}"!`,
      courseId,
      enrolledAt: result.enrollment.enrolledAt,
    };
  }
}

