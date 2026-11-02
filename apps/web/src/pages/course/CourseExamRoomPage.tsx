import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flag,
  HelpCircle,
  Loader2,
  LogOut,
  Send,
  X,
} from 'lucide-react';
import {
  courseService,
  type TakeAssessmentResponse,
  type TakeAssessmentQuestion,
} from '../../services/course.service';
import { toast } from '../../context/useToast';
import { useAuth } from '../../context/useAuth';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { MathText } from '../../components/common/MathText';
import './courseExamRoom.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const CourseExamRoomPage: React.FC = () => {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [examData, setExamData] = useState<TakeAssessmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active question index (0-based)
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Answers map: { [questionId: string]: optionId }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Flagged questions set: Set of questionId
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Timer: seconds left
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Confirmation Modals
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const hasRestoredDraftRef = useRef<boolean>(false);
  const isLeavingConfirmedRef = useRef<boolean>(false);
  const pendingNavigationUrlRef = useRef<string | null>(null);
  const isTrapInitializingRef = useRef<boolean>(false);
  const isIgnoringNextPopRef = useRef<boolean>(false);
  const rearmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local storage draft key (hỗ trợ fallback guest nếu user chưa kịp rehydrate)
  const storageDraftKey = useMemo(() => {
    if (!assessmentId) return null;
    return user?.id
      ? `tku_exam_draft_${user.id}_${assessmentId}`
      : `tku_exam_draft_guest_${assessmentId}`;
  }, [assessmentId, user?.id]);

  // Thời gian lưu nháp tự động gần nhất
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // 1. Tải dữ liệu đề thi và khôi phục nháp (chạy an toàn theo vòng đời bất đồng bộ)
  useEffect(() => {
    let isMounted = true;

    const fetchExam = async () => {
      if (!courseId || !assessmentId) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await courseService.getAssessmentForTake(courseId, assessmentId);
        if (!isMounted) return;

        setExamData(data);

        // Khôi phục câu trả lời nháp từ localStorage nếu có
        const draftKey = user?.id
          ? `tku_exam_draft_${user.id}_${assessmentId}`
          : `tku_exam_draft_guest_${assessmentId}`;

        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            let restoredCount = 0;
            if (parsed.answers && typeof parsed.answers === 'object') {
              setSelectedAnswers(parsed.answers);
              restoredCount = Object.keys(parsed.answers).length;
            }
            if (parsed.flags && typeof parsed.flags === 'object') {
              setFlaggedQuestions(parsed.flags);
            }
            if (parsed.updatedAt) {
              try {
                const savedDate = new Date(parsed.updatedAt);
                setLastSavedTime(
                  savedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                );
              } catch {
                // ignore
              }
            }
            if (restoredCount > 0) {
              toast.info(
                `Đã tự động khôi phục ${restoredCount} câu trả lời chưa nộp từ bản lưu gần nhất.`,
              );
            }
          }
        } catch (e) {
          console.error('Không thể đọc bản nháp bài thi từ bộ nhớ:', e);
        } finally {
          hasRestoredDraftRef.current = true;
        }

        // Khởi tạo thời gian làm bài nếu bài thi có giới hạn thời gian (durationMinutes)
        if (data.assessment.durationMinutes && data.assessment.durationMinutes > 0) {
          const totalSecs = data.assessment.durationMinutes * 60;
          setSecondsLeft(totalSecs);
        } else {
          setSecondsLeft(null); // Không giới hạn thời gian
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải đề thi.';
        setErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchExam();

    return () => {
      isMounted = false;
    };
  }, [courseId, assessmentId, user?.id]);

  // Save draft to localStorage whenever answers or flags change (chỉ lưu sau khi đã nạp nháp ban đầu)
  useEffect(() => {
    if (!hasRestoredDraftRef.current || !storageDraftKey || !examData) return;
    try {
      const now = new Date();
      localStorage.setItem(
        storageDraftKey,
        JSON.stringify({
          answers: selectedAnswers,
          flags: flaggedQuestions,
          updatedAt: now.toISOString(),
        }),
      );
    } catch (e) {
      console.error('Lỗi khi lưu bài làm nháp:', e);
    }
  }, [selectedAnswers, flaggedQuestions, storageDraftKey, examData]);

  // Select option handler
  const handleSelectOption = useCallback((questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    setLastSavedTime(
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    );
  }, []);

  // Toggle flag handler
  const handleToggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
    setLastSavedTime(
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    );
  }, []);

  // Submit test action
  const handleSubmitExam = useCallback(
    async (isAuto = false) => {
      if (!courseId || !assessmentId || !examData || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setShowSubmitModal(false);

      try {
        const payload = {
          answers: examData.questions.map((q) => ({
            questionId: q.id,
            selectedOptionId: selectedAnswers[q.id] || undefined,
          })),
        };

        const result = await courseService.submitAssessment(courseId, assessmentId, payload);

        // Xóa bản nháp sau khi nộp thành công
        if (storageDraftKey) {
          try {
            localStorage.removeItem(storageDraftKey);
          } catch (e) {
            console.error('Không thể dọn dẹp nháp:', e);
          }
        }

        if (isAuto) {
          toast.warning('Đã hết giờ làm bài! Hệ thống đã tự động ghi nhận và nộp bài làm của bạn.');
        } else {
          toast.success(
            `Nộp bài thành công! Điểm của bạn: ${result.score}/10 (${result.correctCount}/${result.totalQuestions} câu đúng).`,
          );
        }

        isLeavingConfirmedRef.current = true;
        // Chuyển hướng tới trang xem kết quả chi tiết & lời giải (thay thế lịch sử phòng thi để khi bấm nút Lui sẽ về thẳng phòng học)
        navigate(`/courses/${courseId}/exams/${assessmentId}/results/${result.submissionId}`, { replace: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Nộp bài thất bại. Vui lòng thử lại.';
        toast.error(msg);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [courseId, assessmentId, examData, selectedAnswers, storageDraftKey, navigate],
  );

  const handleAutoSubmitOnTimeout = useCallback(() => {
    handleSubmitExam(true);
  }, [handleSubmitExam]);

  // Rời phòng thi an toàn
  const handleConfirmExit = useCallback(() => {
    isLeavingConfirmedRef.current = true;
    setShowExitModal(false);
    const targetUrl = pendingNavigationUrlRef.current || `/courses/${courseId}/learn`;
    navigate(targetUrl);
  }, [courseId, navigate]);

  const handleCloseExitModal = useCallback(() => {
    pendingNavigationUrlRef.current = null;
    setShowExitModal(false);
  }, []);

  // Hỗ trợ phím Escape đóng các modal xác nhận và phím Mũi tên trái/phải chuyển câu hỏi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          handleCloseExitModal();
          setShowSubmitModal(false);
        }
        return;
      }

      // Không xử lý phím tắt khi đang mở modal hoặc đang gõ input
      if (showSubmitModal || showExitModal || isSubmitting) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        if (examData?.questions?.length) {
          setCurrentIndex((prev) => Math.min(examData.questions.length - 1, prev + 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, handleCloseExitModal, showSubmitModal, showExitModal, examData]);

  // Countdown timer effect
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          // Tự động nộp bài khi hết giờ
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, isSubmitting, handleAutoSubmitOnTimeout]);

  // Questions and current active question
  const questions: TakeAssessmentQuestion[] = useMemo(() => examData?.questions || [], [examData]);
  const currentQuestion: TakeAssessmentQuestion | null = useMemo(
    () => questions[currentIndex] || null,
    [questions, currentIndex],
  );

  // Statistics
  const answeredCount = useMemo(() => {
    return questions.filter((q) => Boolean(selectedAnswers[q.id])).length;
  }, [questions, selectedAnswers]);

  const flaggedCount = useMemo(() => {
    return questions.filter((q) => Boolean(flaggedQuestions[q.id])).length;
  }, [questions, flaggedQuestions]);

  const unansweredCount = questions.length - answeredCount;

  // Format timer string MM:SS or HH:MM:SS
  const formattedTimer = useMemo(() => {
    if (secondsLeft === null) return 'Không giới hạn';
    const hrs = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  const isTimerUrgent = secondsLeft !== null && secondsLeft < 300; // Còn dưới 5 phút

  // Bắt sự kiện Mũi tên quay về trang trước (Back) và Mũi tên chuyển qua trang sau (Forward) của trình duyệt
  useEffect(() => {
    if (!examData) return;

    // Thiết lập History Trap:
    // 1. replaceState current
    // 2. pushState forward
    // 3. back() về current để cả 2 nút Back và Forward trên trình duyệt đều sáng (enabled)
    try {
      isTrapInitializingRef.current = true;
      window.history.replaceState({ examRoom: true, step: 'current' }, '');
      window.history.pushState({ examRoom: true, step: 'forward' }, '');
      window.history.back();
    } catch {
      isTrapInitializingRef.current = false;
    }

    const rearmForwardTrap = () => {
      try {
        isTrapInitializingRef.current = true;
        window.history.pushState({ examRoom: true, step: 'forward' }, '');
        window.history.back();
      } catch {
        isTrapInitializingRef.current = false;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      // Bỏ qua popstate sinh ra bởi history.back() khi thiết lập bẫy
      if (isTrapInitializingRef.current) {
        isTrapInitializingRef.current = false;
        return;
      }

      // Bỏ qua popstate khi lùi từ bẫy Forward về trang làm bài hiện tại
      if (isIgnoringNextPopRef.current) {
        isIgnoringNextPopRef.current = false;
        return;
      }

      if (isLeavingConfirmedRef.current || isSubmittingRef.current) {
        return;
      }

      const state = e.state as { examRoom?: boolean; step?: string } | null;

      // 1. NGƯỜI DÙNG BẤM MŨI TÊN CHUYỂN QUA TRANG SAU (Browser Forward arrow →)
      if (state && state.step === 'forward') {
        // Đánh dấu bỏ qua sự kiện popstate sinh ra bởi history.back() dưới đây
        isIgnoringNextPopRef.current = true;
        window.history.back();
        // Đảm bảo đóng ExitModal và chỉ hiển thị SubmitModal
        setShowExitModal(false);
        setShowSubmitModal(true);
        return;
      }

      // 2. NGƯỜI DÙNG BẤM MŨI TÊN QUAY VỀ TRANG TRƯỚC (Browser Back arrow ←)
      // Giữ người dùng lại ở phòng thi hiện tại
      window.history.pushState({ examRoom: true, step: 'current' }, '');
      if (rearmTimeoutRef.current) {
        clearTimeout(rearmTimeoutRef.current);
      }
      rearmTimeoutRef.current = setTimeout(() => {
        rearmForwardTrap();
      }, 60);
      // Đảm bảo đóng SubmitModal và chỉ hiển thị ExitModal
      setShowSubmitModal(false);
      setShowExitModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (rearmTimeoutRef.current) {
        clearTimeout(rearmTimeoutRef.current);
        rearmTimeoutRef.current = null;
      }
    };
  }, [examData]);

  // Bắt các liên kết điều hướng nội bộ (Navbar, Breadcrumbs...) để hiển thị Modal Rời bài thi
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isLeavingConfirmedRef.current || isSubmittingRef.current) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || anchor.target === '_blank') {
        return;
      }

      // Nếu click vào liên kết dẫn ra khỏi phòng thi
      const currentPath = window.location.pathname;
      if (href !== currentPath) {
        e.preventDefault();
        e.stopPropagation();
        pendingNavigationUrlRef.current = href;
        setShowExitModal(true);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  // Cảnh báo khi reload hoặc đóng tab trình duyệt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isLeavingConfirmedRef.current && !isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="tku-exam-page">
        <Navbar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
          <Loader2 className="tku-learning-spinner" size={44} style={{ color: '#1d68f2', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Đang chuẩn bị đề thi trực tuyến...
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Hệ thống đang tải câu hỏi và thiết lập phòng thi học thuật TKU.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (errorMessage || !examData) {
    return (
      <div className="tku-exam-page">
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
          <div
            style={{
              maxWidth: 480,
              background: '#ffffff',
              borderRadius: 14,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              Không thể vào phòng thi
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              {errorMessage || 'Đề thi không tồn tại hoặc bạn chưa được cấp quyền truy cập.'}
            </p>
            <Link
              to={courseId ? `/courses/${courseId}/learn` : '/courses'}
              className="tku-exam-back-btn"
              style={{ display: 'inline-flex', padding: '10px 20px', background: '#1d68f2', color: '#fff', border: 'none' }}
            >
              <ArrowLeft size={16} />
              <span>Quay lại phòng học</span>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { assessment } = examData;

  return (
    <div className="tku-exam-page">
      {/* 1. THANH ĐIỀU HƯỚNG CHÍNH CỦA HỆ THỐNG TKU */}
      <Navbar />

      {/* 2. KHU VỰC THI CHÍNH */}
      <main className="tku-exam-container" style={{ flex: 1, paddingBottom: 60, paddingTop: 20 }}>
        {/* BANNER THÔNG TIN PHÒNG THI & ĐIỀU HƯỚNG HỌC THUẬT */}
        <div className="tku-exam-room-header">
          {/* Hàng điều hướng trên: Breadcrumbs */}
          <div className="tku-exam-room-top-nav">
            <nav className="tku-exam-breadcrumbs" aria-label="Đường dẫn điều hướng bài học">
              <Link to="/courses" className="tku-exam-breadcrumb-link">
                Khóa học
              </Link>
              <ChevronRight size={13} className="tku-exam-breadcrumb-sep" />
              <Link
                to={`/courses/${courseId}/learn`}
                className="tku-exam-breadcrumb-link"
                title={assessment.courseTitle}
              >
                {assessment.courseTitle}
              </Link>
              {assessment.lessonTitle && (
                <>
                  <ChevronRight size={13} className="tku-exam-breadcrumb-sep" />
                  <span className="tku-exam-breadcrumb-lesson" title={assessment.lessonTitle}>
                    {assessment.lessonTitle}
                  </span>
                </>
              )}
              <ChevronRight size={13} className="tku-exam-breadcrumb-sep" />
              <span className="tku-exam-breadcrumb-current">Phòng làm bài</span>
            </nav>
          </div>

          {/* Card thông tin bài thi & Đồng hồ / Nộp bài */}
          <div className="tku-exam-room-card">
            <div className="tku-exam-room-card__left">
              <div className="tku-exam-room-card__title-row">
                <h1 className="tku-exam-room-card__title">{assessment.title}</h1>
                <span className="tku-exam-room-badge tku-exam-room-badge--attempt">
                  Lần thi số {assessment.attemptNumber}
                </span>
                <div
                  className="tku-exam-autosave-badge"
                  title="Hệ thống tự động lưu câu trả lời vào trình duyệt để bảo vệ bài thi không bị mất khi gặp sự cố mạng hoặc tải lại trang"
                >
                  <span className="tku-exam-autosave-dot" />
                  <span>
                    {lastSavedTime ? `Đã lưu nháp (${lastSavedTime})` : 'Tự động lưu nháp'}
                  </span>
                </div>
              </div>

              <div className="tku-exam-room-card__meta">
                <span className="tku-exam-room-meta-item">
                  <BookOpen size={14} />
                  <span>{assessment.lessonTitle || assessment.courseTitle}</span>
                </span>
                <span className="tku-exam-room-meta-sep">•</span>
                <span className="tku-exam-room-meta-item">
                  <HelpCircle size={14} />
                  <span>{questions.length} câu trắc nghiệm</span>
                </span>
                {assessment.durationMinutes ? (
                  <>
                    <span className="tku-exam-room-meta-sep">•</span>
                    <span className="tku-exam-room-meta-item">
                      <Clock size={14} />
                      <span>Thời lượng: {assessment.durationMinutes} phút</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="tku-exam-room-card__right">
              {/* Widget đồng hồ đếm ngược */}
              <div
                className={`tku-exam-timer-widget ${isTimerUrgent ? 'tku-exam-timer-widget--urgent' : ''}`}
                title="Thời gian làm bài còn lại"
              >
                <div className="tku-exam-timer-widget__label">
                  <Clock size={13} />
                  <span>Thời gian còn lại</span>
                </div>
                <div className="tku-exam-timer-widget__val">
                  {formattedTimer}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tku-exam-layout">
          {/* CỘT TRÁI: CÂU HỎI HIỆN TẠI VÀ CÁC LỰA CHỌN TRẢ LỜI */}
          <div className="tku-exam-main-col">
            {currentQuestion ? (
              <div className="tku-question-card">
                <div className="tku-question-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="tku-question-card__badge">
                      Câu {currentIndex + 1} / {questions.length}
                    </span>
                    <span className="tku-question-card__score-tag">
                      {currentQuestion.score ? `${currentQuestion.score} điểm` : 'Trắc nghiệm'}
                    </span>
                  </div>

                  {/* Nút Đánh dấu câu hỏi cần xem lại */}
                  <button
                    type="button"
                    className={`tku-question-card__flag-btn ${
                      flaggedQuestions[currentQuestion.id] ? 'is-flagged' : ''
                    }`}
                    onClick={() => handleToggleFlag(currentQuestion.id)}
                    title="Đánh dấu câu hỏi này để xem lại trước khi nộp bài"
                  >
                    <Flag size={14} />
                    <span>
                      {flaggedQuestions[currentQuestion.id] ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại'}
                    </span>
                  </button>
                </div>

                {/* Nội dung câu hỏi */}
                <div className="tku-question-card__content">
                  <MathText content={currentQuestion.content} />
                </div>

                {/* Danh sách các lựa chọn A, B, C, D */}
                <div className="tku-choice-list" role="radiogroup" aria-label="Các phương án trả lời">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                    const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);

                    return (
                      <div
                        key={option.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        className={`tku-choice-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            handleSelectOption(currentQuestion.id, option.id);
                          }
                        }}
                      >
                        <span className="tku-choice-letter">{letter}</span>
                        <span className="tku-choice-text">
                          <MathText content={option.content} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Thanh điều hướng: Câu trước & Câu tiếp theo */}
                <div className="tku-question-nav-bar" style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    className="tku-exam-back-btn"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    style={{ opacity: currentIndex === 0 ? 0.4 : 1, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Câu trước</span>
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {currentIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        className="tku-exam-submit-header-btn"
                        onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      >
                        <span>Câu tiếp theo</span>
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tku-exam-submit-header-btn"
                        onClick={() => setShowSubmitModal(true)}
                        style={{ background: '#10b981' }}
                      >
                        <Send size={15} />
                        <span>Nộp bài thi</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="tku-question-card" style={{ textAlign: 'center', padding: 40 }}>
                <p>Không tìm thấy nội dung câu hỏi.</p>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: QUESTION PALETTE BẢNG TRUY CẬP NHANH CÂU HỎI */}
          <aside className="tku-exam-side-col">
            <div className="tku-palette-card">
              <h2 className="tku-palette-title">
                <span>Bảng câu hỏi ({questions.length})</span>
              </h2>

              {/* Chú giải trạng thái */}
              <div className="tku-palette-stats">
                <span className="tku-palette-stat-badge">
                  <span className="tku-palette-stat-dot tku-palette-stat-dot--done" />
                  <span>Đã làm ({answeredCount})</span>
                </span>
                <span className="tku-palette-stat-badge">
                  <span className="tku-palette-stat-dot tku-palette-stat-dot--todo" />
                  <span>Chưa làm ({unansweredCount})</span>
                </span>
                {flaggedCount > 0 && (
                  <span className="tku-palette-stat-badge">
                    <span className="tku-palette-stat-dot tku-palette-stat-dot--flag" />
                    <span>Xem lại ({flaggedCount})</span>
                  </span>
                )}
              </div>

              {/* Lưới nút các số câu hỏi (1, 2, 3...) */}
              <div className="tku-palette-grid">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(selectedAnswers[q.id]);
                  const isCurrent = idx === currentIndex;
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`tku-palette-num-btn ${isAnswered ? 'is-answered' : ''} ${
                        isCurrent ? 'is-current' : ''
                      } ${isFlagged ? 'is-flagged' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                      title={`Câu ${idx + 1}${isAnswered ? ' - Đã làm' : ' - Chưa làm'}${
                        isFlagged ? ' (Đã đánh dấu)' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 2. MODAL XÁC NHẬN RỜI PHÒNG THI */}
      {!showSubmitModal && showExitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="tku-exam-modal-overlay"
          onClick={handleCloseExitModal}
        >
          <div
            className="tku-exam-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tku-exam-modal-header">
              <div className="tku-exam-modal-header__main">
                <div className="tku-exam-modal-header__icon tku-exam-modal-header__icon--warning">
                  <LogOut size={22} />
                </div>
                <div className="tku-exam-modal-header__text">
                  <h3 className="tku-exam-modal-title">Bạn có chắc chắn rời khỏi bài thi?</h3>
                  <p className="tku-exam-modal-subtitle" title={assessment.title}>
                    {assessment.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="tku-exam-modal-close-btn"
                onClick={handleCloseExitModal}
                title="Đóng cửa sổ"
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="tku-exam-modal-body">
              {/* Thống kê tiến độ hiện tại */}
              <div className="tku-exam-modal-stats-grid">
                <div>
                  <div className="tku-exam-modal-stat-value">{questions.length}</div>
                  <div className="tku-exam-modal-stat-label">Tổng số câu</div>
                </div>
                <div>
                  <div className="tku-exam-modal-stat-value" style={{ color: '#10b981' }}>
                    {answeredCount}
                  </div>
                  <div className="tku-exam-modal-stat-label">Đã trả lời</div>
                </div>
                <div>
                  <div
                    className="tku-exam-modal-stat-value"
                    style={{ color: unansweredCount > 0 ? '#ea580c' : '#64748b' }}
                  >
                    {unansweredCount}
                  </div>
                  <div className="tku-exam-modal-stat-label">Chưa làm</div>
                </div>
              </div>

              {/* Thông báo quy định học thuật khi rời phòng thi */}
              <div className="tku-exam-modal-notice">
                <h4 className="tku-exam-modal-notice-title">
                  <AlertTriangle size={16} />
                  <span>Lưu ý quan trọng trước khi rời bài làm:</span>
                </h4>
                <ul className="tku-exam-modal-notice-list">
                  {secondsLeft !== null && (
                    <li>
                      <strong>Thời gian đếm ngược:</strong> Đồng hồ làm bài vẫn tiếp tục chạy (còn <strong>{formattedTimer}</strong>) và không tạm dừng khi bạn thoát ra ngoài.
                    </li>
                  )}
                  <li>
                    <strong>Tự động lưu nháp:</strong> Hệ thống đã lưu lại <strong>{answeredCount}/{questions.length}</strong> câu trả lời bạn đã chọn trên thiết bị này.
                  </li>
                  {unansweredCount > 0 ? (
                    <li>
                      Bạn vẫn còn <strong>{unansweredCount} câu hỏi chưa hoàn thành</strong>. Hãy quay lại tiếp tục làm bài trước khi hết giờ để được chấm điểm đầy đủ.
                    </li>
                  ) : (
                    <li>
                      Bạn đã hoàn thành đủ tất cả câu hỏi! Bạn nên bấm <strong>Nộp bài thi</strong> thay vì rời đi để được tính điểm ngay.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="tku-exam-modal-footer">
              <button
                type="button"
                className="tku-exam-modal-btn tku-exam-modal-btn--danger-outline"
                onClick={handleConfirmExit}
              >
                <LogOut size={15} />
                <span>Rời phòng thi</span>
              </button>

              <button
                type="button"
                className="tku-exam-modal-btn tku-exam-modal-btn--primary"
                onClick={handleCloseExitModal}
              >
                <span>Ở lại làm tiếp</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL XÁC NHẬN NỘP BÀI THI */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="tku-exam-modal-overlay"
          onClick={() => !isSubmitting && setShowSubmitModal(false)}
        >
          <div
            className="tku-exam-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tku-exam-modal-header">
              <div className="tku-exam-modal-header__main">
                <div
                  className={`tku-exam-modal-header__icon ${
                    unansweredCount > 0
                      ? 'tku-exam-modal-header__icon--warning'
                      : 'tku-exam-modal-header__icon--success'
                  }`}
                >
                  {unansweredCount > 0 ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                </div>
                <div className="tku-exam-modal-header__text">
                  <h3 className="tku-exam-modal-title">
                    {unansweredCount > 0 ? 'Chưa hoàn thành hết câu hỏi' : 'Xác nhận nộp bài thi'}
                  </h3>
                  <p className="tku-exam-modal-subtitle" title={assessment.title}>
                    {assessment.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="tku-exam-modal-close-btn"
                onClick={() => !isSubmitting && setShowSubmitModal(false)}
                title="Đóng cửa sổ"
                aria-label="Đóng cửa sổ"
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="tku-exam-modal-body">
              {/* Thống kê tiến độ */}
              <div className="tku-exam-modal-stats-grid">
                <div>
                  <div className="tku-exam-modal-stat-value">{questions.length}</div>
                  <div className="tku-exam-modal-stat-label">Tổng số câu</div>
                </div>
                <div>
                  <div className="tku-exam-modal-stat-value" style={{ color: '#10b981' }}>
                    {answeredCount}
                  </div>
                  <div className="tku-exam-modal-stat-label">Đã làm</div>
                </div>
                <div>
                  <div
                    className="tku-exam-modal-stat-value"
                    style={{ color: unansweredCount > 0 ? '#ef4444' : '#64748b' }}
                  >
                    {unansweredCount}
                  </div>
                  <div className="tku-exam-modal-stat-label">Chưa làm</div>
                </div>
              </div>

              {unansweredCount > 0 ? (
                <div
                  className="tku-exam-modal-notice"
                  style={{ background: '#fffbeb', borderColor: '#fef3c7' }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                    ⚠️ Bạn vẫn còn <strong>{unansweredCount}</strong> câu hỏi chưa trả lời. Bạn có chắc chắn muốn nộp bài ngay bây giờ để hệ thống tính điểm?
                  </p>
                </div>
              ) : (
                <div
                  className="tku-exam-modal-notice"
                  style={{ background: '#ecfdf5', borderColor: '#d1fae5' }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: '#065f46', lineHeight: 1.5 }}>
                    ✅ Bạn đã trả lời đầy đủ tất cả các câu hỏi. Bấm xác nhận để nộp bài và xem điểm số cùng lời giải chi tiết.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="tku-exam-modal-footer">
              <button
                type="button"
                className="tku-exam-modal-btn tku-exam-modal-btn--secondary"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                className="tku-exam-modal-btn tku-exam-modal-btn--success"
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="tku-learning-spinner" />
                ) : (
                  <Send size={15} />
                )}
                <span>Xác nhận nộp bài</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER HỆ THỐNG */}
      <Footer />
    </div>
  );
};

export default CourseExamRoomPage;
