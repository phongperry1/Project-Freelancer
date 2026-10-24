import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

  /**
   * Lấy toàn bộ dữ liệu phòng học (Course Learning Room) cho học sinh đã ghi danh
   */
  async getCourseLearningRoom(courseId: string, studentId: string) {
    if (!UUID_REGEX.test(courseId)) {
      throw new BadRequestException('Mã ID khóa học không đúng định dạng.');
    }

    // 1. Chạy đồng thời truy vấn thông tin khóa học (kèm bài học & tiến độ), thông tin user và ghi danh
    const [course, user, foundEnrollment] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          teacher: {
            select: { id: true, fullName: true, avatarUrl: true },
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
                  chapterId: true,
                  progresses: {
                    where: { studentId },
                    select: {
                      isCompleted: true,
                      progressPercent: true,
                      lastPosition: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, role: true },
      }),
      this.prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
        select: {
          enrolledAt: true,
          progressPercent: true,
          completedAt: true,
        },
      }),
    ]);

    if (!course || course.status !== 'ACTIVE') {
      throw new NotFoundException('Khóa học không tồn tại hoặc đã tạm dừng phát hành.');
    }

    if (!user) {
      throw new ForbiddenException('Tài khoản người dùng không hợp lệ.');
    }

    // 2. Kiểm tra quyền truy cập (Admin, Giảng viên sở hữu, hoặc Học sinh đã ghi danh)
    let isEnrolled = false;
    let enrollment: {
      enrolledAt: Date;
      progressPercent: number;
      completedAt: Date | null;
    } | null = null;

    if (user.role === 'ADMIN' || course.teacherId === studentId) {
      isEnrolled = true;
      if (foundEnrollment) {
        enrollment = foundEnrollment;
      }
    } else if (foundEnrollment) {
      isEnrolled = true;
      enrollment = foundEnrollment;
    }

    if (!isEnrolled) {
      throw new ForbiddenException(
        'Bạn chưa đăng ký hoặc chưa kích hoạt mã Key tham gia khóa học này. Vui lòng kích hoạt để bắt đầu học tập.',
      );
    }

    // 3. Chuẩn hóa dữ liệu chương mục và bài học từ quan hệ đã nạp sẵn
    let totalLessons = 0;
    let completedLessonsCount = 0;
    let firstUnfinishedLessonId: string | null = null;
    let firstLessonId: string | null = null;

    const formattedChapters = course.chapters.map((ch) => {
      const lessons = ch.lessons.map((ls) => {
        totalLessons++;
        if (!firstLessonId) {
          firstLessonId = ls.id;
        }

        const prog = ls.progresses[0];
        const isCompleted = prog?.isCompleted ?? false;
        if (isCompleted) {
          completedLessonsCount++;
        } else if (!firstUnfinishedLessonId) {
          firstUnfinishedLessonId = ls.id;
        }

        return {
          id: ls.id,
          title: ls.title,
          sortOrder: ls.sortOrder,
          chapterId: ch.id,
          hasVideo: Boolean(ls.videoUrl && ls.videoUrl.trim() !== ''),
          videoUrl: ls.videoUrl,
          content: ls.content,
          isCompleted,
          progressPercent: prog?.progressPercent ?? 0,
          lastPosition: prog?.lastPosition ?? 0,
        };
      });

      return {
        id: ch.id,
        title: ch.title,
        sortOrder: ch.sortOrder,
        lessons,
      };
    });

    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    const currentLessonId = firstUnfinishedLessonId || firstLessonId;

    return {
      course: {
        id: course.id,
        title: course.title,
        grade: course.grade,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        teacher: course.teacher,
      },
      enrollment: enrollment
        ? {
            enrolledAt: enrollment.enrolledAt,
            progressPercent: enrollment.progressPercent,
            completedAt: enrollment.completedAt,
          }
        : {
            enrolledAt: new Date(),
            progressPercent,
            completedAt: null,
          },
      chapters: formattedChapters,
      totalLessons,
      completedLessons: completedLessonsCount,
      progressPercent,
      currentLessonId,
    };
  }

  /**
   * Cập nhật tiến độ học tập của học sinh (đánh dấu hoàn thành / lưu vị trí video)
   */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    studentId: string,
    data: { isCompleted?: boolean; lastPosition?: number; progressPercent?: number },
  ) {
    if (!UUID_REGEX.test(courseId) || !UUID_REGEX.test(lessonId)) {
      throw new BadRequestException('Mã ID không hợp lệ.');
    }

    // 1. Kiểm tra enrollment & quyền truy cập thông qua helper chuẩn hóa
    const enrollment = await this.ensureStudentEnrolled(courseId, studentId);

    // 2. Upsert LessonProgress
    const now = new Date();
    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId,
        },
      },
      create: {
        studentId,
        lessonId,
        isCompleted: data.isCompleted ?? false,
        lastPosition: data.lastPosition ?? 0,
        progressPercent: data.progressPercent ?? (data.isCompleted ? 100 : 0),
        completedAt: data.isCompleted ? now : null,
      },
      update: {
        ...(data.isCompleted !== undefined ? { isCompleted: data.isCompleted } : {}),
        ...(data.isCompleted ? { completedAt: now } : {}),
        ...(data.lastPosition !== undefined ? { lastPosition: data.lastPosition } : {}),
        ...(data.progressPercent !== undefined ? { progressPercent: data.progressPercent } : {}),
      },
    });

    // 3. Tính toán lại tiến độ tổng thể khóa học thông qua quan hệ bảng trực tiếp (tối ưu SQL count)
    let courseProgressPercent = 0;
    if (enrollment) {
      const [totalLessons, completedCount] = await Promise.all([
        this.prisma.lesson.count({
          where: { chapter: { courseId } },
        }),
        this.prisma.lessonProgress.count({
          where: {
            studentId,
            lesson: { chapter: { courseId } },
            isCompleted: true,
          },
        }),
      ]);

      courseProgressPercent =
        totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      await this.prisma.courseEnrollment.update({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
        data: {
          progressPercent: courseProgressPercent,
          completedAt: courseProgressPercent === 100 ? now : null,
        },
      });
    }

    return {
      lessonProgress: progress,
      courseProgressPercent,
    };
  }

  /**
   * Helper: Kiểm tra quyền truy cập khóa học của học sinh
   */
  private async ensureStudentEnrolled(courseId: string, studentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

    if (!enrollment) {
      const [user, course] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: studentId },
          select: { role: true },
        }),
        this.prisma.course.findUnique({
          where: { id: courseId },
          select: { teacherId: true },
        }),
      ]);

      if (user?.role !== 'ADMIN' && course?.teacherId !== studentId) {
        throw new ForbiddenException('Bạn chưa đăng ký tham gia khóa học này.');
      }
    }

    return enrollment;
  }

  /**
   * 1. Lấy danh sách các bài tập / đề kiểm tra của khóa học (kèm bài của từng lesson)
   */
  async getStudentAssessments(courseId: string, studentId: string, lessonId?: string) {
    if (!UUID_REGEX.test(courseId)) {
      throw new BadRequestException('Mã ID khóa học không hợp lệ.');
    }
    await this.ensureStudentEnrolled(courseId, studentId);

    const whereClause: { courseId: string; lessonId?: string } = {
      courseId,
    };
    if (lessonId) {
      if (!UUID_REGEX.test(lessonId)) {
        throw new BadRequestException('Mã ID bài học không hợp lệ.');
      }
      whereClause.lessonId = lessonId;
    }

    const assessments = await this.prisma.assessment.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'asc' }],
      include: {
        lesson: {
          select: { id: true, title: true, sortOrder: true },
        },
        _count: {
          select: { questions: true },
        },
        submissions: {
          where: { studentId },
          orderBy: { attemptNumber: 'desc' },
          select: {
            id: true,
            attemptNumber: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });

    return assessments.map((a) => {
      const submissions = a.submissions || [];
      const bestScore = submissions.reduce<number | null>((max, s) => {
        if (s.score === null) return max;
        return max === null ? s.score : Math.max(max, s.score);
      }, null);

      return {
        id: a.id,
        courseId: a.courseId,
        lessonId: a.lessonId,
        lessonTitle: a.lesson?.title || null,
        title: a.title,
        type: a.type,
        durationMinutes: a.durationMinutes,
        startDate: a.startDate,
        dueDate: a.dueDate,
        totalQuestions: a._count.questions,
        submissionsCount: submissions.length,
        bestScore,
        latestSubmission: submissions[0] || null,
      };
    });
  }

  /**
   * 2. Lấy dữ liệu đề thi để học sinh làm bài thi trực tuyến (BẢO MẬT: Ẩn isCorrect, solutionText, solutionFileUrl)
   */
  async getAssessmentForTake(courseId: string, assessmentId: string, studentId: string) {
    if (!UUID_REGEX.test(courseId) || !UUID_REGEX.test(assessmentId)) {
      throw new BadRequestException('Mã ID không hợp lệ.');
    }
    await this.ensureStudentEnrolled(courseId, studentId);

    const [assessment, previousSubmissionsCount] = await Promise.all([
      this.prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          courseId,
        },
        include: {
          lesson: {
            select: { id: true, title: true },
          },
          course: {
            select: { id: true, title: true, grade: true },
          },
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              content: true,
              type: true,
              score: true,
              sortOrder: true,
              options: {
                orderBy: { sortOrder: 'asc' },
                select: {
                  id: true,
                  content: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.assessmentSubmission.count({
        where: { assessmentId, studentId },
      }),
    ]);

    if (!assessment) {
      throw new NotFoundException('Đề thi hoặc bài kiểm tra không tồn tại.');
    }

    return {
      assessment: {
        id: assessment.id,
        courseId: assessment.courseId,
        courseTitle: assessment.course.title,
        courseGrade: assessment.course.grade,
        lessonId: assessment.lessonId,
        lessonTitle: assessment.lesson?.title || null,
        title: assessment.title,
        type: assessment.type,
        durationMinutes: assessment.durationMinutes,
        startDate: assessment.startDate,
        dueDate: assessment.dueDate,
        totalQuestions: assessment.questions.length,
        attemptNumber: previousSubmissionsCount + 1,
      },
      questions: assessment.questions,
    };
  }

  /**
   * 3. Học sinh nộp bài thi - Chấm điểm tự động và lưu lịch sử
   */
  async submitAssessment(
    courseId: string,
    assessmentId: string,
    studentId: string,
    data: {
      answers: Array<{
        questionId: string;
        selectedOptionId?: string;
        answerText?: string;
      }>;
    },
  ) {
    if (!UUID_REGEX.test(courseId) || !UUID_REGEX.test(assessmentId)) {
      throw new BadRequestException('Mã ID không hợp lệ.');
    }
    await this.ensureStudentEnrolled(courseId, studentId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, courseId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Đề thi không tồn tại trong khóa học này.');
    }

    const userAnswersMap = new Map<string, { selectedOptionId?: string; answerText?: string }>();
    if (Array.isArray(data?.answers)) {
      for (const ans of data.answers) {
        if (ans?.questionId) {
          userAnswersMap.set(ans.questionId, {
            selectedOptionId: ans.selectedOptionId,
            answerText: ans.answerText,
          });
        }
      }
    }

    let totalRawPossibleScore = 0;
    let earnedRawScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const submissionAnswersData: Array<{
      questionId: string;
      selectedOptionId: string | null;
      answerText: string | null;
      score: number;
    }> = [];

    for (const q of assessment.questions) {
      const qWeight = q.score > 0 ? q.score : 1;
      totalRawPossibleScore += qWeight;

      const userAns = userAnswersMap.get(q.id);
      const rawSelectedOptionId = userAns?.selectedOptionId || null;
      const answerText = userAns?.answerText || null;

      let qScoreEarned = 0;
      let sanitizedSelectedOptionId: string | null = null;

      if (!rawSelectedOptionId && !answerText) {
        skippedCount++;
      } else if (rawSelectedOptionId) {
        const matchingOption = q.options.find((opt) => opt.id === rawSelectedOptionId);
        if (matchingOption) {
          sanitizedSelectedOptionId = matchingOption.id;
          if (matchingOption.isCorrect) {
            qScoreEarned = qWeight;
            earnedRawScore += qWeight;
            correctCount++;
          } else {
            wrongCount++;
          }
        } else {
          // Mã option không thuộc câu hỏi này (dữ liệu rác hoặc giả mạo)
          skippedCount++;
        }
      } else {
        // Trả lời văn bản khi chưa chấm thủ công
        wrongCount++;
      }

      submissionAnswersData.push({
        questionId: q.id,
        selectedOptionId: sanitizedSelectedOptionId,
        answerText,
        score: qScoreEarned,
      });
    }

    // Quy đổi điểm ra thang điểm 10 chuẩn
    const finalScore =
      totalRawPossibleScore > 0
        ? Math.round((earnedRawScore / totalRawPossibleScore) * 10 * 10) / 10
        : 0;

    const now = new Date();

    const { submission, nextAttemptNumber } = await this.prisma.$transaction(async (tx) => {
      const lastSubmission = await tx.assessmentSubmission.findFirst({
        where: { assessmentId, studentId },
        orderBy: { attemptNumber: 'desc' },
        select: { attemptNumber: true },
      });
      const attemptNum = (lastSubmission?.attemptNumber ?? 0) + 1;

      const createdSubmission = await tx.assessmentSubmission.create({
        data: {
          assessmentId,
          studentId,
          attemptNumber: attemptNum,
          score: finalScore,
          submittedAt: now,
          answers: {
            create: submissionAnswersData,
          },
        },
      });

      // Nếu bài tập này gắn liền với 1 lesson và đạt >= 5.0, tự động đánh dấu hoàn thành lesson đó nếu chưa hoàn thành
      if (assessment.lessonId && finalScore >= 5.0) {
        await tx.lessonProgress.upsert({
          where: {
            studentId_lessonId: {
              studentId,
              lessonId: assessment.lessonId,
            },
          },
          create: {
            studentId,
            lessonId: assessment.lessonId,
            isCompleted: true,
            progressPercent: 100,
            completedAt: now,
          },
          update: {
            isCompleted: true,
            progressPercent: 100,
            completedAt: now,
          },
        });

        // Đồng bộ lại tiến độ tổng thể của khóa học vào bảng CourseEnrollment
        const [totalLessons, completedCount] = await Promise.all([
          tx.lesson.count({
            where: { chapter: { courseId } },
          }),
          tx.lessonProgress.count({
            where: {
              studentId,
              lesson: { chapter: { courseId } },
              isCompleted: true,
            },
          }),
        ]);

        const courseProgressPercent =
          totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        await tx.courseEnrollment.updateMany({
          where: { courseId, studentId },
          data: {
            progressPercent: courseProgressPercent,
            completedAt: courseProgressPercent === 100 ? now : null,
          },
        });
      }

      return { submission: createdSubmission, nextAttemptNumber: attemptNum };
    });

    return {
      submissionId: submission.id,
      attemptNumber: nextAttemptNumber,
      score: finalScore,
      totalQuestions: assessment.questions.length,
      correctCount,
      wrongCount,
      skippedCount,
      submittedAt: now,
    };
  }

  /**
   * 4. Xem kết quả chi tiết của lần thi (Đáp án đúng/sai, lời giải chi tiết, file viết tay)
   */
  async getAssessmentResult(
    courseId: string,
    assessmentId: string,
    submissionId: string,
    studentId: string,
  ) {
    if (!UUID_REGEX.test(courseId) || !UUID_REGEX.test(assessmentId) || !UUID_REGEX.test(submissionId)) {
      throw new BadRequestException('Mã ID không hợp lệ.');
    }
    await this.ensureStudentEnrolled(courseId, studentId);

    const submission = await this.prisma.assessmentSubmission.findFirst({
      where: {
        id: submissionId,
        assessmentId,
        assessment: {
          courseId,
        },
      },
      include: {
        assessment: {
          include: {
            course: {
              select: { id: true, title: true, grade: true, teacherId: true },
            },
            lesson: {
              select: { id: true, title: true },
            },
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy kết quả bài thi.');
    }

    // Bảo mật: Chỉ học sinh sở hữu hoặc ADMIN / Giảng viên phụ trách mới được xem kết quả
    if (submission.studentId !== studentId) {
      const user = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });
      const isTeacherOfCourse =
        user?.role === 'TEACHER' && submission.assessment.course.teacherId === studentId;
      if (user?.role !== 'ADMIN' && !isTeacherOfCourse) {
        throw new ForbiddenException('Bạn không có quyền xem kết quả của học sinh khác.');
      }
    }

    const answersMap = new Map<string, (typeof submission.answers)[0]>();
    for (const ans of submission.answers) {
      answersMap.set(ans.questionId, ans);
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const detailedQuestions = submission.assessment.questions.map((q) => {
      const userAns = answersMap.get(q.id);
      const selectedOptionId = userAns?.selectedOptionId || null;
      const isCorrect = userAns ? (userAns.score ?? 0) > 0 : false;

      if (!selectedOptionId) {
        skippedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      return {
        id: q.id,
        content: q.content,
        type: q.type,
        score: q.score,
        sortOrder: q.sortOrder,
        solutionText: q.solutionText,
        solutionFileUrl: q.solutionFileUrl,
        selectedOptionId,
        answerText: userAns?.answerText || null,
        isCorrect,
        options: q.options.map((opt) => ({
          id: opt.id,
          content: opt.content,
          isCorrect: opt.isCorrect,
          sortOrder: opt.sortOrder,
        })),
      };
    });

    return {
      submission: {
        id: submission.id,
        attemptNumber: submission.attemptNumber,
        score: submission.score,
        submittedAt: submission.submittedAt,
        createdAt: submission.createdAt,
      },
      assessment: {
        id: submission.assessment.id,
        courseId: submission.assessment.courseId,
        courseTitle: submission.assessment.course.title,
        lessonId: submission.assessment.lessonId,
        lessonTitle: submission.assessment.lesson?.title || null,
        title: submission.assessment.title,
        type: submission.assessment.type,
        durationMinutes: submission.assessment.durationMinutes,
        totalQuestions: submission.assessment.questions.length,
      },
      stats: {
        totalQuestions: submission.assessment.questions.length,
        correctCount,
        wrongCount,
        skippedCount,
      },
      questions: detailedQuestions,
    };
  }

  /**
   * 5. Lịch sử các lần thi của học sinh cho bài kiểm tra này
   */
  async getAssessmentHistory(courseId: string, assessmentId: string, studentId: string) {
    if (!UUID_REGEX.test(courseId) || !UUID_REGEX.test(assessmentId)) {
      throw new BadRequestException('Mã ID không hợp lệ.');
    }
    await this.ensureStudentEnrolled(courseId, studentId);

    const [submissions, assessment] = await Promise.all([
      this.prisma.assessmentSubmission.findMany({
        where: {
          assessmentId,
          studentId,
        },
        orderBy: {
          attemptNumber: 'desc',
        },
        select: {
          id: true,
          attemptNumber: true,
          score: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.assessment.findFirst({
        where: { id: assessmentId, courseId },
        select: {
          id: true,
          title: true,
          type: true,
          durationMinutes: true,
          _count: {
            select: { questions: true },
          },
        },
      }),
    ]);

    return {
      assessment: assessment
        ? {
            id: assessment.id,
            title: assessment.title,
            type: assessment.type,
            durationMinutes: assessment.durationMinutes,
            totalQuestions: assessment._count.questions,
          }
        : null,
      history: submissions,
    };
  }
}

