import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssessmentType, QuestionType } from '../generated/prisma/enums.js';

export interface AssessmentOptionItem {
  id?: string;
  content: string;
  isCorrect: boolean;
  sortOrder?: number;
}

export interface AssessmentQuestionItem {
  id?: string;
  content: string;
  type?: QuestionType;
  score?: number;
  sortOrder?: number;
  solutionText?: string | null;
  solutionFileUrl?: string | null;
  options?: AssessmentOptionItem[];
}

export interface LecturerAssessmentItem {
  id: string;
  title: string;
  type: AssessmentType;
  courseId: string;
  courseTitle: string;
  lessonId?: string | null;
  lessonTitle?: string | null;
  chapterTitle?: string | null;
  durationMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  status: 'DRAFT' | 'ASSIGNED' | 'CLOSED';
  statusText: string;
  totalScore: number;
  questionCount: number;
  assignedStudentsCount: number;
  submittedCount: number;
  createdAt: string;
  updatedAt: string;
  questions?: AssessmentQuestionItem[];
}

export interface CreateAssessmentDto {
  title?: string;
  type?: AssessmentType;
  courseId?: string;
  lessonId?: string | null;
  durationMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  questions?: AssessmentQuestionItem[];
}

export interface UpdateAssessmentDto {
  title?: string;
  type?: AssessmentType;
  courseId?: string;
  lessonId?: string | null;
  durationMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  questions?: AssessmentQuestionItem[];
}

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
      videoUrl?: string | null;
      content?: string | null;
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
                videoUrl: true,
                content: true,
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
        createdAt: c.createdAt.toISOString(),
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
            videoUrl: l.videoUrl,
            content: l.content,
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
                videoUrl: true,
                content: true,
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
      createdAt: course.createdAt.toISOString(),
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
          videoUrl: l.videoUrl,
          content: l.content,
        })),
      })),
    };
  }

  async getCourseStudents(userId: string, courseId: string, role?: string) {
    const whereCourse =
      role === 'ADMIN'
        ? { id: courseId }
        : { id: courseId, teacherId: userId };

    const course = await this.prisma.course.findFirst({
      where: whereCourse,
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Không tìm thấy khóa học hoặc bạn không có quyền xem khóa học này.',
      );
    }

    return course.enrollments.map((en) => ({
      id: en.student.id,
      fullName: en.student.fullName,
      email: en.student.email,
      avatarUrl: en.student.avatarUrl,
      enrolledAt: en.enrolledAt.toISOString(),
    }));
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

  // ============================================================
  // ASSESSMENTS & ASSIGNMENTS METHODS (DATABASE BACKED)
  // ============================================================

  private computeAssessmentStatus(
    startDate?: Date | null,
    dueDate?: Date | null,
  ): { status: 'DRAFT' | 'ASSIGNED' | 'CLOSED'; statusText: string } {
    const now = new Date();
    if (!startDate && !dueDate) {
      return { status: 'DRAFT', statusText: 'Bản nháp' };
    }
    if (dueDate && now > dueDate) {
      return { status: 'CLOSED', statusText: 'Đã đóng' };
    }
    if (startDate && now < startDate) {
      return { status: 'ASSIGNED', statusText: 'Chưa mở' };
    }
    return { status: 'ASSIGNED', statusText: 'Đang mở' };
  }

  async getAssessments(
    userId: string,
    role?: string,
    courseId?: string,
  ): Promise<LecturerAssessmentItem[]> {
    const whereCourse = role === 'ADMIN' ? {} : { teacherId: userId };

    const teacherCourses = await this.prisma.course.findMany({
      where: courseId ? { ...whereCourse, id: courseId } : whereCourse,
      select: { id: true },
    });
    const allowedCourseIds = teacherCourses.map((c) => c.id);

    if (allowedCourseIds.length === 0) {
      return [];
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId: { in: allowedCourseIds } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            _count: { select: { enrollments: true } },
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: { select: { id: true, title: true } },
          },
        },
        questions: {
          select: { id: true, score: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return assessments.map((a) => {
      const { status, statusText } = this.computeAssessmentStatus(
        a.startDate,
        a.dueDate,
      );
      const totalScore =
        Math.round(
          a.questions.reduce((sum, q) => sum + (q.score || 0), 0) * 100,
        ) / 100;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        courseId: a.courseId,
        courseTitle: a.course.title,
        lessonId: a.lessonId,
        lessonTitle: a.lesson?.title,
        chapterTitle: a.lesson?.chapter?.title,
        durationMinutes: a.durationMinutes,
        startDate: a.startDate ? a.startDate.toISOString() : null,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        status,
        statusText,
        totalScore,
        questionCount: a.questions.length,
        assignedStudentsCount: a.course._count.enrollments,
        submittedCount: a._count.submissions,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });
  }

  async getAssessmentById(
    userId: string,
    assessmentId: string,
    role?: string,
  ): Promise<LecturerAssessmentItem> {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
            _count: { select: { enrollments: true } },
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: { select: { id: true, title: true } },
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!a) {
      throw new NotFoundException('Không tìm thấy bài tập hoặc bài kiểm tra.');
    }

    if (role !== 'ADMIN' && a.course.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem bài tập này.');
    }

    const { status, statusText } = this.computeAssessmentStatus(
      a.startDate,
      a.dueDate,
    );
    const totalScore =
      Math.round(
        a.questions.reduce((sum, q) => sum + (q.score || 0), 0) * 100,
      ) / 100;

    return {
      id: a.id,
      title: a.title,
      type: a.type,
      courseId: a.courseId,
      courseTitle: a.course.title,
      lessonId: a.lessonId,
      lessonTitle: a.lesson?.title,
      chapterTitle: a.lesson?.chapter?.title,
      durationMinutes: a.durationMinutes,
      startDate: a.startDate ? a.startDate.toISOString() : null,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      status,
      statusText,
      totalScore,
      questionCount: a.questions.length,
      assignedStudentsCount: a.course._count.enrollments,
      submittedCount: a._count.submissions,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      questions: a.questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        score: q.score,
        sortOrder: q.sortOrder,
        solutionText: q.solutionText,
        solutionFileUrl: q.solutionFileUrl,
        options: q.options.map((opt) => ({
          id: opt.id,
          content: opt.content,
          isCorrect: opt.isCorrect,
          sortOrder: opt.sortOrder,
        })),
      })),
    };
  }

  async createAssessment(
    userId: string,
    data: CreateAssessmentDto,
    role?: string,
  ): Promise<LecturerAssessmentItem> {
    let targetCourseId = data.courseId;

    if (!targetCourseId) {
      const firstCourse = await this.prisma.course.findFirst({
        where: role === 'ADMIN' ? {} : { teacherId: userId },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstCourse) {
        throw new BadRequestException(
          'Bạn chưa có khóa học nào để tạo bài tập. Vui lòng tạo khóa học trước.',
        );
      }
      targetCourseId = firstCourse.id;
    } else {
      const course = await this.prisma.course.findUnique({
        where: { id: targetCourseId },
      });
      if (!course) {
        throw new NotFoundException('Không tìm thấy khóa học.');
      }
      if (role !== 'ADMIN' && course.teacherId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo bài tập cho khóa học này.',
        );
      }
    }

    const created = await this.prisma.assessment.create({
      data: {
        courseId: targetCourseId,
        lessonId: data.lessonId || null,
        title: data.title?.trim() || 'Bài tập mới',
        type: data.type || AssessmentType.QUIZ,
        durationMinutes: data.durationMinutes
          ? Number(data.durationMinutes)
          : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        questions: data.questions?.length
          ? {
              create: data.questions.map((q, qIdx) => ({
                content: q.content || '',
                type: q.type || QuestionType.SINGLE_CHOICE,
                score: Number(q.score) || 1,
                sortOrder: q.sortOrder ?? qIdx + 1,
                solutionText: q.solutionText || null,
                solutionFileUrl: q.solutionFileUrl || null,
                options: q.options?.length
                  ? {
                      create: q.options.map((opt, optIdx) => ({
                        content: opt.content || '',
                        isCorrect: Boolean(opt.isCorrect),
                        sortOrder: opt.sortOrder ?? optIdx + 1,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
    });

    return this.getAssessmentById(userId, created.id, role);
  }

  async updateAssessment(
    userId: string,
    assessmentId: string,
    data: UpdateAssessmentDto,
    role?: string,
  ): Promise<LecturerAssessmentItem> {
    const existing = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài tập hoặc bài kiểm tra.');
    }
    if (role !== 'ADMIN' && existing.course.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài tập này.');
    }

    if (data.courseId && data.courseId !== existing.courseId) {
      const targetCourse = await this.prisma.course.findUnique({
        where: { id: data.courseId },
      });
      if (!targetCourse) {
        throw new NotFoundException('Khóa học mới không tồn tại.');
      }
      if (role !== 'ADMIN' && targetCourse.teacherId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền chuyển bài sang khóa học này.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          ...(data.title !== undefined
            ? { title: data.title.trim() || 'Bài tập' }
            : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
          ...(data.lessonId !== undefined
            ? { lessonId: data.lessonId || null }
            : {}),
          ...(data.durationMinutes !== undefined
            ? {
                durationMinutes: data.durationMinutes
                  ? Number(data.durationMinutes)
                  : null,
              }
            : {}),
          ...(data.startDate !== undefined
            ? { startDate: data.startDate ? new Date(data.startDate) : null }
            : {}),
          ...(data.dueDate !== undefined
            ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
            : {}),
        },
      });

      if (data.questions !== undefined) {
        await tx.question.deleteMany({
          where: { assessmentId },
        });

        for (let qIdx = 0; qIdx < data.questions.length; qIdx++) {
          const q = data.questions[qIdx];
          await tx.question.create({
            data: {
              assessmentId,
              content: q.content || '',
              type: q.type || QuestionType.SINGLE_CHOICE,
              score: Number(q.score) || 1,
              sortOrder: qIdx + 1,
              solutionText: q.solutionText || null,
              solutionFileUrl: q.solutionFileUrl || null,
              options: q.options?.length
                ? {
                    create: q.options.map((opt, optIdx) => ({
                      content: opt.content || '',
                      isCorrect: Boolean(opt.isCorrect),
                      sortOrder: optIdx + 1,
                    })),
                  }
                : undefined,
            },
          });
        }
      }
    });

    return this.getAssessmentById(userId, assessmentId, role);
  }

  async deleteAssessment(
    userId: string,
    assessmentId: string,
    role?: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { course: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài tập.');
    }
    if (role !== 'ADMIN' && existing.course.teacherId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài tập này.');
    }

    await this.prisma.assessment.delete({
      where: { id: assessmentId },
    });

    return { success: true };
  }
}
