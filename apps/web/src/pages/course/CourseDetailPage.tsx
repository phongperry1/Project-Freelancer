import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Clock,
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
  Smartphone,
  Sparkles,
  Users,
  Video,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

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

/* =========================================================================
 * 1. PURE HELPER FUNCTIONS & STATIC ICONS
 * ========================================================================= */
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

const CourseCategoryIcon: React.FC<{
  grade: PublicCourseDetailResponse['grade'];
}> = React.memo(({ grade }) => {
  switch (grade) {
    case '10':
      return <BookOpen size={14} />;
    case '11':
      return <FlaskConical size={14} />;
    case '12':
      return <GraduationCap size={14} />;
    case 'exam':
      return <Sparkles size={14} />;
    case 'other':
      return <Layers size={14} />;
    default:
      return <BookOpen size={14} />;
  }
});

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

/* =========================================================================
 * 2. SUB-COMPONENTS (MEMOIZED FOR ZERO-UNNECESSARY-RERENDER)
 * ========================================================================= */

interface ChapterAccordionItemProps {
  chapter: PublicCourseDetailResponse['chapters'][number];
  index: number;
  isOpen: boolean;
  onToggle: (chapterId: string) => void;
  onStartLesson: (lessonId: string) => void;
}

const ChapterAccordionItem: React.FC<ChapterAccordionItemProps> = React.memo(
  ({ chapter, index, isOpen, onToggle, onStartLesson }) => {
    return (
      <div className={`tku-cd-chapter ${isOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="tku-cd-chapter-trigger"
          onClick={() => onToggle(chapter.id)}
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
                    onClick={() => onStartLesson(lesson.id)}
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
  },
);

interface ChapterSummaryItemProps {
  chapter: PublicCourseDetailResponse['chapters'][number];
  index: number;
}

const ChapterSummaryItem: React.FC<ChapterSummaryItemProps> = React.memo(
  ({ chapter, index }) => (
    <div className="tku-cd-chapter-summary-item">
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
  ),
);

interface ActivationKeyModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ActivationKeyModal: React.FC<ActivationKeyModalProps> = React.memo(
  ({ courseId, courseTitle, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [activationKey, setActivationKey] = useState<string>('');
    const [keyError, setKeyError] = useState<string | null>(null);
    const [isActivating, setIsActivating] = useState<boolean>(false);

    // Handle Escape and Body Overflow Scroll Lock
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isActivating) {
          onClose();
        }
      };

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isActivating, onClose]);

    const handleClose = () => {
      if (isActivating) return;
      onClose();
    };

    const handlePasteKey = async () => {
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
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
        const result = await courseService.enrollWithKey(courseId, cleanKey);
        setIsActivating(false);
        if (user?.id) {
          localStorage.setItem(`tku_enrolled_${user.id}_${courseId}`, 'true');
        }
        localStorage.setItem(`tku_enrolled_${courseId}`, 'true');
        toast.success(
          result.message ||
            'Kích hoạt khóa học thành công! Toàn bộ nội dung bài giảng chi tiết đã được mở khóa.',
        );
        onSuccess();
      } catch (err: unknown) {
        setIsActivating(false);
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể kích hoạt mã key. Vui lòng kiểm tra lại.';
        setKeyError(msg);
        toast.error(msg);
      }
    };

    // Chặn hoàn toàn tài khoản Giảng viên / Quản trị viên khỏi hiển thị modal kích hoạt mã key của học sinh
    if (user && user.role !== 'STUDENT') {
      return null;
    }

    return (
      <div
        className="tku-cd-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tku-modal-key-title"
        onClick={handleClose}
      >
        <div className="tku-cd-modal" onClick={(e) => e.stopPropagation()}>
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
              onClick={handleClose}
              className="tku-cd-modal-close-btn"
              aria-label="Đóng cửa sổ"
              disabled={isActivating}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tku-cd-modal-body">
              {/* Course Capsule */}
              <div className="tku-cd-modal-course-capsule">
                <div className="tku-cd-modal-capsule-badge">
                  <GraduationCap size={13} />
                  <span>Khóa học</span>
                </div>
                <span className="tku-cd-modal-capsule-name">{courseTitle}</span>
              </div>

              {/* Input Group */}
              <div className="tku-cd-modal-form-group">
                <div className="tku-cd-modal-label-row">
                  <label
                    htmlFor="tku-activation-key-input"
                    className="tku-cd-modal-label"
                  >
                    Mã Key tham gia (dùng 1 lần):
                  </label>
                  <span className="tku-cd-modal-sublabel">
                    VD: TKU-CHEM-XXXX-YYYY
                  </span>
                </div>

                <div
                  className={`tku-cd-modal-hero-input-wrap ${keyError ? 'tku-cd-modal-hero-input-wrap--error' : ''}`}
                >
                  <div
                    className="tku-cd-modal-input-icon-box"
                    aria-hidden="true"
                  >
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
                    Mã Key do Quản trị viên cấp, chỉ có hiệu lực kích hoạt{' '}
                    <strong>1 lần duy nhất</strong> và có{' '}
                    <strong>thời hạn cụ thể</strong>.
                  </span>
                </div>
              </div>
            </div>

            <div className="tku-cd-modal-footer">
              <button
                type="button"
                onClick={handleClose}
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
    );
  },
);

/* =========================================================================
 * 3. MAIN PAGE COMPONENT
 * ========================================================================= */

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const shouldActivate = searchParams.get('activate') === '1' || searchParams.get('activate') === 'true';
  const hasHandledActivateRef = useRef<boolean>(false);

  const [course, setCourse] = useState<PublicCourseDetailResponse | null>(null);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Quản lý trạng thái đóng/mở của từng chương (khi đã ghi danh)
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  // Quản lý trạng thái ghi danh của học sinh theo Map id
  const [enrolledMap, setEnrolledMap] = useState<Record<string, boolean>>({});

  // Phân quyền người dùng & Kiểm tra xem có phải giảng viên sở hữu khóa học hay không
  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = isTeacher || isAdmin;
  const isCourseOwner = Boolean(
    isAuthenticated &&
      (isAdmin ||
        (isTeacher &&
          (course?.teacher?.id === user?.id || (course as { teacherId?: string })?.teacherId === user?.id)))
  );

  const hasEnrolledKey = useMemo(() => {
    if (!id || !isAuthenticated) return false;
    if (isCourseOwner) return true;
    if (id in enrolledMap) return enrolledMap[id];
    if (typeof window !== 'undefined' && user?.id) {
      return localStorage.getItem(`tku_enrolled_${user.id}_${id}`) === 'true';
    }
    return false;
  }, [id, enrolledMap, isAuthenticated, user, isCourseOwner]);

  const isEnrolled = isAuthenticated && hasEnrolledKey;
  const canAccessContent = isEnrolled || isCourseOwner;

  // Quản lý modal nhập mã key kích hoạt (Chỉ dành cho học sinh)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  // Cuộn lên đầu trang và reset cờ kích hoạt khi chuyển khóa học
  useEffect(() => {
    window.scrollTo(0, 0);
    hasHandledActivateRef.current = false;
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
          setIsLoadingState(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, refreshTrigger]);

  // Tự động chuyển hướng sang trang đăng nhập nếu người dùng truy cập link kích hoạt nhưng chưa đăng nhập
  useEffect(() => {
    if (shouldActivate && !isAuthenticated && id) {
      toast.info('Vui lòng đăng nhập tài khoản học sinh để kích hoạt khóa học bằng mã Key.');
      navigate(`/login?redirect=${encodeURIComponent(`/courses/${id}?activate=1`)}`, {
        replace: true,
      });
      return;
    }

    // Nếu là Giảng viên / Quản trị viên thì CHẶN tính năng kích hoạt mã Key của học sinh
    if (shouldActivate && isAuthenticated && isStaff) {
      toast.warning('Tài khoản Giảng viên / Quản trị viên không áp dụng kích hoạt bằng mã Key học sinh.');
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('activate');
      const cleanQuery = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}`);

      if (isCourseOwner) {
        if (course && course.lessonCount > 0) {
          navigate(`/courses/${id}/learn`, { replace: true });
        } else {
          navigate(`/lecturer/courses/${id}/curriculum`, { replace: true });
        }
      }
    }
  }, [shouldActivate, isAuthenticated, isStaff, isCourseOwner, course, id, navigate]);

  // Kiểm tra và đồng bộ trạng thái ghi danh thực tế từ Backend Database
  useEffect(() => {
    if (!id || !isAuthenticated) return;

    // Nếu là giảng viên phụ trách hoặc đã có quyền ghi danh -> nhảy thẳng vào phòng học khi có cờ kích hoạt
    if (shouldActivate && canAccessContent && !hasHandledActivateRef.current) {
      hasHandledActivateRef.current = true;
      navigate(`/courses/${id}/learn`, { replace: true });
      return;
    }

    let isMounted = true;
    courseService
      .checkMyEnrollment(id)
      .then((res) => {
        if (isMounted) {
          setEnrolledMap((prev) => ({ ...prev, [id]: res.isEnrolled }));
          if (res.isEnrolled) {
            if (user?.id) localStorage.setItem(`tku_enrolled_${user.id}_${id}`, 'true');
            localStorage.setItem(`tku_enrolled_${id}`, 'true');
          } else {
            if (user?.id) localStorage.removeItem(`tku_enrolled_${user.id}_${id}`);
            localStorage.removeItem(`tku_enrolled_${id}`);
          }

          // Xử lý tự động khi có cờ ?activate=1 sau khi đăng nhập
          if (shouldActivate && !hasHandledActivateRef.current) {
            hasHandledActivateRef.current = true;
            if (isStaff) {
              toast.warning('Tài khoản Giảng viên / Quản trị viên không áp dụng kích hoạt bằng mã Key học sinh.');
              const cleanParams = new URLSearchParams(window.location.search);
              cleanParams.delete('activate');
              const cleanQuery = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
              window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}`);
              return;
            }
            if (res.isEnrolled) {
              // 1. Tài khoản đã vào khóa học rồi -> Nhảy thẳng vào phòng học ngay
              navigate(`/courses/${id}/learn`, { replace: true });
            } else {
              // 2. Tài khoản chưa vào khóa học -> Hiển thị pop up kích hoạt và dọn URL
              setIsKeyModalOpen(true);
              const cleanParams = new URLSearchParams(window.location.search);
              cleanParams.delete('activate');
              const cleanQuery = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
              window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}`);
            }
          }
        }
      })
      .catch(() => {
        // Fallback xử lý khi có lỗi mạng
        if (shouldActivate && !hasHandledActivateRef.current) {
          hasHandledActivateRef.current = true;
          if (isStaff) {
            toast.warning('Tài khoản Giảng viên / Quản trị viên không áp dụng kích hoạt bằng mã Key học sinh.');
            const cleanParams = new URLSearchParams(window.location.search);
            cleanParams.delete('activate');
            const cleanQuery = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
            window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}`);
            return;
          }
          if (hasEnrolledKey) {
            navigate(`/courses/${id}/learn`, { replace: true });
          } else {
            setIsKeyModalOpen(true);
            const cleanParams = new URLSearchParams(window.location.search);
            cleanParams.delete('activate');
            const cleanQuery = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
            window.history.replaceState({}, '', `${window.location.pathname}${cleanQuery}`);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, user, shouldActivate, hasEnrolledKey, canAccessContent, isStaff, navigate]);

  const handleRetry = useCallback(() => {
    setIsLoadingState(true);
    setErrorMessage(null);
    setImageFailed(false);
    setAvatarFailed(false);
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

  // Đóng / mở modal kích hoạt
  const handleCloseModal = useCallback(() => {
    setIsKeyModalOpen(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    if (isStaff) {
      toast.warning('Tài khoản Giảng viên / Quản trị viên không áp dụng kích hoạt bằng mã Key học sinh.');
      return;
    }
    if (!isAuthenticated) {
      toast.info(
        'Vui lòng đăng nhập tài khoản học sinh để kích hoạt khóa học bằng mã Key.',
      );
      navigate(`/login?redirect=${encodeURIComponent(`/courses/${id}?activate=1`)}`);
      return;
    }
    setIsKeyModalOpen(true);
  }, [id, isAuthenticated, isStaff, navigate]);

  const handleEnrollSuccess = useCallback(() => {
    if (id) {
      setEnrolledMap((prev) => ({ ...prev, [id]: true }));
      navigate(`/courses/${id}/learn`);
    }
    setIsKeyModalOpen(false);
  }, [id, navigate]);

  // Hành động kích hoạt / Tham gia khóa học
  const handleEnroll = useCallback(() => {
    if (isCourseOwner) {
      if (id) {
        if (course && course.lessonCount > 0) {
          navigate(`/courses/${id}/learn`);
        } else {
          navigate(`/lecturer/courses/${id}/curriculum`);
        }
      }
      return;
    }

    if (isStaff) {
      toast.warning('Tài khoản Giảng viên không áp dụng kích hoạt bằng mã Key học sinh.');
      return;
    }

    if (isEnrolled) {
      if (id) {
        navigate(`/courses/${id}/learn`);
      }
      return;
    }

    handleOpenModal();
  }, [id, isCourseOwner, isStaff, isEnrolled, course, navigate, handleOpenModal]);

  const handleStartLesson = useCallback(
    (lessonId: string) => {
      if (!id) return;
      navigate(`/courses/${id}/learn/${lessonId}`);
    },
    [id, navigate],
  );

  const teacherFullName = course?.teacher?.fullName;
  const teacherInitials = useMemo(() => {
    if (!teacherFullName) return 'GV';
    const parts = teacherFullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [teacherFullName]);

  const hasValidThumbnail =
    Boolean(course?.thumbnailUrl?.trim()) && !imageFailed;
  const hasValidAvatar =
    Boolean(course?.teacher?.avatarUrl?.trim()) && !avatarFailed;

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

  // Trạng thái đang tải suy ra từ trạng thái fetch hoặc khi đổi id
  const isLoading = isLoadingState || (Boolean(id) && course?.id !== id);

  const heroThemeClass = canAccessContent
    ? 'tku-cd-hero--enrolled'
    : 'tku-cd-hero--unenrolled';

  return (
    <div className="tku-course-detail-page">
      <Navbar />

      <main>
        {isLoading ? (
          // Skeleton Loading State
          <div className="tku-cd-hero tku-cd-skeleton-hero">
            <div className="tku-container">
              <div
                className="tku-cd-skeleton-line"
                style={{ width: '220px', height: '18px', marginBottom: '24px' }}
              />
              <div
                className="tku-cd-skeleton-line"
                style={{
                  width: '120px',
                  height: '28px',
                  marginBottom: '16px',
                  borderRadius: '999px',
                }}
              />
              <div
                className="tku-cd-skeleton-line"
                style={{ width: '65%', height: '38px', marginBottom: '16px' }}
              />
              <div
                className="tku-cd-skeleton-line"
                style={{ width: '45%', height: '18px', marginBottom: '24px' }}
              />
              <div
                className="tku-cd-skeleton-line"
                style={{ width: '380px', height: '32px' }}
              />
            </div>
          </div>
        ) : errorMessage ? (
          // Error State
          <div style={{ padding: '60px 0' }}>
            <div className="tku-container tku-cd-container">
              <div className="tku-empty-state" role="alert">
                <div
                  className="tku-empty-state__icon-wrapper"
                  style={{ color: '#ef4444' }}
                >
                  <AlertCircle size={44} />
                </div>
                <h2 className="tku-empty-state__title">
                  Không thể tải thông tin khóa học
                </h2>
                <p className="tku-empty-state__desc">{errorMessage}</p>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    marginTop: '16px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="tku-empty-state__btn"
                  >
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
            <div className="tku-container tku-cd-container">
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
            <section className={`tku-cd-hero ${heroThemeClass}`}>
              <div className="tku-container">
                {/* Breadcrumbs Trail Nằm Trong Hero Banner Tinh Tế */}
                <nav
                  className="tku-hero-breadcrumbs"
                  aria-label="Đường dẫn điều hướng"
                >
                  <Link to="/" className="tku-hero-breadcrumb-link">
                    <Home size={14} />
                    <span>Trang chủ</span>
                  </Link>
                  <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                  <Link to="/courses" className="tku-hero-breadcrumb-link">
                    <span>Danh mục tất cả khóa học</span>
                  </Link>
                  <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
                  {isCourseOwner ? (
                    <>
                      <Link
                        to="/lecturer/courses"
                        className="tku-hero-breadcrumb-link"
                      >
                        <span>Quản lý khóa học</span>
                      </Link>
                      <ChevronRight
                        size={13}
                        className="tku-hero-breadcrumb-sep"
                      />
                    </>
                  ) : isEnrolled ? (
                    <>
                      <Link
                        to="/courses/category/my-courses"
                        className="tku-hero-breadcrumb-link"
                      >
                        <span>Khóa học của tôi</span>
                      </Link>
                      <ChevronRight
                        size={13}
                        className="tku-hero-breadcrumb-sep"
                      />
                    </>
                  ) : (
                    <>
                      <Link
                        to={`/courses/category/${course.grade}`}
                        className="tku-hero-breadcrumb-link"
                      >
                        <span>{getGradeLabel(course.grade)}</span>
                      </Link>
                      <ChevronRight
                        size={13}
                        className="tku-hero-breadcrumb-sep"
                      />
                    </>
                  )}
                  <span className="tku-hero-breadcrumb-current">
                    {course.title}
                  </span>
                </nav>
                {/* Hero Content */}
                <div className="tku-cd-hero__info">
                  {/* Badges Capsule Đồng Bộ Chuẩn 2 Viên Thuốc */}
                  {isCourseOwner ? (
                    <div className="tku-cd-hero__badge-row">
                      <span className="tku-cd-hero__badge tku-cd-hero__badge--teacher">
                        <Sparkles size={14} />
                        <span>Khóa học do bạn giảng dạy</span>
                      </span>
                      <span className="tku-cd-hero__count-pill">
                        Giảng viên phụ trách
                      </span>
                    </div>
                  ) : isStaff ? (
                    <div className="tku-cd-hero__badge-row">
                      <span className="tku-cd-hero__badge">
                        <CourseCategoryIcon grade={course.grade} />
                        <span>{getGradeLabel(course.grade)}</span>
                      </span>
                      <span className="tku-cd-hero__count-pill">
                        Chế độ Giảng viên
                      </span>
                    </div>
                  ) : isEnrolled ? (
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
                        <CourseCategoryIcon grade={course.grade} />
                        <span>{getGradeLabel(course.grade)}</span>
                      </span>
                      <span className="tku-cd-hero__count-pill">
                        {course.lessonCount > 0
                          ? `${course.lessonCount} bài giảng`
                          : '1 khóa học'}
                      </span>
                    </div>
                  )}

                  {/* Course Title */}
                  <h1 className="tku-cd-hero__title">{course.title}</h1>

                  {/* Subtitle / Description - Luôn hiển thị văn bản học thuật chuẩn chỉ */}
                  <p className="tku-cd-hero__desc">
                    {getCourseDefaultSubtitle(
                      course.grade,
                      course.description,
                    )}
                  </p>

                  {/* Quick Stats Bar */}
                  <div className="tku-cd-hero__stats">
                    <div className="tku-cd-hero__teacher">
                      {hasValidAvatar ? (
                        <img
                          src={course.teacher.avatarUrl!}
                          alt={course.teacher.fullName}
                          className="tku-cd-hero__teacher-avatar"
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarFailed(true)}
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

            {/* MAIN TWO-COLUMN BODY */}
            <div className="tku-cd-body">
              <div className="tku-container tku-cd-container">
                <div className="tku-cd-layout">
                  {/* LEFT COLUMN: Main Content */}
                  <div className="tku-cd-content-col">
                    {/* 1. Giới thiệu khóa học (Dữ liệu thật từ description) */}
                    <section
                      className="tku-cd-card"
                      aria-labelledby="desc-heading"
                    >
                      <div className="tku-cd-card__header">
                        <div className="tku-cd-card__icon-box">
                          <FileText size={20} />
                        </div>
                        <div className="tku-cd-card__header-info">
                          <h2 id="desc-heading" className="tku-cd-card__title">
                            Mô tả khóa học
                          </h2>
                          <span className="tku-cd-card__subtitle">
                            Mục tiêu đào tạo & định hướng kiến thức trọng tâm
                          </span>
                        </div>
                      </div>

                      {course.description?.trim() ? (
                        <div className="tku-cd-desc-content">
                          <p className="tku-cd-desc-text">{course.description}</p>
                          <div className="tku-cd-features-chips">
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Kiến thức trọng tâm chuẩn SGK & Đề thi
                            </span>
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Rèn luyện kỹ năng phân tích phản xạ nhanh
                            </span>
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Trợ lý AI giải đáp thắc mắc 24/7
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="tku-cd-desc-fallback-box">
                          <div className="tku-cd-desc-fallback-badge">
                            <Sparkles size={14} />
                            <span>Khung chuẩn kiến thức Hóa học TKU</span>
                          </div>
                          <h3 className="tku-cd-desc-fallback-title">
                            Chương trình học tập chuyên sâu bám sát cấu trúc thi mới nhất
                          </h3>
                          <p className="tku-cd-desc-fallback-desc">
                            Khóa học được xây dựng bài bản từ các chuyên đề lý thuyết nền tảng đến hệ thống bài tập phân hóa cao. Học sinh được trang bị phương pháp tư duy Hóa học logic, nắm vững hiện tượng thực tế và tối ưu tốc độ làm bài trắc nghiệm.
                          </p>
                          <div className="tku-cd-features-chips">
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Hiểu sâu bản chất Hóa học
                            </span>
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Phân dạng bài tập từ cơ bản đến nâng cao
                            </span>
                            <span className="tku-cd-chip">
                              <CheckCircle2 size={14} /> Tích hợp Gia sư AI trong phòng học
                            </span>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* 2. Nội dung chương trình học */}
                    <section
                      className="tku-cd-card"
                      aria-labelledby="curriculum-heading"
                    >
                      {isCourseOwner ? (
                        // ==========================================
                        // KHI LÀ GIẢNG VIÊN PHỤ TRÁCH / ADMIN:
                        // TOÀN QUYỀN XEM TRƯỚC VÀ QUẢN LÝ
                        // ==========================================
                        <>
                          <div className="tku-cd-enrolled-banner tku-cd-teacher-banner">
                            <Sparkles size={20} />
                            <div className="tku-cd-teacher-banner-text">
                              <strong>Không gian Giảng viên:</strong> Bạn là giảng viên phụ trách khóa học này. Bạn có toàn quyền xem trước giáo trình và quản lý nội dung bài giảng.
                            </div>
                            <Link
                              to={`/lecturer/courses/${course.id}/curriculum`}
                              className="tku-cd-teacher-banner-btn"
                            >
                              <Layers size={14} />
                              <span>Biên tập giáo trình</span>
                            </Link>
                          </div>

                          <div className="tku-cd-card__header tku-cd-curriculum-header">
                            <div className="tku-cd-card__icon-box">
                              <BookOpen size={20} />
                            </div>
                            <div className="tku-cd-card__header-info">
                              <div className="tku-cd-card__title-row">
                                <h2
                                  id="curriculum-heading"
                                  className="tku-cd-card__title"
                                >
                                  Lộ trình bài giảng chi tiết (Chế độ Giảng viên)
                                </h2>
                                {course.chapters.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={toggleAllChapters}
                                    className="tku-cd-expand-all-btn"
                                  >
                                    {areAllExpanded
                                      ? 'Thu gọn tất cả'
                                      : 'Mở rộng tất cả'}
                                  </button>
                                )}
                              </div>
                              <div className="tku-cd-curriculum-pills">
                                <span className="tku-cd-pill-item">
                                  <Layers size={13} /> {course.chapterCount} chương mục
                                </span>
                                <span className="tku-cd-pill-item">
                                  <BookOpen size={13} /> {course.lessonCount} bài giảng
                                </span>
                                <span className="tku-cd-pill-item tku-cd-pill-item--teacher">
                                  <ShieldCheck size={13} /> Quyền Giảng viên
                                </span>
                              </div>
                            </div>
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="tku-cd-chapter-list">
                              {course.chapters.map((chapter, index) => (
                                <ChapterAccordionItem
                                  key={chapter.id}
                                  chapter={chapter}
                                  index={index}
                                  isOpen={Boolean(openChapters[chapter.id])}
                                  onToggle={toggleChapter}
                                  onStartLesson={handleStartLesson}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="tku-cd-empty-curriculum tku-cd-empty-curriculum--teacher">
                              <div className="tku-cd-empty-curriculum-icon">
                                <Layers size={24} />
                              </div>
                              <div className="tku-cd-empty-curriculum-text">
                                <h4>Khóa học chưa có bài giảng</h4>
                                <p>
                                  Hãy xây dựng cấu trúc chương mục và tải lên hệ thống bài giảng video, bài tập trắc nghiệm để học sinh có thể tham gia học tập.
                                </p>
                                <Link
                                  to={`/lecturer/courses/${course.id}/curriculum`}
                                  className="tku-cd-add-curriculum-btn"
                                >
                                  <Layers size={15} />
                                  <span>Thêm bài giảng ngay</span>
                                </Link>
                              </div>
                            </div>
                          )}
                        </>
                      ) : isEnrolled ? (
                        // ==========================================
                        // KHI ĐÃ THAM GIA: HIỂN THỊ ĐẦY ĐỦ BÀI HỌC CHI TIẾT
                        // ==========================================
                        <>
                          {/* Banner chào mừng học sinh */}
                          <div className="tku-cd-enrolled-banner">
                            <CheckCircle2 size={20} />
                            <div>
                              <strong>Bạn đã kích hoạt khóa học này!</strong> Toàn
                              bộ bài giảng đã được mở khóa. Hãy chọn một bài học
                              bên dưới để bắt đầu.
                            </div>
                          </div>

                          <div className="tku-cd-card__header tku-cd-curriculum-header">
                            <div className="tku-cd-card__icon-box">
                              <BookOpen size={20} />
                            </div>
                            <div className="tku-cd-card__header-info">
                              <div className="tku-cd-card__title-row">
                                <h2
                                  id="curriculum-heading"
                                  className="tku-cd-card__title"
                                >
                                  Lộ trình bài giảng chi tiết
                                </h2>
                                {course.chapters.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={toggleAllChapters}
                                    className="tku-cd-expand-all-btn"
                                  >
                                    {areAllExpanded
                                      ? 'Thu gọn tất cả'
                                      : 'Mở rộng tất cả'}
                                  </button>
                                )}
                              </div>
                              <div className="tku-cd-curriculum-pills">
                                <span className="tku-cd-pill-item">
                                  <Layers size={13} /> {course.chapterCount} chương mục
                                </span>
                                <span className="tku-cd-pill-item">
                                  <BookOpen size={13} /> {course.lessonCount} bài giảng
                                </span>
                                <span className="tku-cd-pill-item">
                                  <CheckCircle2 size={13} /> Đã kích hoạt toàn bộ
                                </span>
                              </div>
                            </div>
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="tku-cd-chapter-list">
                              {course.chapters.map((chapter, index) => (
                                <ChapterAccordionItem
                                  key={chapter.id}
                                  chapter={chapter}
                                  index={index}
                                  isOpen={Boolean(openChapters[chapter.id])}
                                  onToggle={toggleChapter}
                                  onStartLesson={handleStartLesson}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="tku-cd-empty-curriculum">
                              <div className="tku-cd-empty-curriculum-icon">
                                <Clock size={24} />
                              </div>
                              <div className="tku-cd-empty-curriculum-text">
                                <h4>Chương trình học đang được đồng bộ</h4>
                                <p>
                                  Giáo trình chi tiết đang được cập nhật. Bạn sẽ
                                  nhận được thông báo ngay khi bài giảng đầu tiên được mở.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        // ==========================================
                        // KHI CHƯA THAM GIA: CHỈ TÓM TẮT CÁC CHUYÊN ĐỀ SẼ HỌC
                        // ==========================================
                        <>
                          <div className="tku-cd-card__header">
                            <div className="tku-cd-card__icon-box">
                              <BookOpen size={20} />
                            </div>
                            <div className="tku-cd-card__header-info">
                              <h2
                                id="curriculum-heading"
                                className="tku-cd-card__title"
                              >
                                Tóm tắt nội dung khóa học
                              </h2>
                              <div className="tku-cd-curriculum-pills">
                                <span className="tku-cd-pill-item">
                                  <Layers size={13} /> {course.chapterCount} chương mục
                                </span>
                                <span className="tku-cd-pill-item">
                                  <BookOpen size={13} /> {course.lessonCount} bài giảng
                                </span>
                                <span className="tku-cd-pill-item">
                                  <Sparkles size={13} /> Học trực tuyến 24/7
                                </span>
                              </div>
                            </div>
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="tku-cd-chapter-summary-list">
                              {course.chapters.map((chapter, index) => (
                                <ChapterSummaryItem
                                  key={chapter.id}
                                  chapter={chapter}
                                  index={index}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="tku-cd-empty-curriculum">
                              <div className="tku-cd-empty-curriculum-icon">
                                <Clock size={24} />
                              </div>
                              <div className="tku-cd-empty-curriculum-text">
                                <h4>Chương trình học đang được đồng bộ</h4>
                                <p>
                                  Thầy/Cô đang biên tập và tải lên hệ thống bài
                                  giảng video, bài tập trắc nghiệm và tài liệu học
                                  tập cho khóa học này. Hãy theo dõi để không bỏ
                                  lỡ bài giảng mới nhất!
                                </p>
                              </div>
                            </div>
                          )}

                          {isStaff ? (
                            /* Hộp thông báo dành cho Giảng viên khác ghé xem */
                            <div className="tku-cd-locked-notice tku-cd-locked-notice--teacher">
                              <div className="tku-cd-locked-notice-icon">
                                <ShieldCheck size={22} />
                              </div>
                              <div className="tku-cd-locked-notice-content">
                                <div className="tku-cd-locked-notice-tag">
                                  <Users size={12} />
                                  <span>Chế độ Giảng viên quan sát</span>
                                </div>
                                <h3 className="tku-cd-locked-notice-title">
                                  Nội dung giáo trình của Thầy/Cô {course.teacher.fullName}
                                </h3>
                                <p className="tku-cd-locked-notice-desc">
                                  Khóa học này do Giảng viên <strong>{course.teacher.fullName}</strong> phụ trách. Tính năng kích hoạt bằng mã Key chỉ dành riêng cho tài khoản Học sinh.
                                </p>
                              </div>
                            </div>
                          ) : (
                            /* Hộp thông báo khóa bài giảng dành cho học sinh */
                            <div className="tku-cd-locked-notice">
                              <div className="tku-cd-locked-notice-icon">
                                <Lock size={22} />
                              </div>
                              <div className="tku-cd-locked-notice-content">
                                <div className="tku-cd-locked-notice-tag">
                                  <Lock size={12} />
                                  <span>Chế độ học sinh</span>
                                </div>
                                <h3 className="tku-cd-locked-notice-title">
                                  Nội dung bài giảng chi tiết đang được khóa
                                </h3>
                                <p className="tku-cd-locked-notice-desc">
                                  Khóa học yêu cầu mã Key từ Quản trị viên hoặc
                                  Giảng viên để kích hoạt và mở khóa toàn bộ bài
                                  giảng video độ nét cao, hệ thống bài tập trắc
                                  nghiệm và tài liệu học tập của từng chương.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </section>

                    {/* 3. Giảng viên phụ trách (Dữ liệu thật 100%) */}
                    <section
                      className="tku-cd-card"
                      aria-labelledby="instructor-heading"
                    >
                      <div className="tku-cd-card__header">
                        <div className="tku-cd-card__icon-box">
                          <Users size={20} />
                        </div>
                        <div className="tku-cd-card__header-info">
                          <h2
                            id="instructor-heading"
                            className="tku-cd-card__title"
                          >
                            Giảng viên phụ trách
                          </h2>
                          <span className="tku-cd-card__subtitle">
                            Đội ngũ chuyên môn giàu kinh nghiệm giảng dạy & luyện thi
                          </span>
                        </div>
                      </div>

                      <div className="tku-cd-instructor-card">
                        <div className="tku-cd-instructor-avatar-wrap">
                          {hasValidAvatar ? (
                            <img
                              src={course.teacher.avatarUrl!}
                              alt={course.teacher.fullName}
                              className="tku-cd-instructor-avatar"
                              referrerPolicy="no-referrer"
                              onError={() => setAvatarFailed(true)}
                            />
                          ) : (
                            <div className="tku-cd-instructor-avatar-fallback">
                              {teacherInitials}
                            </div>
                          )}
                          <span
                            className="tku-cd-instructor-verified"
                            title="Giảng viên đã xác thực"
                          >
                            <BadgeCheck size={16} />
                          </span>
                        </div>

                        <div className="tku-cd-instructor-info">
                          <div className="tku-cd-instructor-name-row">
                            <h3 className="tku-cd-instructor-name">
                              {course.teacher.fullName}
                            </h3>
                            <span className="tku-cd-instructor-tag">
                              Giảng viên chính
                            </span>
                          </div>
                          <p className="tku-cd-instructor-role">
                            Giảng viên Chuyên môn Hóa học · TKU E-Learning
                          </p>
                          <p className="tku-cd-instructor-bio">
                            Đồng hành và hướng dẫn học sinh phương pháp tư duy
                            Hóa học bản chất, tối ưu thời gian làm bài trắc nghiệm
                            và tự tin bứt phá điểm số trong các kỳ thi.
                          </p>
                          <div className="tku-cd-instructor-badges">
                            <span className="tku-cd-inst-badge">
                              <Sparkles size={13} /> Giải đáp thắc mắc 24/7
                            </span>
                            <span className="tku-cd-inst-badge">
                              <BookOpen size={13} /> Giáo trình chuẩn hóa
                            </span>
                            <span className="tku-cd-inst-badge">
                              <CheckCircle2 size={13} /> Kiểm định chuyên môn
                            </span>
                          </div>
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
                              <div
                                className="tku-cd-fallback-particles"
                                aria-hidden="true"
                              />
                              <div className="tku-cd-fallback-icon-wrap">
                                <FlaskConical
                                  size={36}
                                  className="tku-cd-fallback-icon"
                                />
                              </div>
                              <span className="tku-cd-fallback-brand">
                                TKU E-Learning
                              </span>
                              <span
                                className="tku-cd-fallback-course-title"
                                title={course.title}
                              >
                                {course.title}
                              </span>
                              <span className="tku-cd-fallback-pill">
                                Khóa học chuyên đề Hóa học
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="tku-cd-enroll-body">
                          {/* CTA Button Group */}
                          {isCourseOwner ? (
                            <div className="tku-cd-cta-group">
                              {course.lessonCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/courses/${course.id}/learn`)}
                                  className="tku-cd-enroll-btn tku-cd-enroll-btn--enrolled"
                                >
                                  <PlayCircle size={18} />
                                  <span>Vào phòng học (Xem trước)</span>
                                  <ArrowRight size={18} />
                                </button>
                              ) : (
                                <Link
                                  to={`/lecturer/courses/${course.id}/curriculum`}
                                  className="tku-cd-enroll-btn tku-cd-enroll-btn--key"
                                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                                >
                                  <Layers size={18} />
                                  <span>Biên tập giáo trình</span>
                                  <ArrowRight size={18} />
                                </Link>
                              )}

                              <Link
                                to={`/lecturer/courses/${course.id}/curriculum`}
                                className="tku-cd-secondary-action-btn"
                              >
                                <Layers size={15} />
                                <span>Quản lý & Biên tập giáo trình</span>
                              </Link>

                              <div className="tku-cd-key-badge-hint tku-cd-key-badge-hint--teacher">
                                <ShieldCheck size={13} />
                                <span>Bạn là giảng viên phụ trách khóa học này</span>
                              </div>
                            </div>
                          ) : isStaff ? (
                            <div className="tku-cd-cta-group">
                              <div className="tku-cd-staff-notice-card">
                                <div className="tku-cd-staff-notice-card__header">
                                  <ShieldCheck size={16} />
                                  <span>Tài khoản Giảng viên</span>
                                </div>
                                <p className="tku-cd-staff-notice-card__desc">
                                  Khóa học do Giảng viên <strong>{course.teacher.fullName}</strong> phụ trách. Tính năng kích hoạt bằng mã Key chỉ dành riêng cho tài khoản Học sinh.
                                </p>
                              </div>

                              <Link
                                to="/lecturer/courses"
                                className="tku-cd-enroll-btn tku-cd-enroll-btn--outline"
                                style={{ textDecoration: 'none', justifyContent: 'center' }}
                              >
                                <Layers size={16} />
                                <span>Quay về khóa học của tôi</span>
                                <ArrowRight size={16} />
                              </Link>
                            </div>
                          ) : isEnrolled ? (
                            <button
                              type="button"
                              onClick={handleEnroll}
                              className="tku-cd-enroll-btn tku-cd-enroll-btn--enrolled"
                            >
                              <CheckCircle2 size={18} />
                              <span>Vào học ngay</span>
                              <ArrowRight size={18} />
                            </button>
                          ) : (
                            <div className="tku-cd-cta-group">
                              <button
                                type="button"
                                onClick={handleEnroll}
                                className="tku-cd-enroll-btn tku-cd-enroll-btn--key"
                              >
                                <KeyRound size={18} />
                                <span>Kích hoạt bằng mã Key</span>
                                <ArrowRight size={18} />
                              </button>
                              <div className="tku-cd-key-badge-hint">
                                <Lock size={13} />
                                <span>Yêu cầu mã Key để mở khóa bài học</span>
                              </div>
                            </div>
                          )}

                          {/* Khóa học này bao gồm */}
                          <div className="tku-cd-benefits">
                            <h5 className="tku-cd-benefits-title">
                              Khóa học này bao gồm:
                            </h5>
                            <ul className="tku-cd-benefits-list">
                              <li>
                                <Video size={15} />
                                <span>Toàn bộ video bài giảng lý thuyết & bài tập</span>
                              </li>
                              <li>
                                <Sparkles size={15} />
                                <span>Gia sư AI giải đáp thắc mắc bài học 24/7</span>
                              </li>
                              <li>
                                <FileText size={15} />
                                <span>Luyện tập trắc nghiệm & chấm điểm tức thì</span>
                              </li>
                              <li>
                                <Smartphone size={15} />
                                <span>Học linh hoạt trên máy tính & điện thoại</span>
                              </li>
                              <li>
                                <CheckCircle2 size={15} />
                                <span>Quyền truy cập học tập không giới hạn</span>
                              </li>
                            </ul>
                          </div>

                          {/* Bảng thông tin thực tế từ Database */}
                          <h4 className="tku-cd-meta-table-title">
                            Thông tin khóa học:
                          </h4>
                          <div className="tku-cd-meta-table">
                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <Layers size={15} />
                                <span>Số chương mục</span>
                              </span>
                              <span className="tku-cd-meta-value">
                                {course.chapterCount} chương
                              </span>
                            </div>

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <BookOpen size={15} />
                                <span>Số bài giảng</span>
                              </span>
                              <span className="tku-cd-meta-value">
                                {course.lessonCount} bài
                              </span>
                            </div>

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <Users size={15} />
                                <span>Học viên tham gia</span>
                              </span>
                              <span className="tku-cd-meta-value">
                                {course.studentCount} học viên
                              </span>
                            </div>

                            {formattedCreatedDate && (
                              <div className="tku-cd-meta-row">
                                <span className="tku-cd-meta-label">
                                  <Calendar size={15} />
                                  <span>Ngày phát hành</span>
                                </span>
                                <span className="tku-cd-meta-value">
                                  {formattedCreatedDate}
                                </span>
                              </div>
                            )}

                            <div className="tku-cd-meta-row">
                              <span className="tku-cd-meta-label">
                                <GraduationCap size={15} />
                                <span>Giảng viên</span>
                              </span>
                              <span
                                className="tku-cd-meta-value"
                                title={course.teacher.fullName}
                              >
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
            <div
              className="tku-cd-mobile-bar"
              aria-label="Thanh điều hướng nhanh trên điện thoại"
            >
              <div className="tku-cd-mobile-info">
                <span className="tku-cd-mobile-title">{course.title}</span>
                <span
                  className="tku-cd-mobile-price"
                  style={{
                    color: isCourseOwner || isEnrolled ? '#10b981' : isStaff ? '#64748b' : '#2563eb',
                  }}
                >
                  {isCourseOwner
                    ? 'Giảng viên phụ trách'
                    : isStaff
                      ? 'Chế độ Giảng viên'
                      : isEnrolled
                        ? 'Đã tham gia'
                        : 'Yêu cầu mã Key'}{' '}
                  · {course.lessonCount} bài học
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {isCourseOwner ? (
                  course.lessonCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/courses/${course.id}/learn`)}
                      className="tku-cd-mobile-btn tku-cd-mobile-btn--enrolled"
                    >
                      Xem phòng học
                    </button>
                  ) : (
                    <Link
                      to={`/lecturer/courses/${course.id}/curriculum`}
                      className="tku-cd-mobile-btn tku-cd-mobile-btn--enrolled"
                      style={{ textDecoration: 'none' }}
                    >
                      Biên tập
                    </Link>
                  )
                ) : isStaff ? (
                  <Link
                    to="/lecturer/courses"
                    className="tku-cd-mobile-btn tku-cd-mobile-btn--outline"
                    style={{ textDecoration: 'none' }}
                  >
                    Khóa học của tôi
                  </Link>
                ) : isEnrolled ? (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    className="tku-cd-mobile-btn tku-cd-mobile-btn--enrolled"
                  >
                    Vào học ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    className="tku-cd-mobile-btn tku-cd-mobile-btn--key"
                  >
                    <KeyRound size={16} />
                    <span>Kích hoạt bằng mã Key</span>
                  </button>
                )}
              </div>
            </div>

            {/* MODAL NHẬP MÃ KEY KÍCH HOẠT (CHỈ DÀNH CHO HỌC SINH) */}
            {isKeyModalOpen && !isStaff && (
              <ActivationKeyModal
                courseId={course.id}
                courseTitle={course.title}
                onClose={handleCloseModal}
                onSuccess={handleEnrollSuccess}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetailPage;
