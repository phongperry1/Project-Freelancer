import {
    AlertCircle,
    ArrowRight,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardPaste,
    FileText,
    FlaskConical,
    GraduationCap,
    Home,
    KeyRound,
    Layers,
    Lock,
    PlayCircle,
    RefreshCw,
    Share2,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '../../components/common/EmptyState';
import { Footer } from '../../components/common/Footer';
import { Navbar } from '../../components/common/Navbar';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';
import {
    courseService,
    type PublicCourseDetailResponse,
} from '../../services/course.service';

import './courseDetail.css';

function getGradeLabel(grade: PublicCourseDetailResponse['grade']): string {
  switch (grade) {
    case '10':
      return 'Hóa học Lớp 10';
    case '11':
      return 'Hóa học Lớp 11';
    case '12':
      return 'Hóa học Lớp 12';
    case 'exam':
      return 'Luyện thi THPT Quốc Gia';
    case 'other':
      return 'Chuyên đề học thuật';
    default:
      return 'Chương trình Hóa học';
  }
}

function getCategoryIcon(grade: PublicCourseDetailResponse['grade']) {
  switch (grade) {
    case '10':
      return BookOpen;
    case '11':
      return FlaskConical;
    case '12':
      return GraduationCap;
    case 'exam':
      return Sparkles;
    case 'other':
      return Layers;
    default:
      return BookOpen;
  }
}

function getCourseDefaultSubtitle(
  grade: PublicCourseDetailResponse['grade'],
  customDesc?: string | null,
): string {
  if (customDesc && customDesc.trim()) return customDesc.trim();
  switch (grade) {
    case '10':
      return 'Nền tảng Hóa học THPT: Cấu tạo nguyên tử, Bảng tuần hoàn các nguyên tố, Liên kết hóa học và Phản ứng oxi hóa - khử theo chuẩn GDPT mới.';
    case '11':
      return 'Kiến thức trọng tâm nâng cao: Cân bằng hóa học, Thuyết điện li, Nhóm Nitơ - Lưu huỳnh và Mở đầu Hóa học hữu cơ chuyên sâu.';
    case '12':
      return 'Khung kiến thức then chốt tốt nghiệp THPT: Este - Lipit, Cacbohiđrat, Amin - Amino axit - Peptit, Polime và Kim loại.';
    case 'exam':
      return 'Chuyên đề bứt phá điểm 9+, rèn luyện kỹ năng giải nhanh trắc nghiệm và thực chiến phòng thi với bộ đề thi chuẩn cấu trúc ma trận Bộ GD&ĐT.';
    case 'other':
    default:
      return 'Các khóa học chuyên biệt về phương pháp giải bài tập định lượng, thí nghiệm hóa học mô phỏng và kỹ năng bồi dưỡng học sinh giỏi.';
  }
}

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [course, setCourse] = useState<PublicCourseDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Quản lý trạng thái đóng/mở của từng chương (khi đã ghi danh)
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [imageFailed, setImageFailed] = useState<boolean>(false);

  // Quản lý trạng thái ghi danh của học sinh (đồng bộ khi id thay đổi)
  const [prevId, setPrevId] = useState(id);
  const [hasEnrolledKey, setHasEnrolledKey] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && id) {
      return localStorage.getItem(`tku_enrolled_${id}`) === 'true';
    }
    return false;
  });
  const isEnrolled = isAuthenticated && hasEnrolledKey;

  // Quản lý modal nhập mã key kích hoạt (Admin tạo key dùng 1 lần)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [activationKey, setActivationKey] = useState<string>('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  if (id !== prevId) {
    setPrevId(id);
    setImageFailed(false);
    setIsKeyModalOpen(false);
    setActivationKey('');
    setKeyError(null);
    setIsActivating(false);
    setHasEnrolledKey(
      typeof window !== 'undefined' && id
        ? localStorage.getItem(`tku_enrolled_${id}`) === 'true'
        : false,
    );
  }

  // Lắng nghe phím Escape và khóa cuộn nền khi modal mở
  useEffect(() => {
    if (!isKeyModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsKeyModalOpen(false);
        setKeyError(null);
        setActivationKey('');
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isKeyModalOpen]);

  // Cuộn lên đầu trang khi chuyển khóa học
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Tải dữ liệu chi tiết khóa học thật từ Backend API
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    courseService
      .getPublicCourseById(id)
      .then((data) => {
        if (isMounted) {
          setCourse(data);
          document.title = `${data.title} | TKU E-Learning`;

          // Mặc định mở chương đầu tiên khi học sinh đã ghi danh
          if (data.chapters && data.chapters.length > 0) {
            setOpenChapters({ [data.chapters[0].id]: true });
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error('Lỗi tải chi tiết khóa học:', err);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin khóa học từ máy chủ. Vui lòng thử lại sau.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, refreshTrigger]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Chuyển đổi trạng thái đóng / mở một chương (khi đã ghi danh)
  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }, []);

  // Mở rộng tất cả hoặc thu gọn tất cả các chương
  const areAllExpanded = useMemo(() => {
    if (!course || course.chapters.length === 0) return false;
    return course.chapters.every((ch) => openChapters[ch.id]);
  }, [course, openChapters]);

  const toggleAllChapters = useCallback(() => {
    if (!course) return;
    if (areAllExpanded) {
      setOpenChapters({});
    } else {
      const allOpen: Record<string, boolean> = {};
      course.chapters.forEach((ch) => {
        allOpen[ch.id] = true;
      });
      setOpenChapters(allOpen);
    }
  }, [course, areAllExpanded]);

  // Hành động chia sẻ khóa học
  const handleShareCourse = useCallback(() => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast.success('Đã sao chép liên kết khóa học vào bộ nhớ tạm!');
      })
      .catch(() => {
        toast.info(`Liên kết khóa học: ${window.location.href}`);
      });
  }, []);

  // Đóng modal kích hoạt
  const handleCloseModal = useCallback(() => {
    if (isActivating) return;
    setIsKeyModalOpen(false);
    setKeyError(null);
    setActivationKey('');
  }, [isActivating]);

  // Hành động kích hoạt / Tham gia khóa học
  const handleEnroll = useCallback(() => {
    if (isEnrolled) {
      // Đã kích hoạt -> Khám phá bài học đầu tiên
      const firstChapterWithLesson = course?.chapters?.find(
        (ch) => ch.lessons && ch.lessons.length > 0,
      );
      const firstLesson = firstChapterWithLesson?.lessons?.[0];
      if (firstLesson) {
        toast.info(`Bắt đầu bài học: "${firstLesson.title}". Chúc bạn học tốt!`);
      } else {
        toast.info('Khóa học này hiện chưa có bài giảng nào được đăng tải.');
      }
      return;
    }

    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập tài khoản học sinh để nhập mã Key tham gia khóa học.');
      navigate(`/login?redirect=/courses/${id}`);
      return;
    }

    // Mở modal nhập mã Key kích hoạt
    setKeyError(null);
    setActivationKey('');
    setIsKeyModalOpen(true);
  }, [course, isAuthenticated, isEnrolled, navigate, id]);

  // Kiểm tra trạng thái ghi danh thực tế từ Backend Database
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let isMounted = true;

    courseService
      .checkMyEnrollment(id)
      .then((res) => {
        if (isMounted) {
          if (res.isEnrolled) {
            setHasEnrolledKey(true);
            localStorage.setItem(`tku_enrolled_${id}`, 'true');
          } else {
            setHasEnrolledKey(false);
            localStorage.removeItem(`tku_enrolled_${id}`);
          }
        }
      })
      .catch(() => {
        // Silent catch
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated]);

  // Xử lý xác nhận kích hoạt mã Key thật qua API Backend
  const handleActivateWithKey = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id) return;
      const cleanKey = activationKey.trim().toUpperCase();

      if (!cleanKey) {
        setKeyError('Vui lòng nhập mã Key được cấp bởi Quản trị viên.');
        return;
      }

      if (cleanKey.length < 6) {
        setKeyError('Mã Key kích hoạt không hợp lệ (độ dài tối thiểu 6 ký tự).');
        return;
      }

      setIsActivating(true);
      setKeyError(null);

      try {
        const result = await courseService.enrollWithKey(id, cleanKey);
        setIsActivating(false);
        setHasEnrolledKey(true);
        localStorage.setItem(`tku_enrolled_${id}`, 'true');
        setIsKeyModalOpen(false);
        setActivationKey('');
        toast.success(
          result.message || 'Kích hoạt khóa học thành công! Toàn bộ nội dung bài giảng chi tiết đã được mở khóa.',
        );
      } catch (err: unknown) {
        setIsActivating(false);
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể kích hoạt mã key. Vui lòng kiểm tra lại.';
        setKeyError(msg);
        toast.error(msg);
      }
    },
    [activationKey, id],
  );

  // Dán mã key nhanh từ bộ nhớ tạm
  const handlePasteKey = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setActivationKey(text.trim().toUpperCase());
        setKeyError(null);
        toast.info('Đã dán mã Key từ bộ nhớ tạm!');
      }
    } catch {
      toast.info('Vui lòng cho phép truy cập bộ nhớ tạm hoặc tự nhập mã.');
    }
  }, []);

  const handleStartLesson = useCallback((lessonTitle: string) => {
    toast.info(`Đang mở bài học: "${lessonTitle}". Chúc bạn có buổi học hiệu quả!`);
  }, []);

  const teacherFullName = course?.teacher?.fullName;
  const teacherInitials = useMemo(() => {
    if (!teacherFullName) return 'GV';
    const parts = teacherFullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [teacherFullName]);

  const hasValidThumbnail =
    Boolean(course?.thumbnailUrl) &&
    course?.thumbnailUrl?.trim() !== '' &&
    !imageFailed;

  const courseCreatedAt = course?.createdAt;
  const formattedCreatedDate = useMemo(() => {
    if (!courseCreatedAt) return '';
    try {
      return new Date(courseCreatedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [courseCreatedAt]);

  return (
    <div className="tku-course-detail-page">
      <Navbar />

      <main>
        {isLoading ? (
          // Skeleton Loading State
          <div className="tku-cd-hero tku-cd-skeleton-hero">
            <div className="tku-container">
              <div className="tku-cd-skeleton-line" style={{ width: '220px', height: '18px', marginBottom: '24px' }} />
              <div className="tku-cd-skeleton-line" style={{ width: '120px', height: '28px', marginBottom: '16px', borderRadius: '999px' }} />
              <div className="tku-cd-skeleton-line" style={{ width: '65%', height: '38px', marginBottom: '16px' }} />
              <div className="tku-cd-skeleton-line" style={{ width: '45%', height: '18px', marginBottom: '24px' }} />
              <div className="tku-cd-skeleton-line" style={{ width: '380px', height: '32px' }} />
            </div>
          </div>
        ) : errorMessage ? (
          // Error State
          <div style={{ padding: '60px 0' }}>
            <div className="tku-cd-container">
              <div className="tku-empty-state" role="alert">
                <div className="tku-empty-state__icon-wrapper" style={{ color: '#ef4444' }}>
                  <AlertCircle size={44} />
                </div>
                <h2 className="tku-empty-state__title">Không thể tải thông tin khóa học</h2>
                <p className="tku-empty-state__desc">{errorMessage}</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={handleRetry} className="tku-empty-state__btn">
                    <RefreshCw size={16} />
                    <span>Thử lại</span>
                  </button>
                  <Link to="/" className="tku-btn tku-btn--outline">
                    Về trang chủ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : !course ? (
          // Not Found State
          <div style={{ padding: '60px 0' }}>
            <div className="tku-cd-container">
              <EmptyState
                title="Khóa học không tồn tại hoặc đã bị ẩn"
                description="Khóa học bạn đang tìm kiếm không tồn tại hoặc đã được giảng viên tạm dừng phát hành."
                actionText="Quay lại trang chủ"
                onAction={() => navigate('/')}
              />
            </div>
          </div>
        ) : (
          // Success State: Render Course Detail
          <>
            {/* HERO SECTION */}
            {(() => {
              const CategoryIcon = getCategoryIcon(course.grade);
              const heroThemeClass = isEnrolled
                ? 'tku-cd-hero--enrolled'
                : 'tku-cd-hero--unenrolled';

              return (
                <section className={`tku-cd-hero ${heroThemeClass}`}>
                  <div className="tku-container">
                    {/* Breadcrumbs Trail Nằm Trong Hero Banner Tinh Tế */}
                    <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
                      <Link to="/" className="tku-hero-breadcrumb-link">
                        <Home size={14} />
                        <span>Trang chủ</span>
                      </Link>
                      <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                      <Link to="/courses" className="tku-hero-breadcrumb-link">
                        <span>Danh mục tất cả khóa học</span>
                      </Link>
                      <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                      {isEnrolled ? (
                        <>
                          <Link to="/courses/category/my-courses" className="tku-hero-breadcrumb-link">
                            <span>Khóa học của tôi</span>
                          </Link>
                          <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                        </>
                      ) : (
                        <>
                          <Link to={`/courses/category/${course.grade}`} className="tku-hero-breadcrumb-link">
                            <span>{getGradeLabel(course.grade)}</span>
                          </Link>
                          <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                        </>
                      )}
                      <span className="tku-hero-breadcrumb-current">{course.title}</span>
                    </nav>
                    {/* Hero Content */}
                    <div className="tku-cd-hero__info">
                      {/* Badges Capsule Đồng Bộ Chuẩn 2 Viên Thuốc */}
                      {isEnrolled ? (
                        <div className="tku-cd-hero__badge-row">
                          <span className="tku-cd-hero__badge tku-cd-hero__badge--enrolled">
                            <CheckCircle2 size={14} />
                            <span>Khóa học của tôi</span>
                          </span>
                          <span className="tku-cd-hero__count-pill">
                            Đã tham gia
                          </span>
                        </div>
                      ) : (
                        <div className="tku-cd-hero__badge-row">
                          <span className="tku-cd-hero__badge">
                            <CategoryIcon size={14} />
                            <span>{getGradeLabel(course.grade)}</span>
                          </span>
                          <span className="tku-cd-hero__count-pill">
                            {course.lessonCount > 0 ? `${course.lessonCount} bài giảng` : '1 khóa học'}
                          </span>
                        </div>
                      )}

                      {/* Course Title */}
                      <h1 className="tku-cd-hero__title">{course.title}</h1>

                      {/* Subtitle / Description - Luôn hiển thị văn bản học thuật chuẩn chỉ */}
                      <p className="tku-cd-hero__desc">
                        {getCourseDefaultSubtitle(course.grade, course.description)}
                      </p>

                      {/* Quick Stats Bar */}
                      <div className="tku-cd-hero__stats">
                        <div className="tku-cd-hero__teacher">
                          {course.teacher.avatarUrl ? (
                            <img
                              src={course.teacher.avatarUrl}
                              alt={course.teacher.fullName}
                              className="tku-cd-hero__teacher-avatar"
                            />
                          ) : (
                            <div className="tku-cd-hero__teacher-fallback">
                              {teacherInitials}
                            </div>
                          )}
                          <span>{course.teacher.fullName}</span>
                        </div>

                        <div className="tku-cd-hero__stat-item">
                          <Calendar size={14} />
                          <span>{formattedCreatedDate || 'Cập nhật gần đây'}</span>
                        </div>

                        <div className="tku-cd-hero__stat-item">
                          <BookOpen size={14} />
                          <span>{course.lessonCount} bài giảng</span>
                        </div>

                        <div className="tku-cd-hero__stat-item">
                          <Layers size={14} />
                          <span>{course.chapterCount} chương mục</span>
                        </div>

                        <div className="tku-cd-hero__stat-item">
                          <GraduationCap size={14} />
                          <span>{course.studentCount} học viên đã tham gia</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* MAIN TWO-COLUMN BODY */}
            <div className="tku-cd-body">
              <div className="tku-cd-container">
                <div className="tku-cd-layout">
                  {/* LEFT COLUMN: Main Content */}
                  <div className="tku-cd-content-col">
                    {/* 1. Giới thiệu khóa học (Dữ liệu thật từ description) */}
                    <section className="tku-cd-card" aria-labelledby="desc-heading">
                      <h2 id="desc-heading" className="tku-cd-card__title">
                        <FileText size={20} />
                        <span>Mô tả khóa học</span>
                      </h2>
                      {course.description?.trim() ? (
                        <p className="tku-cd-desc-text">{course.description}</p>
                      ) : (
                        <p className="tku-cd-desc-empty">
                          Giảng viên chưa cập nhật thông tin mô tả chi tiết cho khóa học này.
                        </p>
                      )}
                    </section>

                    {/* 2. Nội dung chương trình học (Tóm tắt khi CHƯA tham gia, Chi tiết khi ĐÃ tham gia) */}
                    <section className="tku-cd-card" aria-labelledby="curriculum-heading">
                      {isEnrolled ? (
                        // ==========================================
                        // KHI ĐÃ THAM GIA: HIỂN THỊ ĐẦY ĐỦ BÀI HỌC CHI TIẾT
                        // ==========================================
                        <>
                          {/* Banner chào mừng học sinh */}
                          <div className="tku-cd-enrolled-banner">
                            <CheckCircle2 size={20} />
                            <div>
                              <strong>Bạn đã kích hoạt khóa học này!</strong> Toàn bộ bài giảng đã được mở khóa. Hãy chọn một bài học bên dưới để bắt đầu.
                            </div>
                          </div>

                          <div className="tku-cd-curriculum-header">
                            <div>
                              <h2 id="curriculum-heading" className="tku-cd-card__title" style={{ margin: 0 }}>
                                <BookOpen size={20} />
                                <span>Lộ trình bài giảng chi tiết</span>
                              </h2>
                              <span className="tku-cd-curriculum-summary">
                                {course.chapterCount} chương mục · {course.lessonCount} bài giảng
                              </span>
                            </div>

                            {course.chapters.length > 0 && (
                              <button
                                type="button"
                                onClick={toggleAllChapters}
                                className="tku-cd-expand-all-btn"
                              >
                                {areAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                              </button>
                            )}
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="tku-cd-chapter-list">
                              {course.chapters.map((chapter, index) => {
                                const isOpen = Boolean(openChapters[chapter.id]);

                                return (
                                  <div
                                    key={chapter.id}
                                    className={`tku-cd-chapter ${isOpen ? 'is-open' : ''}`}
                                  >
                                    <button
                                      type="button"
                                      className="tku-cd-chapter-trigger"
                                      onClick={() => toggleChapter(chapter.id)}
                                      aria-expanded={isOpen}
                                    >
                                      <div className="tku-cd-chapter-title-group">
                                        <span className="tku-cd-chapter-chevron">
                                          <ChevronDown size={18} />
                                        </span>
                                        <span className="tku-cd-chapter-title">
                                          Chương {index + 1}: {chapter.title}
                                        </span>
                                      </div>

                                      <div className="tku-cd-chapter-meta">
                                        <span>{chapter.lessons.length} bài học</span>
                                      </div>
                                    </button>

                                    {isOpen && (
                                      <ul className="tku-cd-lesson-list">
                                        {chapter.lessons.length > 0 ? (
                                          chapter.lessons.map((lesson, lessonIndex) => (
                                            <li key={lesson.id} className="tku-cd-lesson-item">
                                              <div className="tku-cd-lesson-left">
                                                <PlayCircle size={16} className="tku-cd-lesson-icon" />
                                                <span className="tku-cd-lesson-title">
                                                  Bài {lessonIndex + 1}: {lesson.title}
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleStartLesson(lesson.title)}
                                                className="tku-cd-lesson-action-btn"
                                              >
                                                Vào học
                                              </button>
                                            </li>
                                          ))
                                        ) : (
                                          <li className="tku-cd-lesson-item" style={{ color: '#94a3b8' }}>
                                            <div className="tku-cd-lesson-left">
                                              <FileText size={16} />
                                              <span>Nội dung bài học đang được hoàn thiện.</span>
                                            </div>
                                          </li>
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p style={{ color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                              Khóa học hiện chưa có chương mục nào.
                            </p>
                          )}
                        </>
                      ) : (
                        // ==========================================
                        // KHI CHƯA THAM GIA: CHỈ TÓM TẮT CÁC CHUYÊN ĐỀ SẼ HỌC
                        // ==========================================
                        <>
                          <div className="tku-cd-summary-header">
                            <h2 id="curriculum-heading" className="tku-cd-card__title">
                              <BookOpen size={20} />
                              <span>Tóm tắt nội dung khóa học</span>
                            </h2>
                            <p className="tku-cd-summary-subtitle">
                              Khóa học được chia thành {course.chapterCount} chương mục chính với tổng cộng {course.lessonCount} bài học trọng tâm:
                            </p>
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="tku-cd-chapter-summary-list">
                              {course.chapters.map((chapter, index) => (
                                <div key={chapter.id} className="tku-cd-chapter-summary-item">
                                  <div className="tku-cd-chapter-summary-left">
                                    <span className="tku-cd-chapter-num-badge">
                                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                    </span>
                                    <span className="tku-cd-chapter-summary-title" title={chapter.title}>
                                      {chapter.title}
                                    </span>
                                  </div>

                                  <div className="tku-cd-chapter-summary-right">
                                    <span>{chapter.lessons.length} bài học</span>
                                    <Lock size={15} className="tku-cd-chapter-lock-icon" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                              Giảng viên đang cập nhật danh sách chương mục cho khóa học này.
                            </p>
                          )}

                          {/* Hộp thông báo khóa bài giảng chi tiết (Đã loại bỏ nút CTA thừa) */}
                          <div className="tku-cd-locked-notice">
                            <div className="tku-cd-locked-notice-icon">
                              <Lock size={20} />
                            </div>
                            <div>
                              <h3 className="tku-cd-locked-notice-title">
                                Nội dung bài giảng chi tiết đang được khóa
                              </h3>
                              <p className="tku-cd-locked-notice-desc">
                                Khóa học yêu cầu mã Key từ Quản trị viên để kích hoạt và mở khóa toàn bộ bài giảng video, bài tập và tài liệu học tập của từng chương.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </section>

                    {/* 3. Giảng viên phụ trách (Dữ liệu thật 100%) */}
                    <section className="tku-cd-card" aria-labelledby="instructor-heading">
                      <h2 id="instructor-heading" className="tku-cd-card__title">
                        <Users size={20} />
                        <span>Giảng viên phụ trách</span>
                      </h2>

                      <div className="tku-cd-instructor-card">
                        <div className="tku-cd-instructor-avatar-wrap">
                          {course.teacher.avatarUrl ? (
                            <img
                              src={course.teacher.avatarUrl}
                              alt={course.teacher.fullName}
                              className="tku-cd-instructor-avatar"
                            />
                          ) : (
                            <div className="tku-cd-instructor-avatar-fallback">
                              {teacherInitials}
                            </div>
                          )}
                        </div>

                        <div className="tku-cd-instructor-info">
                          <h3 className="tku-cd-instructor-name">{course.teacher.fullName}</h3>
                          <span className="tku-cd-instructor-role">
                            Giảng viên phụ trách môn học · TKU E-Learning
                          </span>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* RIGHT COLUMN: Sticky Enrollment Sidebar */}
                  <aside className="tku-cd-sidebar-col">
                    <div className="tku-cd-sidebar-sticky">
                      <div className="tku-cd-enroll-card">
                        {/* Thumbnail Preview (Dữ liệu thật / Fallback học thuật) */}
                        <div className="tku-cd-enroll-thumb">
                          {hasValidThumbnail ? (
                            <img
                              src={course.thumbnailUrl!}
                              alt={course.title}
                              className="tku-cd-enroll-thumb-img"
                              onError={() => setImageFailed(true)}
                            />
                          ) : (
                            <div className="tku-cd-enroll-fallback">
                              <FlaskConical size={34} className="tku-cd-fallback-icon" />
                              <span className="tku-cd-fallback-brand">TKU E-Learning</span>
                              <span className="tku-cd-fallback-course-title" title={course.title}>
                                {course.title}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="tku-cd-enroll-body">
                          {/* CTA Button */}
                          <button
                            type="button"
                            onClick={handleEnroll}
                            className={`tku-cd-enroll-btn ${isEnrolled ? 'tku-cd-enroll-btn--enrolled' : ''}`}
                          >
                            {isEnrolled ? (
                              <>
                                <CheckCircle2 size={18} />
                                <span>Vào học ngay</span>
                              </>
                            ) : (
                              <>
                                <KeyRound size={18} />
                                <span>Nhập mã Key</span>
                                <ArrowRight size={18} />
                              </>
                            )}
                          </button>

                          {/* Bảng thông tin thực tế từ Database */}
                          <h4 className="tku-cd-meta-table-title">Thông tin khóa học:</h4>
                          <div className="tku-cd-meta-table">
                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <Layers size={15} />
                                <span>Số chương mục</span>
                              </span>
                              <span className="tku-cd-meta-value">{course.chapterCount} chương</span>
                            </div>

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <BookOpen size={15} />
                                <span>Số bài giảng</span>
                              </span>
                              <span className="tku-cd-meta-value">{course.lessonCount} bài</span>
                            </div>

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <Users size={15} />
                                <span>Học viên tham gia</span>
                              </span>
                              <span className="tku-cd-meta-value">{course.studentCount} học viên</span>
                            </div>

                            {formattedCreatedDate && (
                              <div className="tku-cd-meta-row">
                                <span className="tku-cd-meta-label">
                                  <Calendar size={15} />
                                  <span>Ngày phát hành</span>
                                </span>
                                <span className="tku-cd-meta-value">{formattedCreatedDate}</span>
                              </div>
                            )}

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <GraduationCap size={15} />
                                <span>Giảng viên</span>
                              </span>
                              <span className="tku-cd-meta-value" title={course.teacher.fullName}>
                                {course.teacher.fullName}
                              </span>
                            </div>
                          </div>

                          {/* Share Button */}
                          <button
                            type="button"
                            onClick={handleShareCourse}
                            className="tku-cd-share-btn"
                          >
                            <Share2 size={16} />
                            <span>Chia sẻ khóa học</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>

            {/* MOBILE STICKY BOTTOM BAR */}
            <div className="tku-cd-mobile-bar" aria-label="Thanh kích hoạt nhanh trên điện thoại">
              <div className="tku-cd-mobile-info">
                <span className="tku-cd-mobile-title">{course.title}</span>
                <span className="tku-cd-mobile-price" style={{ color: isEnrolled ? '#10b981' : '#d97706' }}>
                  {isEnrolled ? 'Đã kích hoạt' : 'Yêu cầu mã Key'} · {course.lessonCount} bài học
                </span>
              </div>
              <button
                type="button"
                onClick={handleEnroll}
                className={`tku-cd-mobile-btn ${isEnrolled ? 'tku-cd-mobile-btn--enrolled' : ''}`}
              >
                {isEnrolled ? 'Vào học ngay' : 'Nhập mã Key'}
              </button>
            </div>

            {/* MODAL NHẬP MÃ KEY KÍCH HOẠT (ADMIN TẠO KEY DÙNG 1 LẦN) */}
            {isKeyModalOpen && (
              <div
                className="tku-cd-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tku-modal-key-title"
                onClick={handleCloseModal}
              >
                <div
                  className="tku-cd-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="tku-cd-modal-header">
                    <div className="tku-cd-modal-header-left">
                      <div className="tku-cd-modal-icon">
                        <KeyRound size={20} />
                      </div>
                      <div>
                        <h3 id="tku-modal-key-title" className="tku-cd-modal-title">
                          Kích hoạt khóa học
                        </h3>
                        <p className="tku-cd-modal-subtitle">
                          Nhập mã key để mở khóa toàn bộ bài giảng
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="tku-cd-modal-close-btn"
                      aria-label="Đóng cửa sổ"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleActivateWithKey}>
                    <div className="tku-cd-modal-body">
                      {/* Course Capsule */}
                      <div className="tku-cd-modal-course-capsule">
                        <div className="tku-cd-modal-capsule-badge">
                          <GraduationCap size={13} />
                          <span>Khóa học</span>
                        </div>
                        <span className="tku-cd-modal-capsule-name">{course.title}</span>
                      </div>

                      {/* Input Group */}
                      <div className="tku-cd-modal-form-group">
                        <div className="tku-cd-modal-label-row">
                          <label htmlFor="tku-activation-key-input" className="tku-cd-modal-label">
                            Mã Key tham gia (dùng 1 lần):
                          </label>
                          <span className="tku-cd-modal-sublabel">VD: TKU-CHEM-XXXX-YYYY</span>
                        </div>

                        <div className={`tku-cd-modal-hero-input-wrap ${keyError ? 'tku-cd-modal-hero-input-wrap--error' : ''}`}>
                          <div className="tku-cd-modal-input-icon-box" aria-hidden="true">
                            <KeyRound size={17} />
                          </div>
                          <input
                            id="tku-activation-key-input"
                            type="text"
                            autoFocus
                            value={activationKey}
                            onChange={(e) => {
                              setActivationKey(e.target.value.toUpperCase());
                              if (keyError) setKeyError(null);
                            }}
                            placeholder="TKU-CHEM-8X92-KL41"
                            className="tku-cd-modal-hero-input"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={isActivating}
                          />
                          {activationKey && (
                            <button
                              type="button"
                              onClick={() => {
                                setActivationKey('');
                                if (keyError) setKeyError(null);
                              }}
                              className="tku-cd-modal-clear-btn"
                              title="Xóa mã"
                              disabled={isActivating}
                            >
                              <X size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handlePasteKey}
                            className="tku-cd-modal-paste-btn"
                            title="Dán mã từ bộ nhớ tạm"
                            disabled={isActivating}
                          >
                            <ClipboardPaste size={14} />
                            <span>Dán</span>
                          </button>
                        </div>

                        {keyError && (
                          <div className="tku-cd-modal-error-box">
                            <AlertCircle size={15} style={{ flexShrink: 0 }} />
                            <span>{keyError}</span>
                          </div>
                        )}

                        <div className="tku-cd-modal-shield-note">
                          <ShieldCheck size={16} />
                          <span>
                            Mã Key do Quản trị viên cấp, chỉ có hiệu lực kích hoạt <strong>1 lần duy nhất</strong> và có <strong>thời hạn cụ thể</strong>.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="tku-cd-modal-footer">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="tku-cd-modal-cancel-btn"
                        disabled={isActivating}
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="tku-cd-modal-submit-btn"
                        disabled={isActivating || !activationKey.trim()}
                      >
                        {isActivating ? (
                          <>
                            <RefreshCw size={16} className="tku-spin" />
                            <span>Đang xác thực...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Kích hoạt ngay</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetailPage;
