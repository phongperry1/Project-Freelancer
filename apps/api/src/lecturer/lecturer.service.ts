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

export interface MonitoredStudentItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  enrolledAtText: string;
  completedAt?: string | null;
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  assessmentsSubmitted: number;
  totalAssessments: number;
  averageScore: number | null;
  learningStatus: 'COMPLETED' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NOT_STARTED';
  learningStatusText: string;
}

export interface MonitoredStudentsSummary {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  atRiskStudents: number;
  averageProgress: number;
}

export interface MonitoredStudentsResponse {
  summary: MonitoredStudentsSummary;
  students: MonitoredStudentItem[];
}

export interface LessonProgressItem {
  id: string;
  title: string;
  sortOrder: number;
  videoUrl?: string | null;
  durationMinutes?: number | null;
  isCompleted: boolean;
  progressPercent: number;
  completedAt?: string | null;
}

export interface ChapterProgressItem {
  id: string;
  title: string;
  sortOrder: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lessons: LessonProgressItem[];
}

export interface AssessmentProgressItem {
  id: string;
  title: string;
  type: string;
  typeText: string;
  totalScore: number;
  durationMinutes?: number | null;
  attemptsCount: number;
  bestScore: number | null;
  lastSubmittedAt?: string | null;
  status: 'SUBMITTED' | 'PASSED' | 'FAILED' | 'NOT_SUBMITTED';
  statusText: string;
}

export interface StudentProgressDetailResponse {
  student: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  };
  course: {
    id: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
  };
  enrollment: {
    enrolledAt: string;
    enrolledAtText: string;
    completedAt?: string | null;
    progressPercent: number;
    learningStatus: 'COMPLETED' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NOT_STARTED';
    learningStatusText: string;
  };
  metrics: {
    totalLessons: number;
    completedLessons: number;
    lessonsProgressPercent: number;
    totalAssessments: number;
    submittedAssessments: number;
    averageScore: number | null;
    passedAssessments: number;
  };
  chapters: ChapterProgressItem[];
  assessments: AssessmentProgressItem[];
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

  async getMonitoredStudents(
    userId: string,
    role?: string,
    courseId?: string,
  ): Promise<MonitoredStudentsResponse> {
    const whereCourse: { teacherId?: string; id?: string } = {};
    if (role !== 'ADMIN') {
      whereCourse.teacherId = userId;
    }
    if (courseId && courseId !== 'ALL') {
      whereCourse.id = courseId;
    }

    const teacherCourses = await this.prisma.course.findMany({
      where: whereCourse,
      select: {
        id: true,
        title: true,
        chapters: {
          select: {
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: { assessments: true },
        },
      },
    });

    const allowedCourseIds = teacherCourses.map((c) => c.id);
    if (allowedCourseIds.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          activeStudents: 0,
          completedStudents: 0,
          atRiskStudents: 0,
          averageProgress: 0,
        },
        students: [],
      };
    }

    const courseMetaMap = new Map<
      string,
      { title: string; totalLessons: number; totalAssessments: number }
    >();
    for (const c of teacherCourses) {
      const totalLessons = c.chapters.reduce(
        (acc, ch) => acc + (ch._count?.lessons || 0),
        0,
      );
      courseMetaMap.set(c.id, {
        title: c.title,
        totalLessons,
        totalAssessments: c._count.assessments,
      });
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        courseId: { in: allowedCourseIds },
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            phoneNumber: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    if (enrollments.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          activeStudents: 0,
          completedStudents: 0,
          atRiskStudents: 0,
          averageProgress: 0,
        },
        students: [],
      };
    }

    // Extract enrolled student IDs to avoid unconstrained submission queries
    const enrolledStudentIds = Array.from(
      new Set(enrollments.map((en) => en.studentId)),
    );

    // Submissions for assessment metrics scoped to enrolled students and allowed courses
    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: {
        studentId: { in: enrolledStudentIds },
        assessment: {
          courseId: { in: allowedCourseIds },
        },
      },
      select: {
        studentId: true,
        assessmentId: true,
        score: true,
        assessment: {
          select: { courseId: true },
        },
      },
    });

    // Map: key: `${studentId}_${courseId}` -> Map<assessmentId, bestScore>
    // Deduplicates multiple attempts per assessment so assessmentsSubmitted <= totalAssessments
    const studentAssessmentScores = new Map<
      string,
      Map<string, number | null>
    >();
    for (const s of submissions) {
      const key = `${s.studentId}_${s.assessment.courseId}`;
      let assessMap = studentAssessmentScores.get(key);
      if (!assessMap) {
        assessMap = new Map<string, number | null>();
        studentAssessmentScores.set(key, assessMap);
      }

      const existingScore = assessMap.get(s.assessmentId);
      if (s.score !== null && s.score !== undefined) {
        if (
          existingScore === undefined ||
          existingScore === null ||
          s.score > existingScore
        ) {
          assessMap.set(s.assessmentId, s.score);
        }
      } else if (!assessMap.has(s.assessmentId)) {
        assessMap.set(s.assessmentId, null);
      }
    }

    let completedCount = 0;
    let atRiskCount = 0;
    let activeCount = 0;
    let totalProgressSum = 0;

    const students: MonitoredStudentItem[] = enrollments.map((en) => {
      const meta = courseMetaMap.get(en.courseId) || {
        title: en.course.title,
        totalLessons: 0,
        totalAssessments: 0,
      };

      const assessMap = studentAssessmentScores.get(
        `${en.studentId}_${en.courseId}`,
      );
      const assessmentsSubmitted = assessMap ? assessMap.size : 0;

      let averageScore: number | null = null;
      if (assessMap && assessMap.size > 0) {
        let scoredCount = 0;
        let scoreSum = 0;
        for (const score of assessMap.values()) {
          if (score !== null && score !== undefined) {
            scoredCount++;
            scoreSum += score;
          }
        }
        if (scoredCount > 0) {
          averageScore = Math.round((scoreSum / scoredCount) * 10) / 10;
        }
      }

      const progressPercent = Math.min(100, Math.max(0, en.progressPercent || 0));
      totalProgressSum += progressPercent;
      const completedLessonsCount = Math.round(
        (progressPercent / 100) * meta.totalLessons,
      );

      let learningStatus: 'COMPLETED' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NOT_STARTED';
      let learningStatusText: string;

      if (progressPercent >= 100 || en.completedAt) {
        learningStatus = 'COMPLETED';
        learningStatusText = 'Đã hoàn thành';
        completedCount++;
        activeCount++;
      } else if (progressPercent === 0 && assessmentsSubmitted === 0) {
        learningStatus = 'NOT_STARTED';
        learningStatusText = 'Chưa bắt đầu';
      } else if (
        progressPercent < 30 ||
        (averageScore !== null && averageScore < 5.0)
      ) {
        learningStatus = 'NEEDS_ATTENTION';
        learningStatusText = 'Cần nhắc nhở';
        atRiskCount++;
        activeCount++;
      } else {
        learningStatus = 'ON_TRACK';
        learningStatusText = 'Đang học';
        activeCount++;
      }

      const enrolledDate = new Date(en.enrolledAt);
      const enrolledAtText = enrolledDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      return {
        id: en.student.id,
        fullName: en.student.fullName,
        email: en.student.email,
        avatarUrl: en.student.avatarUrl,
        phoneNumber: en.student.phoneNumber,
        courseId: en.courseId,
        courseTitle: meta.title,
        enrolledAt: en.enrolledAt.toISOString(),
        enrolledAtText,
        completedAt: en.completedAt ? en.completedAt.toISOString() : null,
        progressPercent,
        completedLessonsCount,
        totalLessonsCount: meta.totalLessons,
        assessmentsSubmitted,
        totalAssessments: meta.totalAssessments,
        averageScore,
        learningStatus,
        learningStatusText,
      };
    });

    const totalStudents = enrollments.length;
    const averageProgress =
      totalStudents > 0 ? Math.round(totalProgressSum / totalStudents) : 0;

    return {
      summary: {
        totalStudents,
        activeStudents: activeCount,
        completedStudents: completedCount,
        atRiskStudents: atRiskCount,
        averageProgress,
      },
      students,
    };
  }

  async getStudentProgress(
    userId: string,
    studentId: string,
    courseId: string,
    role?: string,
  ): Promise<StudentProgressDetailResponse> {
    if (!studentId || !studentId.trim()) {
      throw new BadRequestException('Mã học sinh (studentId) không được để trống.');
    }
    if (!courseId || !courseId.trim()) {
      throw new BadRequestException('Mã khóa học (courseId) không được để trống.');
    }

    const whereCourse: { teacherId?: string; id?: string } = { id: courseId };
    if (role !== 'ADMIN') {
      whereCourse.teacherId = userId;
    }

    const [course, student, enrollment, chapters, assessments] =
      await Promise.all([
        this.prisma.course.findFirst({
          where: whereCourse,
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            phoneNumber: true,
          },
        }),
        this.prisma.courseEnrollment.findUnique({
          where: {
            courseId_studentId: {
              courseId,
              studentId,
            },
          },
        }),
        this.prisma.chapter.findMany({
          where: { courseId },
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                progresses: {
                  where: { studentId },
                },
              },
            },
          },
        }),
        this.prisma.assessment.findMany({
          where: { courseId },
          orderBy: { createdAt: 'asc' },
          include: {
            submissions: {
              where: { studentId },
              orderBy: { attemptNumber: 'desc' },
            },
          },
        }),
      ]);

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học hoặc bạn không có quyền truy cập.');
    }

    if (!student) {
      throw new NotFoundException('Không tìm thấy thông tin học sinh.');
    }

    let totalLessons = 0;
    let completedLessons = 0;

    const chapterList: ChapterProgressItem[] = chapters.map((ch) => {
      let chCompleted = 0;
      const lessonItems: LessonProgressItem[] = ch.lessons.map((l) => {
        totalLessons++;
        const prog = l.progresses[0];
        const isCompleted = prog?.isCompleted || (prog?.progressPercent ?? 0) >= 100;
        if (isCompleted) {
          completedLessons++;
          chCompleted++;
        }
        return {
          id: l.id,
          title: l.title,
          sortOrder: l.sortOrder,
          videoUrl: l.videoUrl,
          durationMinutes: null,
          isCompleted: Boolean(isCompleted),
          progressPercent: prog ? Math.min(100, Math.max(0, prog.progressPercent)) : 0,
          completedAt: prog?.completedAt ? prog.completedAt.toISOString() : null,
        };
      });

      const chTotal = ch.lessons.length;
      const chPct = chTotal > 0 ? Math.round((chCompleted / chTotal) * 100) : 0;

      return {
        id: ch.id,
        title: ch.title,
        sortOrder: ch.sortOrder,
        totalLessons: chTotal,
        completedLessons: chCompleted,
        progressPercent: chPct,
        lessons: lessonItems,
      };
    });

    let submittedCount = 0;
    let passedCount = 0;
    let totalScoreSum = 0;

    const assessmentList: AssessmentProgressItem[] = assessments.map((a) => {
      const bestScore = a.submissions.reduce<number | null>((max, s) => {
        if (s.score !== null && s.score !== undefined) {
          return max === null ? s.score : Math.max(max, s.score);
        }
        return max;
      }, null);

      const hasSubmitted = a.submissions.length > 0;
      if (hasSubmitted) {
        submittedCount++;
        if (bestScore !== null) {
          totalScoreSum += bestScore;
          if (bestScore >= 5.0) passedCount++;
        }
      }

      const lastSub = a.submissions[0];
      let status: 'SUBMITTED' | 'PASSED' | 'FAILED' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
      let statusText = 'Chưa làm bài';

      if (hasSubmitted) {
        if (bestScore !== null && bestScore >= 5.0) {
          status = 'PASSED';
          statusText = 'Đạt yêu cầu';
        } else if (bestScore !== null && bestScore < 5.0) {
          status = 'FAILED';
          statusText = 'Chưa đạt';
        } else {
          status = 'SUBMITTED';
          statusText = 'Đã nộp bài';
        }
      }

      const typeLabels: Record<string, string> = {
        QUIZ: 'Trắc nghiệm ngắn',
        TEST: 'Bài kiểm tra',
        EXAM: 'Đề thi kết thúc môn',
      };

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        typeText: typeLabels[a.type] || 'Bài tập',
        totalScore: 10,
        durationMinutes: a.durationMinutes,
        attemptsCount: a.submissions.length,
        bestScore: bestScore !== null ? Math.round(bestScore * 10) / 10 : null,
        lastSubmittedAt: lastSub?.submittedAt ? lastSub.submittedAt.toISOString() : null,
        status,
        statusText,
      };
    });

    const averageScore = submittedCount > 0 ? Math.round((totalScoreSum / submittedCount) * 10) / 10 : null;
    const progressPercent = enrollment?.progressPercent ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);

    let learningStatus: 'COMPLETED' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NOT_STARTED' = 'NOT_STARTED';
    let learningStatusText = 'Chưa bắt đầu';

    if (progressPercent >= 100 || enrollment?.completedAt) {
      learningStatus = 'COMPLETED';
      learningStatusText = 'Đã hoàn thành';
    } else if (progressPercent === 0 && submittedCount === 0) {
      learningStatus = 'NOT_STARTED';
      learningStatusText = 'Chưa bắt đầu';
    } else if (progressPercent < 30 || (averageScore !== null && averageScore < 5.0)) {
      learningStatus = 'NEEDS_ATTENTION';
      learningStatusText = 'Cần nhắc nhở';
    } else {
      learningStatus = 'ON_TRACK';
      learningStatusText = 'Đang học';
    }

    const enrolledDate = enrollment ? new Date(enrollment.enrolledAt) : new Date();
    const enrolledAtText = enrolledDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return {
      student,
      course,
      enrollment: {
        enrolledAt: enrollment ? enrollment.enrolledAt.toISOString() : new Date().toISOString(),
        enrolledAtText,
        completedAt: enrollment?.completedAt ? enrollment.completedAt.toISOString() : null,
        progressPercent,
        learningStatus,
        learningStatusText,
      },
      metrics: {
        totalLessons,
        completedLessons,
        lessonsProgressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        totalAssessments: assessments.length,
        submittedAssessments: submittedCount,
        averageScore,
        passedAssessments: passedCount,
      },
      chapters: chapterList,
      assessments: assessmentList,
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

  async getAssessmentResults(
    userId: string,
    assessmentId: string,
    role?: string,
  ) {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            teacherId: true,
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
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
            answers: {
              select: {
                id: true,
                questionId: true,
                selectedOptionId: true,
                answerText: true,
                score: true,
                selectedOption: {
                  select: {
                    id: true,
                    content: true,
                    isCorrect: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
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

    const mappedAssessment: LecturerAssessmentItem = {
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
      assignedStudentsCount: a.course.enrollments.length,
      submittedCount: a.submissions.length,
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

    // Submissions from real database records
    const studentSubmissionMap = new Map<string, typeof a.submissions[0]>();
    for (const sub of a.submissions) {
      if (!studentSubmissionMap.has(sub.studentId)) {
        studentSubmissionMap.set(sub.studentId, sub);
      }
    }

    const enrolledStudents = a.course.enrollments.map((en) => en.student);
    const allStudentIds = new Set<string>();
    const studentList: Array<{ id: string; fullName: string; email: string; avatarUrl?: string | null }> = [];

    for (const st of enrolledStudents) {
      allStudentIds.add(st.id);
      studentList.push(st);
    }

    for (const sub of a.submissions) {
      if (!allStudentIds.has(sub.studentId)) {
        allStudentIds.add(sub.studentId);
        studentList.push(sub.student);
      }
    }

    const submissions = studentList.map((student) => {
      const sub = studentSubmissionMap.get(student.id);

      if (!sub) {
        return {
          id: `unsub-${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          avatarUrl: student.avatarUrl,
          attemptNumber: 0,
          score: 0,
          totalScore,
          percentage: 0,
          correctCount: 0,
          totalQuestions: a.questions.length,
          timeSpentMinutes: 0,
          submittedAt: '--',
          isLate: false,
          status: 'NOT_SUBMITTED' as const,
          statusText: 'Chưa nộp bài',
          gradeTier: 'WEAK' as const,
          gradeTierText: 'Chưa dự thi',
          feedback: '',
          answers: [],
        };
      }

      const studentAnsMap = new Map(sub.answers.map((ans) => [ans.questionId, ans]));

      const answers = a.questions.map((q, qIdx) => {
        const studentAns = studentAnsMap.get(q.id);
        const correctOpt = q.options.find((opt) => opt.isCorrect);
        const isCorrect = studentAns?.selectedOption?.isCorrect ?? false;
        const scoreAwarded =
          studentAns?.score !== null && studentAns?.score !== undefined
            ? studentAns.score
            : isCorrect
            ? q.score
            : 0;

        return {
          questionId: q.id,
          questionNumber: qIdx + 1,
          questionContent: q.content,
          selectedOptionId: studentAns?.selectedOptionId || null,
          selectedOptionContent:
            studentAns?.selectedOption?.content || studentAns?.answerText || null,
          correctOptionId: correctOpt?.id || null,
          correctOptionContent: correctOpt?.content || null,
          isCorrect,
          scoreAwarded,
          questionScore: q.score,
          solutionText: q.solutionText || null,
        };
      });

      const correctCount = answers.filter((ans) => ans.isCorrect).length;
      const finalScore =
        sub.score !== null && sub.score !== undefined
          ? sub.score
          : answers.reduce((sum, ans) => sum + ans.scoreAwarded, 0);
      const roundedScore = Math.round(finalScore * 10) / 10;
      const percentage =
        totalScore > 0 ? Math.round((roundedScore / totalScore) * 100) : 0;

      let gradeTier: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'AVERAGE' | 'WEAK';
      let gradeTierText: string;
      if (roundedScore >= 9.0) {
        gradeTier = 'EXCELLENT';
        gradeTierText = 'Xuất sắc';
      } else if (roundedScore >= 8.0) {
        gradeTier = 'GOOD';
        gradeTierText = 'Giỏi';
      } else if (roundedScore >= 6.5) {
        gradeTier = 'FAIR';
        gradeTierText = 'Khá';
      } else if (roundedScore >= 5.0) {
        gradeTier = 'AVERAGE';
        gradeTierText = 'Trung bình';
      } else {
        gradeTier = 'WEAK';
        gradeTierText = 'Cần cố gắng';
      }

      const isLate =
        a.dueDate && sub.submittedAt
          ? new Date(sub.submittedAt) > new Date(a.dueDate)
          : false;

      return {
        id: sub.id,
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        avatarUrl: student.avatarUrl,
        attemptNumber: sub.attemptNumber,
        score: roundedScore,
        totalScore,
        percentage,
        correctCount,
        totalQuestions: a.questions.length,
        timeSpentMinutes: a.durationMinutes || 0,
        submittedAt: sub.submittedAt
          ? new Date(sub.submittedAt).toLocaleString('vi-VN')
          : 'Đã nộp bài',
        isLate,
        status: 'GRADED' as const,
        statusText: isLate ? 'Nộp muộn' : 'Đã nộp bài',
        gradeTier,
        gradeTierText,
        feedback: '',
        answers,
      };
    });

    const submittedSubmissions = submissions.filter((s) => s.status === 'GRADED');
    const totalStudents = studentList.length;
    const submittedCount = submittedSubmissions.length;
    const unsubmittedCount = totalStudents - submittedCount;
    const submissionRate =
      totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

    const scores = submittedSubmissions.map((s) => s.score);
    const averageScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, sc) => sum + sc, 0) / scores.length) * 100,
          ) / 100
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    let passedCount = 0;
    let failedCount = 0;
    let distExcellent = 0;
    let distGood = 0;
    let distFair = 0;
    let distAverage = 0;
    let distWeak = 0;

    for (const s of submittedSubmissions) {
      if (s.score >= 5.0) {
        passedCount++;
      } else {
        failedCount++;
      }

      if (s.score >= 9.0) distExcellent++;
      else if (s.score >= 8.0) distGood++;
      else if (s.score >= 6.5) distFair++;
      else if (s.score >= 5.0) distAverage++;
      else distWeak++;
    }

    const passRate =
      submittedCount > 0 ? Math.round((passedCount / submittedCount) * 100) : 0;

    const gradeDistribution = [
      {
        range: '9.0 - 10.0',
        label: 'Xuất sắc',
        count: distExcellent,
        percent:
          submittedCount > 0
            ? Math.round((distExcellent / submittedCount) * 100)
            : 0,
        color: '#10b981',
      },
      {
        range: '8.0 - 8.9',
        label: 'Giỏi',
        count: distGood,
        percent:
          submittedCount > 0
            ? Math.round((distGood / submittedCount) * 100)
            : 0,
        color: '#1d68f2',
      },
      {
        range: '6.5 - 7.9',
        label: 'Khá',
        count: distFair,
        percent:
          submittedCount > 0
            ? Math.round((distFair / submittedCount) * 100)
            : 0,
        color: '#06b6d4',
      },
      {
        range: '5.0 - 6.4',
        label: 'Trung bình',
        count: distAverage,
        percent:
          submittedCount > 0
            ? Math.round((distAverage / submittedCount) * 100)
            : 0,
        color: '#f59e0b',
      },
      {
        range: '< 5.0',
        label: 'Cần cố gắng',
        count: distWeak,
        percent:
          submittedCount > 0
            ? Math.round((distWeak / submittedCount) * 100)
            : 0,
        color: '#ef4444',
      },
    ];

    // Single-pass question statistics aggregation: O(S * A + Q) instead of O(Q * S * A)
    const questionStatMap = new Map<string, { correct: number; total: number }>();
    for (const sub of submittedSubmissions) {
      for (const ans of sub.answers) {
        let stat = questionStatMap.get(ans.questionId);
        if (!stat) {
          stat = { correct: 0, total: 0 };
          questionStatMap.set(ans.questionId, stat);
        }
        stat.total += 1;
        if (ans.isCorrect) stat.correct += 1;
      }
    }

    const questionStats = a.questions.map((q, qIdx) => {
      const stat = questionStatMap.get(q.id) || { correct: 0, total: 0 };
      const correctAttempts = stat.correct;
      const totalAttempts = stat.total;

      const correctRate =
        totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
      let difficultyText = 'Vừa sức';

      if (correctRate >= 80) {
        difficulty = 'EASY';
        difficultyText = 'Dễ - Nắm vững';
      } else if (correctRate < 50) {
        difficulty = 'HARD';
        difficultyText = 'Khó - Cần ôn tập lại';
      }

      return {
        questionId: q.id,
        questionNumber: qIdx + 1,
        content: q.content,
        score: q.score,
        type: q.type,
        correctCount: correctAttempts,
        totalAttempts,
        correctRate,
        difficulty,
        difficultyText,
      };
    });

    return {
      assessment: mappedAssessment,
      totalStudents,
      submittedCount,
      unsubmittedCount,
      submissionRate,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      passedCount,
      failedCount,
      gradeDistribution,
      questionStats,
      submissions,
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
