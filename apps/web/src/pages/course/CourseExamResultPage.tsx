import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  History,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  courseService,
  type AssessmentResultResponse,
  type AssessmentHistoryItem,
} from '../../services/course.service';
import { useAuth } from '../../context/useAuth';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { MathText } from '../../components/common/MathText';
import './courseExamRoom.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const CourseExamResultPage: React.FC = () => {
  const { courseId, assessmentId, submissionId } = useParams<{
    courseId: string;
    assessmentId: string;
    submissionId: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackCardRef = useRef<HTMLDivElement | null>(null);

  // Xử lý làm lại bài thi: xóa dữ liệu lưu tạm bài cũ và điều hướng về phòng làm bài
  const handleRetakeExam = () => {
    if (!courseId || !assessmentId) return;
    if (typeof window !== 'undefined') {
      try {
        if (user?.id) {
          localStorage.removeItem(`tku_exam_draft_${user.id}_${assessmentId}`);
        }
        localStorage.removeItem(`tku_exam_draft_guest_${assessmentId}`);
      } catch (e) {
        console.error('Không thể dọn dẹp nháp:', e);
      }
    }
    navigate(`/courses/${courseId}/exams/${assessmentId}`);
  };

  // Khi học viên bấm nút Lui trên trình duyệt ở trang kết quả, đưa học viên về lại phòng học
  useEffect(() => {
    const handlePopState = () => {
      navigate(courseId ? `/courses/${courseId}/learn` : '/courses', { replace: true });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [courseId, navigate]);

  // State
  const [resultData, setResultData] = useState<AssessmentResultResponse | null>(null);
  const [historyList, setHistoryList] = useState<AssessmentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tabs: 'solutions' | 'history'
  const [activeTab, setActiveTab] = useState<'solutions' | 'history'>('solutions');

  // Solution question filter: 'all' | 'correct' | 'wrong' | 'skipped'
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  // Modal to preview handwritten solution file
  const [previewSolutionUrl, setPreviewSolutionUrl] = useState<{
    url: string;
    questionNum: number;
  } | null>(null);

  // Tự động cuộn mượt đến khung lời phê của Giảng viên khi dữ liệu đã sẵn sàng
  useEffect(() => {
    if (resultData?.submission?.feedback && feedbackCardRef.current) {
      feedbackCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [resultData?.submission?.feedback]);

  // Khóa cuộn trang và hỗ trợ phím Escape đóng modal xem lời giải viết tay
  useEffect(() => {
    if (!previewSolutionUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewSolutionUrl(null);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewSolutionUrl]);

  const [refreshKey, setRefreshKey] = useState(0);

  // Lắng nghe sự kiện thông báo mới hoặc sự kiện refresh từ chuông thông báo
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('tku:new-notification', handleRefresh);
    window.addEventListener('tku:refresh-exam-result', handleRefresh);

    return () => {
      window.removeEventListener('tku:new-notification', handleRefresh);
      window.removeEventListener('tku:refresh-exam-result', handleRefresh);
    };
  }, []);

  // Tải dữ liệu kết quả bài thi và lịch sử làm bài (hỗ trợ Stale-While-Revalidate không chớp màn hình trắng khi refresh)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!courseId || !assessmentId || !submissionId) return;
      if (!hasLoadedOnceRef.current) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const [resultRes, historyRes] = await Promise.all([
          courseService.getAssessmentResult(courseId, assessmentId, submissionId),
          courseService.getAssessmentHistory(courseId, assessmentId).catch(() => ({ history: [] })),
        ]);

        if (!isMounted) return;
        setResultData(resultRes);
        setHistoryList(historyRes.history || []);
        hasLoadedOnceRef.current = true;
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải kết quả bài thi.';
        setErrorMessage(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, assessmentId, submissionId, refreshKey, location.key, location.search]);

  // Score styling
  const scoreNumber = resultData?.submission.score ?? 0;
  const scoreColor = useMemo(() => {
    if (scoreNumber >= 8.0) return { border: '#10b981', text: '#10b981', bg: '#ecfdf5' };
    if (scoreNumber >= 5.0) return { border: '#1d68f2', text: '#1d68f2', bg: '#eff6ff' };
    return { border: '#ef4444', text: '#ef4444', bg: '#fef2f2' };
  }, [scoreNumber]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!resultData) return [];
    const qs = resultData.questions;
    if (filterType === 'correct') {
      return qs.filter((q) => q.isCorrect);
    }
    if (filterType === 'wrong') {
      return qs.filter((q) => !q.isCorrect && q.selectedOptionId !== null);
    }
    if (filterType === 'skipped') {
      return qs.filter((q) => !q.selectedOptionId);
    }
    return qs;
  }, [resultData, filterType]);

  // Format date
  const formattedSubmitTime = useMemo(() => {
    const raw = resultData?.submission.submittedAt || resultData?.submission.createdAt;
    if (!raw) return '';
    try {
      const d = new Date(raw);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return raw;
    }
  }, [resultData]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="tku-exam-page">
        <Navbar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
          <Loader2 className="tku-learning-spinner" size={44} style={{ color: '#1d68f2', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Đang tải kết quả và đáp án chi tiết...
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Hệ thống đang chuẩn bị bảng điểm và lời giải viết tay từ giảng viên TKU.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // Error Screen
  if (errorMessage || !resultData) {
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
              Không tìm thấy kết quả bài thi
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              {errorMessage || 'Lượt thi này không tồn tại hoặc bạn chưa có quyền xem kết quả.'}
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

  const { assessment, submission, stats } = resultData;

  return (
    <div className="tku-exam-page">
      {/* 1. THANH ĐIỀU HƯỚNG CHÍNH CỦA HỆ THỐNG TKU */}
      <Navbar />

      {/* 2. BODY CONTENT */}
      <main className="tku-exam-container" style={{ flex: 1, paddingBottom: 60, paddingTop: 24 }}>
        {/* THANH ĐIỀU HƯỚNG & TIÊU ĐỀ TRANG (BỐ CỤC CHUẨN HỌC THUẬT) */}
        <div className="tku-result-page-header">
          <div className="tku-result-page-header__title-group">
            <nav className="tku-result-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/courses" className="tku-result-breadcrumb-link">
                Khóa học
              </Link>
              <ChevronRight size={12} className="tku-result-breadcrumb-sep" />
              <Link
                to={`/courses/${courseId}/learn`}
                className="tku-result-breadcrumb-link"
                title={assessment.courseTitle}
              >
                {assessment.courseTitle}
              </Link>
              <ChevronRight size={12} className="tku-result-breadcrumb-sep" />
              <span className="tku-result-breadcrumb-current">Kết quả bài thi</span>
            </nav>

            <div className="tku-result-page-title-row">
              <h1 className="tku-result-page-title">
                Kết quả: {assessment.title}
              </h1>
              <span className="tku-result-page-attempt-badge">
                Lần nộp bài số {submission.attemptNumber}
              </span>
            </div>
          </div>

          {/* Nhóm nút thao tác học thuật: Làm lại bài thi & Về bài học */}
          <div className="tku-result-header-actions">
            <button
              type="button"
              className="tku-result-retake-btn"
              onClick={handleRetakeExam}
              title="Làm lại bài thi này để cải thiện điểm số và rèn luyện kiến thức"
            >
              <RotateCcw size={15} />
              <span>Làm lại bài thi</span>
            </button>

            <Link
              to={`/courses/${courseId}/learn`}
              className="tku-result-back-learn-btn"
              title="Quay lại phòng học bài giảng"
            >
              <ArrowLeft size={16} />
              <span>Về bài học</span>
            </Link>
          </div>
        </div>

        {/* HERO CARD: ĐIỂM SỐ & THỐNG KÊ KẾT QUẢ */}
        <section className="tku-result-header-card">
          <div className="tku-result-hero">
            <div className="tku-result-hero__left">
              {/* Vòng tròn điểm số */}
              <div
                className="tku-result-score-circle"
                style={{
                  borderColor: scoreColor.border,
                  backgroundColor: scoreColor.bg,
                }}
              >
                <span className="tku-result-score-num" style={{ color: scoreColor.text }}>
                  {submission.score !== null ? submission.score.toFixed(1) : '0.0'}
                </span>
                <span className="tku-result-score-max">/ 10 điểm</span>
              </div>

              {/* Thông tin bài thi & đánh giá */}
              <div className="tku-result-hero__info">
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                  {assessment.title}
                </h2>
                <p>
                  Nộp lúc: <strong>{formattedSubmitTime}</strong> • Lần thi số {submission.attemptNumber}
                </p>
                <div style={{ marginTop: 8 }}>
                  {scoreNumber >= 8.0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#ecfdf5',
                        color: '#059669',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} /> Kết quả xuất sắc! Bạn đã nắm rất vững kiến thức.
                    </span>
                  ) : scoreNumber >= 5.0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#eff6ff',
                        color: '#1d68f2',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={14} /> Bạn đã hoàn thành đạt yêu cầu. Hãy xem lời giải để khắc phục các câu sai.
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={14} /> Bạn cần ôn lại bài giảng và xem kỹ hướng dẫn giải chi tiết dưới đây.
                    </span>
                  )}
                </div>

                {submission.feedback && (
                  <div
                    ref={feedbackCardRef}
                    className="tku-student-feedback-box"
                    style={{
                      marginTop: 14,
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                      border: '1.5px solid #10b981',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#10b981',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <MessageSquare size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#065f46',
                          marginBottom: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>Lời nhận xét & Lời phê của Giảng viên:</span>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#1e293b',
                          fontStyle: 'italic',
                          lineHeight: 1.5,
                        }}
                      >
                        "{submission.feedback}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                className={`tku-exam-back-btn ${activeTab === 'solutions' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('solutions')}
                style={{
                  background: activeTab === 'solutions' ? '#eff6ff' : '#ffffff',
                  borderColor: activeTab === 'solutions' ? '#1d68f2' : '#e2e8f0',
                  color: activeTab === 'solutions' ? '#1d68f2' : '#334155',
                  fontWeight: 600,
                }}
              >
                <FileCheck size={16} />
                <span>Xem đáp án & Lời giải ({stats.totalQuestions})</span>
              </button>

              <button
                type="button"
                className={`tku-exam-back-btn ${activeTab === 'history' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('history')}
                style={{
                  background: activeTab === 'history' ? '#eff6ff' : '#ffffff',
                  borderColor: activeTab === 'history' ? '#1d68f2' : '#e2e8f0',
                  color: activeTab === 'history' ? '#1d68f2' : '#334155',
                  fontWeight: 600,
                }}
              >
                <History size={16} />
                <span>Lịch sử các lần thi ({historyList.length})</span>
              </button>
            </div>
          </div>

          {/* Grid thống kê 4 ô */}
          <div className="tku-result-grid-stats">
            <div className="tku-result-stat-card">
              <div className="tku-result-stat-val" style={{ color: '#0f172a' }}>
                {stats.totalQuestions}
              </div>
              <div className="tku-result-stat-lbl">Tổng số câu</div>
            </div>
            <div className="tku-result-stat-card">
              <div className="tku-result-stat-val" style={{ color: '#10b981' }}>
                {stats.correctCount}
              </div>
              <div className="tku-result-stat-lbl">Số câu đúng</div>
            </div>
            <div className="tku-result-stat-card">
              <div className="tku-result-stat-val" style={{ color: '#ef4444' }}>
                {stats.wrongCount}
              </div>
              <div className="tku-result-stat-lbl">Số câu sai</div>
            </div>
            <div className="tku-result-stat-card">
              <div className="tku-result-stat-val" style={{ color: '#94a3b8' }}>
                {stats.skippedCount}
              </div>
              <div className="tku-result-stat-lbl">Chưa trả lời</div>
            </div>
          </div>
        </section>

        {/* TAB 1: XEM ĐÁP ÁN & LỜI GIẢI CHI TIẾT */}
        {activeTab === 'solutions' && (
          <div>
            {/* Bộ lọc câu hỏi */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginRight: 4 }}>
                Lọc câu hỏi:
              </span>
              <button
                type="button"
                className={`tku-exam-back-btn ${filterType === 'all' ? 'is-active' : ''}`}
                onClick={() => setFilterType('all')}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  background: filterType === 'all' ? '#1d68f2' : '#ffffff',
                  color: filterType === 'all' ? '#ffffff' : '#475569',
                  borderColor: filterType === 'all' ? '#1d68f2' : '#e2e8f0',
                }}
              >
                Tất cả ({resultData.questions.length})
              </button>
              <button
                type="button"
                className={`tku-exam-back-btn ${filterType === 'correct' ? 'is-active' : ''}`}
                onClick={() => setFilterType('correct')}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  background: filterType === 'correct' ? '#10b981' : '#ffffff',
                  color: filterType === 'correct' ? '#ffffff' : '#059669',
                  borderColor: filterType === 'correct' ? '#10b981' : '#e2e8f0',
                }}
              >
                Câu đúng ({stats.correctCount})
              </button>
              <button
                type="button"
                className={`tku-exam-back-btn ${filterType === 'wrong' ? 'is-active' : ''}`}
                onClick={() => setFilterType('wrong')}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  background: filterType === 'wrong' ? '#ef4444' : '#ffffff',
                  color: filterType === 'wrong' ? '#ffffff' : '#dc2626',
                  borderColor: filterType === 'wrong' ? '#ef4444' : '#e2e8f0',
                }}
              >
                Câu sai ({stats.wrongCount})
              </button>
              {stats.skippedCount > 0 && (
                <button
                  type="button"
                  className={`tku-exam-back-btn ${filterType === 'skipped' ? 'is-active' : ''}`}
                  onClick={() => setFilterType('skipped')}
                  style={{
                    fontSize: 13,
                    padding: '6px 12px',
                    background: filterType === 'skipped' ? '#64748b' : '#ffffff',
                    color: filterType === 'skipped' ? '#ffffff' : '#64748b',
                    borderColor: filterType === 'skipped' ? '#64748b' : '#e2e8f0',
                  }}
                >
                  Chưa trả lời ({stats.skippedCount})
                </button>
              )}
            </div>

            {/* Danh sách thẻ câu hỏi & lời giải */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {filteredQuestions.map((q, idx) => {
                const questionNumber = q.sortOrder || idx + 1;
                const isSkipped = !q.selectedOptionId;

                return (
                  <div
                    key={q.id}
                    className={`tku-solution-card ${
                      q.isCorrect ? 'is-correct' : isSkipped ? '' : 'is-wrong'
                    }`}
                  >
                    {/* Header câu hỏi */}
                    <div className="tku-question-card__header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="tku-question-card__badge">Câu {questionNumber}</span>
                        {q.isCorrect ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 13,
                              color: '#059669',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={16} /> Chính xác (+{q.score} điểm)
                          </span>
                        ) : isSkipped ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 13,
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            <AlertCircle size={15} /> Chưa trả lời (0 điểm)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 13,
                              color: '#dc2626',
                              fontWeight: 700,
                            }}
                          >
                            <XCircle size={16} /> Sai (0 điểm)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div className="tku-question-card__content">
                      <MathText content={q.content} />
                    </div>

                    {/* Danh sách lựa chọn A, B, C, D (cho trắc nghiệm) hoặc câu trả lời tự luận */}
                    {q.type === 'TEXT' ? (
                      <div className="tku-solution-text-answer-box">
                        <span className="tku-solution-text-answer-label">Câu trả lời tự luận của bạn:</span>
                        <div className="tku-solution-text-answer-content">
                          {q.answerText ? (
                            q.answerText
                          ) : (
                            <em style={{ color: '#94a3b8' }}>Chưa nhập câu trả lời</em>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {q.options.map((opt, optIdx) => {
                          const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                          const isStudentChoice = q.selectedOptionId === opt.id;
                          const isCorrectOption = opt.isCorrect;

                          let itemClass = 'tku-solution-choice';
                          if (isCorrectOption) {
                            itemClass += ' tku-solution-choice--correct-ans';
                          } else if (isStudentChoice && !isCorrectOption) {
                            itemClass += ' tku-solution-choice--wrong-user';
                          }

                          return (
                            <div key={opt.id} className={itemClass}>
                              <span className="tku-choice-letter" style={{ width: 28, height: 28, fontSize: 13 }}>
                                {letter}
                              </span>
                              <span style={{ flex: 1, fontSize: 14.5, color: 'inherit' }}>
                                <MathText content={opt.content} />
                              </span>

                              {/* Badge chỉ định trạng thái lựa chọn */}
                              {isStudentChoice && isCorrectOption && (
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <CheckCircle2 size={15} /> Lựa chọn của bạn (Đúng)
                                </span>
                              )}

                              {isStudentChoice && !isCorrectOption && (
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#dc2626',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <XCircle size={15} /> Lựa chọn của bạn (Sai)
                                </span>
                              )}

                              {!isStudentChoice && isCorrectOption && (
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <CheckCircle2 size={15} /> Đáp án chính xác
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* KHỐI HƯỚNG DẪN GIẢI CHI TIẾT & LỜI GIẢI VIẾT TAY */}
                    {(q.solutionText || q.solutionFileUrl) && (
                      <div className="tku-solution-box">
                        <div className="tku-solution-box__title">
                          <Sparkles size={16} style={{ color: '#0284c7' }} />
                          <span>Hướng dẫn giải chi tiết từ giảng viên</span>
                        </div>

                        {q.solutionText && (
                          <div className="tku-solution-box__text">
                            <MathText content={q.solutionText} />
                          </div>
                        )}

                        {/* Nút xem lời giải viết tay do giảng viên upload */}
                        {q.solutionFileUrl && (
                          <div style={{ marginTop: 12 }}>
                            {!/\.(pdf)($|\?)/i.test(q.solutionFileUrl) && (
                              <div
                                className="tku-handwritten-preview-wrap"
                                onClick={() =>
                                  setPreviewSolutionUrl({
                                    url: q.solutionFileUrl!,
                                    questionNum: questionNumber,
                                  })
                                }
                                title="Bấm để phóng to xem chi tiết ảnh lời giải"
                              >
                                <img
                                  src={q.solutionFileUrl}
                                  alt={`Lời giải viết tay câu ${questionNumber}`}
                                  className="tku-handwritten-preview-img"
                                  loading="lazy"
                                />
                                <div className="tku-handwritten-preview-overlay">
                                  <ExternalLink size={16} />
                                  <span>Phóng to xem chi tiết</span>
                                </div>
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                className="tku-handwritten-btn"
                                onClick={() =>
                                  setPreviewSolutionUrl({
                                    url: q.solutionFileUrl!,
                                    questionNum: questionNumber,
                                  })
                                }
                              >
                                <FileText size={15} />
                                <span>Xem lời giải viết tay của giảng viên (Bản gốc)</span>
                                <ExternalLink size={13} style={{ marginLeft: 4 }} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredQuestions.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                    Không có câu hỏi nào thuộc phân loại này.
                  </p>
                </div>
              )}

              {/* KHỐI KÊU GỌI LÀM LẠI BÀI THI SAU KHI ÔN TẬP XONG ĐÁP ÁN */}
              <div className="tku-result-retake-card">
                <div className="tku-result-retake-card__info">
                  <h3 className="tku-result-retake-card__title">
                    <Sparkles size={18} style={{ color: '#1d68f2' }} />
                    <span>Bạn đã xem xong đáp án và lời giải chi tiết!</span>
                  </h3>
                  <p className="tku-result-retake-card__desc">
                    Hãy thử sức làm lại bài thi để kiểm tra sự tiến bộ và nâng cao thành tích học tập nhé.
                  </p>
                </div>
                <div className="tku-result-retake-card__actions">
                  <button
                    type="button"
                    className="tku-result-retake-btn"
                    onClick={handleRetakeExam}
                    title="Bắt đầu lượt làm bài thi mới"
                  >
                    <RotateCcw size={15} />
                    <span>Làm lại bài thi ngay</span>
                  </button>
                  <Link
                    to={`/courses/${courseId}/learn`}
                    className="tku-result-back-learn-btn"
                    title="Quay lại danh sách bài giảng"
                  >
                    <ArrowLeft size={15} />
                    <span>Về bài học</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH SỬ CÁC LẦN THI CỦA HỌC SINH */}
        {activeTab === 'history' && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Lịch sử làm bài thi của bạn ({historyList.length} lần thi)
              </h2>
              <button
                type="button"
                className="tku-exam-submit-header-btn"
                style={{ padding: '8px 16px', fontSize: 13.5, cursor: 'pointer' }}
                onClick={handleRetakeExam}
                title="Bắt đầu làm lại bài thi"
              >
                <RotateCcw size={14} />
                <span>Làm lại bài thi</span>
              </button>
            </div>

            {historyList.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="tku-history-table">
                  <thead>
                    <tr>
                      <th>Lần thi</th>
                      <th>Thời gian nộp bài</th>
                      <th>Điểm số</th>
                      <th>Đánh giá</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item) => {
                      const isCurrentSubmission = item.id === submission.id;
                      const dateStr = item.submittedAt || item.createdAt;
                      const formattedDate = dateStr
                        ? new Date(dateStr).toLocaleString('vi-VN')
                        : 'N/A';
                      const itemScore = item.score !== null ? item.score : 0;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            background: isCurrentSubmission ? '#f0f9ff' : 'transparent',
                          }}
                        >
                          <td>
                            <strong>Lần {item.attemptNumber}</strong>
                            {isCurrentSubmission && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                }}
                              >
                                Đang xem
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#475569' }}>{formattedDate}</td>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 15,
                                color:
                                  itemScore >= 8.0
                                    ? '#059669'
                                    : itemScore >= 5.0
                                    ? '#1d68f2'
                                    : '#dc2626',
                              }}
                            >
                              {item.score !== null ? item.score.toFixed(1) : 'Chưa chấm'}/10
                            </span>
                          </td>
                          <td>
                            {itemScore >= 8.0 ? (
                              <span style={{ color: '#059669', fontSize: 13 }}>Xuất sắc</span>
                            ) : itemScore >= 5.0 ? (
                              <span style={{ color: '#1d68f2', fontSize: 13 }}>Đạt</span>
                            ) : (
                              <span style={{ color: '#dc2626', fontSize: 13 }}>Cần cố gắng</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link
                              to={`/courses/${courseId}/exams/${assessmentId}/results/${item.id}`}
                              className="tku-exam-back-btn"
                              style={{
                                padding: '5px 12px',
                                fontSize: 12.5,
                                textDecoration: 'none',
                              }}
                            >
                              <Eye size={13} />
                              <span>Xem lại</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 14, margin: '20px 0 0' }}>
                Chưa có dữ liệu lịch sử thi.
              </p>
            )}
          </div>
        )}
      </main>

      {/* 3. MODAL XEM LỜI GIẢI VIẾT TAY DO GIẢNG VIÊN UPLOAD */}
      {previewSolutionUrl && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setPreviewSolutionUrl(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 880,
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: 16,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Lời giải viết tay - Câu {previewSolutionUrl.questionNum}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={previewSolutionUrl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="tku-exam-back-btn"
                  style={{ padding: '6px 12px', fontSize: 12.5 }}
                >
                  <ExternalLink size={13} />
                  <span>Mở tab mới</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewSolutionUrl(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 6,
                    borderRadius: 6,
                  }}
                  title="Đóng cửa sổ"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Hiển thị hình ảnh hoặc iframe PDF */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
              }}
            >
              {/\.(pdf)($|\?)/i.test(previewSolutionUrl.url) ? (
                <iframe
                  src={previewSolutionUrl.url}
                  title="Tài liệu lời giải viết tay"
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
                />
              ) : (
                <img
                  src={previewSolutionUrl.url}
                  alt={`Lời giải viết tay câu ${previewSolutionUrl.questionNum}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    objectFit: 'contain',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER TOÀN HỆ THỐNG */}
      <Footer />
    </div>
  );
};

export default CourseExamResultPage;
