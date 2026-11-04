import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  Send,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from '../../context/toastService';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import {
  lecturerService,
  type AssessmentResultsSummary,
  type AssignmentItem,
  type LecturerCourseItem,
  type StudentSubmissionDetail,
} from '../../services/lecturer.service';
import './lecturerResults.css';

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

const StudentAvatar: React.FC<StudentAvatarProps> = React.memo(
  ({ name, avatarUrl, className = 'tku-student-avatar' }) => {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    const initials = useMemo(() => {
      if (!name) return 'SV';
      const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
      return clean.slice(0, 2).toUpperCase() || 'SV';
    }, [name]);

    const showImg = Boolean(avatarUrl && failedUrl !== avatarUrl);

    return (
      <div
        className={`${className} ${
          showImg ? 'tku-student-avatar--has-img' : 'tku-student-avatar--initials'
        }`}
      >
        {showImg ? (
          <img
            key={avatarUrl!}
            src={avatarUrl!}
            alt={name}
            className="tku-student-avatar-img"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(avatarUrl!)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  },
);
StudentAvatar.displayName = 'StudentAvatar';

const GRADE_TIER_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả xếp loại học lực' },
  { value: 'EXCELLENT', label: 'Xuất sắc (≥ 9.0 đ)' },
  { value: 'GOOD', label: 'Giỏi (8.0 - 8.9 đ)' },
  { value: 'AVERAGE', label: 'Khá / TB (5.0 - 7.9 đ)' },
  { value: 'WEAK', label: 'Yếu (4.0 - 4.9 đ)' },
  { value: 'POOR', label: 'Kém (< 4.0 đ)' },
];

const SUBMISSION_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'Tất cả trạng thái nộp' },
  { value: 'GRADED', label: 'Nộp đúng hạn' },
  { value: 'LATE', label: 'Nộp muộn' },
  { value: 'NOT_SUBMITTED', label: 'Chưa nộp bài' },
];


export const LecturerResultsPage: React.FC = () => {
  const { id: routeAssessmentId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Navigation context
  const queryAssessmentId = searchParams.get('assessmentId');
  const queryCourseId = searchParams.get('courseId');
  const querySearch = searchParams.get('search');
  const targetAssessmentId = routeAssessmentId || queryAssessmentId;

  // Data states
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  const [assessments, setAssessments] = useState<AssignmentItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    queryCourseId || 'ALL',
  );
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    targetAssessmentId || '',
  );
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [resultsCache, setResultsCache] = useState<
    Record<string, AssessmentResultsSummary>
  >({});

  // Active results data directly from state cache
  const resultsData = selectedAssessmentId
    ? resultsCache[selectedAssessmentId] || null
    : null;

  // Loading states
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [failedFetchIds, setFailedFetchIds] = useState<Set<string>>(new Set());
  const isLoadingDetail = Boolean(
    selectedAssessmentId &&
      !resultsCache[selectedAssessmentId] &&
      !failedFetchIds.has(selectedAssessmentId),
  );

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'QUESTIONS'>(
    'SUBMISSIONS',
  );
  const [searchTerm, setSearchTerm] = useState(querySearch || '');
  const [gradeTierFilter, setGradeTierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Submission Review Modal State
  const [reviewSubmission, setReviewSubmission] =
    useState<StudentSubmissionDetail | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Đồng bộ assessmentId từ URL params theo chuẩn React
  const [prevTargetAssessmentId, setPrevTargetAssessmentId] = useState<string | null>(targetAssessmentId);

  if (targetAssessmentId && targetAssessmentId !== prevTargetAssessmentId) {
    setPrevTargetAssessmentId(targetAssessmentId);
    setSelectedAssessmentId(targetAssessmentId);
  }

  // Deep-link: Tự động mở modal bài nộp khi điều hướng từ thông báo (query: submissionId)
  const querySubmissionId = searchParams.get('submissionId');
  const [prevQuerySubmissionId, setPrevQuerySubmissionId] = useState<string | null>(null);
  if (querySubmissionId && querySubmissionId !== prevQuerySubmissionId && resultsData?.submissions) {
    setPrevQuerySubmissionId(querySubmissionId);
    const targetSub = resultsData.submissions.find((s) => s.id === querySubmissionId);
    if (targetSub) {
      setReviewSubmission(targetSub);
      setFeedbackInput(targetSub.feedback || '');
    }
  } else if (!querySubmissionId && prevQuerySubmissionId !== null) {
    setPrevQuerySubmissionId(null);
  }

  // Load courses and assessments only once on component mount
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const [coursesRes, assessmentsRes] = await Promise.all([
          lecturerService.getMyCourses(),
          lecturerService.getAssessments(),
        ]);

        if (isMounted) {
          const courseList = coursesRes.courses || [];
          setCourses(courseList);
          setAssessments(assessmentsRes);

          // Determine which assessment to select initially
          if (assessmentsRes.length > 0) {
            let initialId = assessmentsRes[0].id;
            let initialCourseId = queryCourseId || 'ALL';

            if (targetAssessmentId) {
              const matched = assessmentsRes.find(
                (a) => a.id === targetAssessmentId,
              );
              if (matched) {
                initialId = matched.id;
                if (!queryCourseId && matched.courseId) {
                  initialCourseId = matched.courseId;
                }
              }
            } else if (queryCourseId && queryCourseId !== 'ALL') {
              const matchedInCourse = assessmentsRes.find(
                (a) => a.courseId === queryCourseId,
              );
              if (matchedInCourse) {
                initialId = matchedInCourse.id;
              }
            }

            setSelectedAssessmentId(initialId);
            setSelectedCourseId(initialCourseId);
          }
        }
      } catch {
        if (isMounted) {
          toast.error('Không thể tải danh sách bài tập hoặc khóa học');
        }
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    };

    initData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load results details whenever selectedAssessmentId changes (with instant state cache)
  useEffect(() => {
    let isMounted = true;
    if (!selectedAssessmentId) return;

    // If already in cache, instant display without re-fetching
    if (resultsCache[selectedAssessmentId]) return;

    lecturerService
      .getAssessmentResults(selectedAssessmentId)
      .then((summary) => {
        if (isMounted && summary) {
          setResultsCache((prev) => ({
            ...prev,
            [selectedAssessmentId]: summary,
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setFailedFetchIds((prev) => new Set(prev).add(selectedAssessmentId));
          toast.error('Không thể tải thống kê kết quả bài tập');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAssessmentId, resultsCache]);

  // Handle course filter changes for the assessment selector
  const availableAssessments = useMemo(() => {
    let list = assessments;
    if (selectedCourseId !== 'ALL') {
      list = list.filter((a) => a.courseId === selectedCourseId);
    }
    if (typeFilter !== 'ALL') {
      list = list.filter((a) => a.type === typeFilter);
    }
    return list;
  }, [assessments, selectedCourseId, typeFilter]);
  // Options for custom selects
  const courseOptions = useMemo<CustomSelectOption[]>(() => {
    const list: CustomSelectOption[] = [
      { value: 'ALL', label: 'Tất cả các khóa học' },
    ];
    courses.forEach((c) => {
      list.push({
        value: c.id,
        label: `${c.title} (${c.studentCount} học sinh)`,
      });
    });
    return list;
  }, [courses]);

  const assessmentOptions = useMemo<CustomSelectOption[]>(() => {
    if (availableAssessments.length === 0) {
      return [{ value: '', label: 'Hiện tại không có bài kiểm tra hay câu hỏi nào' }];
    }
    return availableAssessments.map((a) => ({
      value: a.id,
      label: `${a.title} (${a.type === 'EXAM' ? 'Đề thi' : a.type === 'TEST' ? 'Kiểm tra' : 'Quiz'} - ${a.questionCount} câu - Thang ${a.totalScore}đ)`,
    }));
  }, [availableAssessments]);

  const handleAssessmentChange = useCallback(
    (assessmentId: string) => {
      if (!assessmentId || assessmentId === selectedAssessmentId) return;
      setSelectedAssessmentId(assessmentId);
      setSearchParams((prev) => {
        const nextParams = new URLSearchParams(prev);
        nextParams.set('assessmentId', assessmentId);
        return nextParams;
      });
    },
    [selectedAssessmentId, setSearchParams, setSelectedAssessmentId],
  );

  const handleCourseChange = useCallback(
    (courseId: string) => {
      setSelectedCourseId(courseId);
      const filtered =
        courseId === 'ALL'
          ? assessments
          : assessments.filter((a) => a.courseId === courseId);

      if (filtered.length > 0) {
        // If current assessment is already part of the selected course, keep it smoothly without reloading!
        const isCurrentStillAvailable = filtered.some(
          (a) => a.id === selectedAssessmentId,
        );
        if (isCurrentStillAvailable) {
          setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            if (courseId === 'ALL') nextParams.delete('courseId');
            else nextParams.set('courseId', courseId);
            return nextParams;
          });
          return;
        }

        const nextId = filtered[0].id;
        setSelectedAssessmentId(nextId);
        setSearchParams((prev) => {
          const nextParams = new URLSearchParams(prev);
          if (courseId === 'ALL') nextParams.delete('courseId');
          else nextParams.set('courseId', courseId);
          nextParams.set('assessmentId', nextId);
          return nextParams;
        });
      } else {
        setSelectedAssessmentId('');
        setSearchParams((prev) => {
          const nextParams = new URLSearchParams(prev);
          if (courseId === 'ALL') nextParams.delete('courseId');
          else nextParams.set('courseId', courseId);
          nextParams.delete('assessmentId');
          return nextParams;
        });
      }
    },
    [assessments, selectedAssessmentId, setSearchParams, setSelectedAssessmentId],
  );

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    if (!resultsData?.submissions) return [];
    return resultsData.submissions.filter((sub) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = sub.studentName.toLowerCase().includes(term);
        const matchEmail = sub.studentEmail.toLowerCase().includes(term);
        if (!matchName && !matchEmail) return false;
      }

      if (gradeTierFilter !== 'ALL' && sub.gradeTier !== gradeTierFilter) {
        return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'LATE' && !sub.isLate) return false;
        if (statusFilter === 'GRADED' && sub.status !== 'GRADED') return false;
        if (statusFilter === 'NOT_SUBMITTED' && sub.status !== 'NOT_SUBMITTED') return false;
      }

      return true;
    });
  }, [resultsData, searchTerm, gradeTierFilter, statusFilter]);

  // Open Submission Review Modal
  const handleOpenReview = useCallback((sub: StudentSubmissionDetail) => {
    setReviewSubmission(sub);
    setFeedbackInput(sub.feedback || '');
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewSubmission(null);
    setFeedbackInput('');
    if (searchParams.get('submissionId')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('submissionId');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);



  // Save Teacher Feedback
  const handleSaveFeedback = useCallback(async () => {
    if (!reviewSubmission) return;
    setIsSavingFeedback(true);
    try {
      const ok = await lecturerService.saveSubmissionFeedback(reviewSubmission.id, feedbackInput);
      if (ok) {
        toast.success(`Đã lưu nhận xét cho sinh viên ${reviewSubmission.studentName}`);
        // Update local state and cache
        setResultsCache((prev) => {
          const current = prev[selectedAssessmentId];
          if (!current) return prev;
          return {
            ...prev,
            [selectedAssessmentId]: {
              ...current,
              submissions: current.submissions.map((s) =>
                s.id === reviewSubmission.id ? { ...s, feedback: feedbackInput.trim() } : s
              ),
            },
          };
        });
        handleCloseReview();
      }
    } catch {
      toast.error('Có lỗi khi lưu lời phê');
    } finally {
      setIsSavingFeedback(false);
    }
  }, [reviewSubmission, feedbackInput, selectedAssessmentId, handleCloseReview]);

  // Close modal with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && reviewSubmission) {
        handleCloseReview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewSubmission, handleCloseReview]);

  return (
    <div className="tku-results-page">
      {/* 1. Academic Header Banner */}
      <section className="tku-results-banner">
        <div className="tku-results-banner__content">
          <div className="tku-banner-pill">
            <GraduationCap size={13} />
            <span>Khảo thí & Đánh giá kết quả</span>
          </div>
          <h1 className="tku-results-banner__title">
            Kết quả học tập & Thống kê khảo thí
          </h1>
          <p className="tku-results-banner__desc">
            Theo dõi chi tiết phổ điểm, đánh giá mức độ hoàn thành bài thi và
            kiểm tra chi tiết bài làm của học sinh trong từng lớp học phần.
          </p>
        </div>
      </section>

      {/* Sub Navigation Tabs */}
      <nav
        className="tku-results-nav-tabs"
        aria-label="Phân hệ kết quả học tập"
      >
        <button
          type="button"
          className="tku-results-nav-tab"
          onClick={() =>
            navigate(
              selectedCourseId && selectedCourseId !== 'ALL'
                ? `/lecturer/students?courseId=${selectedCourseId}`
                : '/lecturer/students',
            )
          }
        >
          <Users size={16} />
          <span>Danh sách học sinh</span>
        </button>
        <button
          type="button"
          className="tku-results-nav-tab"
          onClick={() =>
            navigate(
              selectedCourseId && selectedCourseId !== 'ALL'
                ? `/lecturer/students/progress?courseId=${selectedCourseId}`
                : '/lecturer/students/progress',
            )
          }
        >
          <TrendingUp size={16} />
          <span>Tiến độ học tập</span>
        </button>
        <button
          type="button"
          className="tku-results-nav-tab tku-results-nav-tab--active"
        >
          <BarChart3 size={16} />
          <span>Kết quả học tập</span>
        </button>
      </nav>

      {/* 2. Context & Filter Selector Bar */}
      <section className="tku-results-context-card">
        {/* Top: Header Title */}
        <div className="tku-results-context-top">
          <div className="tku-results-context-title">
            <div className="tku-results-context-title-icon">
              <BarChart3 size={16} />
            </div>
            <span>Chọn khóa học & bài kiểm tra cần xem kết quả</span>
          </div>
        </div>

        {/* Dual Selectors: Course & Assessment */}
        <div className="tku-results-selectors">
          {/* Course Selector */}
          <div className="tku-select-group tku-results-course-select-group">
            <label className="tku-select-label">
              <BookOpen size={13} />
              <span>Khóa học phụ trách</span>
            </label>
            <CustomSelect
              value={selectedCourseId}
              onChange={handleCourseChange}
              options={courseOptions}
              icon={<BookOpen size={14} />}
              ariaLabel="Chọn khóa học phụ trách"
              defaultValue="ALL"
              className="tku-results-custom-select"
            />
          </div>

          {/* Assessment / Exam Selector */}
          <div className="tku-select-group tku-results-assessment-select-group">
            <label className="tku-select-label">
              <Layers size={13} />
              <span>Bài tập / Bài kiểm tra</span>
            </label>
            <CustomSelect
              value={selectedAssessmentId}
              onChange={handleAssessmentChange}
              options={assessmentOptions}
              icon={<Layers size={14} />}
              disabled={availableAssessments.length === 0}
              ariaLabel="Chọn bài tập / bài kiểm tra"
              className="tku-results-custom-select"
            />
          </div>
        </div>

        {/* Quick Type Pills */}
        <div className="tku-results-type-pills">
          <span
            style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}
          >
            Lọc theo dạng:
          </span>
          <button
            type="button"
            className={`tku-results-type-pill ${
              typeFilter === 'ALL' ? 'tku-results-type-pill--active' : ''
            }`}
            onClick={() => setTypeFilter('ALL')}
          >
            Tất cả bài thi (
            {
              assessments.filter(
                (a) =>
                  selectedCourseId === 'ALL' ||
                  a.courseId === selectedCourseId,
              ).length
            }
            )
          </button>
          <button
            type="button"
            className={`tku-results-type-pill ${
              typeFilter === 'EXAM' ? 'tku-results-type-pill--active' : ''
            }`}
            onClick={() => setTypeFilter('EXAM')}
          >
            Đề thi chính thức
          </button>
          <button
            type="button"
            className={`tku-results-type-pill ${
              typeFilter === 'TEST' ? 'tku-results-type-pill--active' : ''
            }`}
            onClick={() => setTypeFilter('TEST')}
          >
            Bài kiểm tra định kỳ
          </button>
          <button
            type="button"
            className={`tku-results-type-pill ${
              typeFilter === 'QUIZ' ? 'tku-results-type-pill--active' : ''
            }`}
            onClick={() => setTypeFilter('QUIZ')}
          >
            Quiz mini
          </button>
        </div>
      </section>

      {/* Main Content Areas */}
      {isLoadingList || isLoadingDetail ? (
        <div
          className="tku-lecturer-loading-wrapper"
          style={{ minHeight: '360px' }}
        >
          <Loader2 size={38} className="tku-lecturer-spin-icon" />
          <span>Đang tải dữ liệu kết quả & phân tích khảo thí...</span>
        </div>
      ) : availableAssessments.length === 0 ||
        !resultsData ||
        (resultsData.assessment.questionCount === 0 &&
          (!resultsData.assessment.questions ||
            resultsData.assessment.questions.length === 0)) ? (
        <section className="tku-results-empty-card">
          <div className="tku-results-empty-graphic">
            <FileQuestion size={38} className="tku-results-empty-icon" />
          </div>
          <h2 className="tku-results-empty-title">
            Hiện tại đang không có bài kiểm tra hay câu hỏi nào
          </h2>
          <p className="tku-results-empty-desc">
            {availableAssessments.length === 0
              ? 'Khóa học này hiện tại chưa có bài kiểm tra hoặc câu hỏi nào. Bạn có thể tạo bài kiểm tra mới để giao cho học sinh và bắt đầu theo dõi kết quả.'
              : resultsData &&
                  resultsData.assessment.questionCount === 0 &&
                  (!resultsData.assessment.questions ||
                    resultsData.assessment.questions.length === 0)
                ? 'Bài kiểm tra này hiện tại chưa có câu hỏi nào. Vui lòng biên soạn nội dung câu hỏi để học sinh có thể làm bài.'
                : 'Hiện tại chưa có bài kiểm tra hay câu hỏi nào được chọn để hiển thị kết quả và thống kê. Vui lòng chọn một bài kiểm tra ở thanh lựa chọn phía trên.'}
          </p>
        </section>
      ) : (
        <>
          {/* Active Assessment Hero Overview Card */}
          <section className="tku-assessment-hero-card">
            <div className="tku-assessment-hero-left">
              <div className="tku-assessment-hero-icon">
                <FileCheck2 size={26} />
              </div>
              <div className="tku-assessment-hero-details">
                <div className="tku-assessment-hero-title-row">
                  <h2 className="tku-assessment-hero-title">
                    {resultsData.assessment.title}
                  </h2>
                  <span
                    className={`tku-assessment-type-chip ${
                      resultsData.assessment.type === 'EXAM'
                        ? 'tku-assessment-type-chip--exam'
                        : resultsData.assessment.type === 'TEST'
                          ? 'tku-assessment-type-chip--test'
                          : 'tku-assessment-type-chip--quiz'
                    }`}
                  >
                    {resultsData.assessment.type === 'EXAM'
                      ? 'Đề thi chính thức'
                      : resultsData.assessment.type === 'TEST'
                        ? 'Bài kiểm tra định kỳ'
                        : 'Quiz mini'}
                  </span>
                </div>
                <div className="tku-assessment-hero-meta-row">
                  <span className="tku-hero-meta-item">
                    <BookOpen size={13} />
                    <span>{resultsData.assessment.courseTitle}</span>
                  </span>
                  {resultsData.assessment.durationMinutes && (
                    <span className="tku-hero-meta-item">
                      <Clock size={13} />
                      <span>{resultsData.assessment.durationMinutes} phút</span>
                    </span>
                  )}
                  <span className="tku-hero-meta-item">
                    <Award size={13} />
                    <span>
                      {resultsData.assessment.questionCount} câu hỏi (
                      {resultsData.assessment.totalScore} điểm)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </section>



          {/* 4. Grade Distribution Bar Chart */}
          <section className="tku-distribution-card">
            <div className="tku-card-header-row">
              <div className="tku-card-title-group">
                <h3 className="tku-card-title">
                  <BarChart3 size={18} style={{ color: '#1d68f2' }} />
                  <span>Phổ điểm & Phân phối xếp loại học lực</span>
                </h3>
                <p className="tku-card-subtitle">
                  Thống kê tỉ lệ phần trăm và số lượng sinh viên theo từng khung điểm chuẩn học thuật
                </p>
              </div>
            </div>

            {/* Distribution Grid */}
            <div className="tku-distribution-bars">
              {resultsData.gradeDistribution.map((item, idx) => (
                <div key={idx} className="tku-dist-bar-item">
                  <div className="tku-dist-header">
                    <span className="tku-dist-tier-label">{item.label}</span>
                    <span className="tku-dist-range">{item.range}</span>
                  </div>

                  <div className="tku-dist-meter-bg">
                    <div
                      className="tku-dist-meter-fill"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>

                  <div className="tku-dist-footer">
                    <span className="tku-dist-count">
                      {item.count} sinh viên
                    </span>
                    <span
                      className="tku-dist-percent"
                      style={{ color: item.color }}
                    >
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. View Mode Tabs */}
          <section className="tku-results-tabs">
            <button
              type="button"
              className={`tku-results-tab-btn ${
                activeTab === 'SUBMISSIONS' ? 'tku-results-tab-btn--active' : ''
              }`}
              onClick={() => setActiveTab('SUBMISSIONS')}
            >
              <Users size={16} />
              <span>Danh sách bài làm sinh viên</span>
              <span className="tku-results-tab-badge">
                {filteredSubmissions.length}
              </span>
            </button>

            <button
              type="button"
              className={`tku-results-tab-btn ${
                activeTab === 'QUESTIONS' ? 'tku-results-tab-btn--active' : ''
              }`}
              onClick={() => setActiveTab('QUESTIONS')}
            >
              <HelpCircle size={16} />
              <span>Phân tích độ khó từng câu hỏi</span>
              <span className="tku-results-tab-badge">
                {resultsData.questionStats.length}
              </span>
            </button>
          </section>

          {/* 6. Tab Content: Submissions Table OR Question Analysis */}
          {activeTab === 'SUBMISSIONS' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Search & Filter Bar */}
              <div className="tku-results-filters-row">
                <div className="tku-results-search">
                  <Search size={16} className="tku-results-search-icon" />
                  <input
                    type="text"
                    className="tku-results-search-input"
                    placeholder="Tìm sinh viên theo họ tên, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="tku-results-search-clear"
                      onClick={() => setSearchTerm('')}
                      title="Xóa tìm kiếm"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                                <CustomSelect
                  value={gradeTierFilter}
                  onChange={setGradeTierFilter}
                  options={GRADE_TIER_OPTIONS}
                  icon={<Award size={14} />}
                  ariaLabel="Lọc theo xếp loại học lực"
                  defaultValue="ALL"
                  className="tku-results-filter-custom-select"
                />

                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={SUBMISSION_STATUS_OPTIONS}
                  icon={<Clock size={14} />}
                  ariaLabel="Lọc theo trạng thái nộp"
                  defaultValue="ALL"
                  className="tku-results-filter-custom-select"
                />
              </div>

              {filteredSubmissions.length === 0 ? (
                <section className="tku-assignments-empty-box">
                  <div className="tku-assignments-empty-graphic">
                    <Search size={36} className="tku-empty-icon" />
                  </div>
                  <h3 className="tku-assignments-empty-title">
                    Không tìm thấy sinh viên nào
                  </h3>
                  <p className="tku-assignments-empty-desc">
                    Không có kết quả nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
                  </p>
                </section>
              ) : (
                <section className="tku-results-table-card">
                  <div className="tku-table-responsive tku-results-table-responsive">
                    <table className="tku-results-table">
                      <thead>
                        <tr>
                          <th>Sinh viên</th>
                          <th>Thời gian nộp</th>
                          <th>Thời lượng làm</th>
                          <th>Số câu đúng</th>
                          <th>Điểm số & Xếp loại</th>
                          <th>Lời phê giảng viên</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((sub) => (
                          <tr key={sub.id}>
                            {/* Sinh viên */}
                            <td>
                              <div className="tku-student-profile-cell">
                                <StudentAvatar
                                  name={sub.studentName}
                                  avatarUrl={sub.avatarUrl}
                                />
                                <div className="tku-student-info">
                                  <span className="tku-student-name">
                                    {sub.studentName}
                                  </span>
                                  <span className="tku-student-sub">
                                    {sub.studentEmail}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Thời gian nộp */}
                            <td>
                              {sub.status === 'NOT_SUBMITTED' ? (
                                <span className="tku-submission-status-pill tku-submission-status-pill--unsubmitted">
                                  <AlertCircle size={11} style={{ flexShrink: 0 }} />
                                  <span>Chưa nộp bài</span>
                                </span>
                              ) : (() => {
                                const raw = (sub.submittedAt || '').replace(',', '').trim();
                                const parts = raw.split(/\s+/);
                                const timeVal = parts.length >= 2 ? parts[0] : raw;
                                const dateVal = parts.length >= 2 ? parts[1] : '';

                                return (
                                  <div className="tku-submission-time-cell">
                                    <div className="tku-submission-datetime-block">
                                      <div className="tku-submission-time-row">
                                        <Clock size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                        <span>{timeVal}</span>
                                      </div>
                                      {dateVal && (
                                        <div className="tku-submission-date-row">
                                          <Calendar size={11} className="tku-submission-date-icon" />
                                          <span>{dateVal}</span>
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className={`tku-submission-status-pill ${
                                        sub.isLate
                                          ? 'tku-submission-status-pill--late'
                                          : 'tku-submission-status-pill--graded'
                                      }`}
                                    >
                                      {sub.isLate ? (
                                        <Clock size={11} style={{ flexShrink: 0 }} />
                                      ) : (
                                        <CheckCircle2 size={11} style={{ flexShrink: 0 }} />
                                      )}
                                      <span>{sub.isLate ? 'Nộp muộn' : 'Nộp đúng hạn'}</span>
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Thời lượng làm bài */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '13px' }}>
                                <Clock size={13} style={{ color: '#64748b' }} />
                                <span>
                                  {sub.status === 'NOT_SUBMITTED'
                                    ? '--'
                                    : `${sub.timeSpentMinutes} phút`}
                                </span>
                              </div>
                            </td>

                            {/* Số câu đúng */}
                            <td>
                              {sub.status === 'NOT_SUBMITTED' ? (
                                <span style={{ color: '#94a3b8' }}>--</span>
                              ) : (
                                <div className="tku-accuracy-cell">
                                  <span className="tku-accuracy-text">
                                    <strong>{sub.correctCount}</strong> / {sub.totalQuestions} câu ({sub.percentage}%)
                                  </span>
                                  <div className="tku-accuracy-bar">
                                    <div
                                      className="tku-accuracy-fill"
                                      style={{ width: `${sub.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Điểm số & Xếp loại */}
                            <td>
                              {sub.status === 'NOT_SUBMITTED' ? (
                                <span style={{ color: '#94a3b8' }}>Chưa có điểm</span>
                              ) : (
                                <div className="tku-score-badge-wrap">
                                  <span
                                    className={`tku-score-number tku-score-number--${sub.gradeTier.toLowerCase()}`}
                                  >
                                    {sub.score.toFixed(1)}
                                  </span>
                                  <span
                                    className={`tku-tier-tag tku-tier-tag--${sub.gradeTier.toLowerCase()}`}
                                  >
                                    {sub.gradeTierText}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Lời phê giảng viên */}
                            <td style={{ maxWidth: '220px' }}>
                              {sub.feedback ? (
                                <span
                                  style={{
                                    fontSize: '12.5px',
                                    color: '#334155',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                  title={sub.feedback}
                                >
                                  "{sub.feedback}"
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Chưa có nhận xét
                                </span>
                              )}
                            </td>

                            {/* Thao tác */}
                            <td style={{ textAlign: 'right' }}>
                              {sub.status === 'NOT_SUBMITTED' ? (
                                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                                  Chưa có bài
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="tku-row-action-btn tku-row-action-btn--primary"
                                  onClick={() => handleOpenReview(sub)}
                                  title="Xem chi tiết bài thi & chấm lời giải của sinh viên"
                                >
                                  <Eye size={14} />
                                  <span>Xem bài làm</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          ) : (
            /* TAB 2: Question-by-Question Accuracy & Item Difficulty Analysis */
            <section className="tku-question-analysis-grid">
              {resultsData.questionStats.map((q) => (
                <div key={q.questionId} className="tku-q-analysis-card">
                  <div className="tku-q-main-info">
                    <div className="tku-q-number-box">
                      <span>C{q.questionNumber}</span>
                    </div>

                    <div className="tku-q-details">
                      <div className="tku-q-content-text">
                        {q.content}
                      </div>
                      <div className="tku-q-meta-row">
                        <span>Thang điểm: <strong>{q.score} điểm</strong></span>
                        <span>•</span>
                        <span>Loại: <strong>{q.type === 'SINGLE_CHOICE' ? 'Trắc nghiệm đơn' : 'Nhiều lựa chọn'}</strong></span>
                        <span>•</span>
                        <span>Số lượt làm: <strong>{q.totalAttempts}</strong> lượt</span>
                      </div>
                    </div>
                  </div>

                  <div className="tku-q-rate-block">
                    <div className="tku-q-rate-header">
                      <span className="tku-q-rate-number">
                        {q.correctRate}% đúng
                      </span>
                      <span
                        className={`tku-difficulty-badge tku-difficulty-badge--${q.difficulty.toLowerCase()}`}
                      >
                        {q.difficultyText}
                      </span>
                    </div>

                    <div className="tku-q-rate-bar">
                      <div
                        className="tku-q-rate-fill"
                        style={{
                          width: `${q.correctRate}%`,
                          backgroundColor:
                            q.difficulty === 'EASY'
                              ? '#10b981'
                              : q.difficulty === 'MEDIUM'
                              ? '#1d68f2'
                              : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {/* 8. Detailed Submission Review Modal */}
      {reviewSubmission && (
        <div className="tku-submission-modal-backdrop" onClick={handleCloseReview}>
          <div
            className="tku-submission-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tku-modal-header-banner">
              <div className="tku-modal-student-summary">
                <StudentAvatar
                  name={reviewSubmission.studentName}
                  avatarUrl={reviewSubmission.avatarUrl}
                  className="tku-modal-avatar"
                />
                <div className="tku-modal-student-meta">
                  <h3 className="tku-modal-student-name">
                    {reviewSubmission.studentName}
                  </h3>
                  <div className="tku-modal-student-sub">
                    <span>{reviewSubmission.studentEmail}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="tku-modal-close-btn"
                onClick={handleCloseReview}
                title="Đóng (ESC)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Score Bar */}
            <div className="tku-modal-score-strip">
              <div className="tku-modal-strip-item">
                <span>Điểm tổng kết:</span>
                <span className="tku-modal-strip-score">
                  {reviewSubmission.score.toFixed(1)} / {reviewSubmission.totalScore} điểm
                </span>
                <span
                  className={`tku-tier-tag tku-tier-tag--${reviewSubmission.gradeTier.toLowerCase()}`}
                  style={{ marginLeft: '6px' }}
                >
                  ({reviewSubmission.gradeTierText})
                </span>
              </div>

              <div className="tku-modal-strip-item">
                <span>Số câu đúng:</span>
                <strong>
                  {reviewSubmission.correctCount} / {reviewSubmission.totalQuestions} câu ({reviewSubmission.percentage}%)
                </strong>
              </div>

              <div className="tku-modal-strip-item">
                <span>Thời gian làm bài:</span>
                <strong>{reviewSubmission.timeSpentMinutes} phút</strong>
              </div>

              <div className="tku-modal-strip-item">
                <span>Trạng thái:</span>
                <span
                  className={`tku-submission-status-pill ${
                    reviewSubmission.isLate
                      ? 'tku-submission-status-pill--late'
                      : 'tku-submission-status-pill--graded'
                  }`}
                >
                  {reviewSubmission.isLate ? (
                    <Clock size={11} style={{ flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={11} style={{ flexShrink: 0 }} />
                  )}
                  <span>{reviewSubmission.submittedAt}</span>
                </span>
              </div>
            </div>

            {/* Modal Scrollable Questions List */}
            <div className="tku-modal-scroll-body">
              {reviewSubmission.answers.map((ans) => {
                const isSkipped =
                  !ans.isCorrect &&
                  (!ans.selectedOptionContent ||
                    ans.selectedOptionContent === 'Không trả lời');

                return (
                  <div
                    key={ans.questionId}
                    className={`tku-review-card ${
                      ans.isCorrect
                        ? 'tku-review-card--correct'
                        : isSkipped
                          ? 'tku-review-card--skipped'
                          : 'tku-review-card--incorrect'
                    }`}
                  >
                    {/* Header: Question Meta & Verdict */}
                    <div className="tku-review-header">
                      <div className="tku-review-q-meta">
                        <span className="tku-review-q-pill">
                          Câu {ans.questionNumber}
                        </span>
                        <span className="tku-review-points-pill">
                          {ans.questionScore} điểm
                        </span>
                      </div>

                      <span
                        className={`tku-review-q-result-badge ${
                          ans.isCorrect
                            ? 'tku-review-q-result-badge--correct'
                            : isSkipped
                              ? 'tku-review-q-result-badge--skipped'
                              : 'tku-review-q-result-badge--incorrect'
                        }`}
                      >
                        {ans.isCorrect ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Đúng (+{ans.scoreAwarded}đ)</span>
                          </>
                        ) : isSkipped ? (
                          <>
                            <AlertCircle size={13} />
                            <span>Chưa trả lời (0đ)</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            <span>Sai (0đ)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Question Statement Box */}
                    <div className="tku-review-q-box">
                      <div className="tku-review-q-box-label">
                        <HelpCircle size={13} />
                        <span>Nội dung câu hỏi:</span>
                      </div>
                      <div className="tku-review-q-content">
                        {ans.questionContent}
                      </div>
                    </div>

                    {/* Answers Comparison Section */}
                    <div className="tku-review-answers-grid">
                      {ans.isCorrect ? (
                        <div className="tku-review-ans-card tku-review-ans-card--correct tku-review-ans-card--full">
                          <div className="tku-review-ans-header">
                            <div className="tku-review-ans-tag tku-review-ans-tag--correct">
                              <CheckCircle2 size={13} />
                              <span>Sinh viên đã chọn đúng</span>
                            </div>
                            <span className="tku-review-ans-verdict tku-review-ans-verdict--correct">
                              Chính xác (+{ans.scoreAwarded}đ)
                            </span>
                          </div>
                          <div className="tku-review-ans-body">
                            {ans.selectedOptionContent || ans.correctOptionContent}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Student Answer */}
                          <div
                            className={`tku-review-ans-card ${
                              isSkipped
                                ? 'tku-review-ans-card--skipped'
                                : 'tku-review-ans-card--wrong'
                            }`}
                          >
                            <div className="tku-review-ans-header">
                              <div
                                className={`tku-review-ans-tag ${
                                  isSkipped
                                    ? 'tku-review-ans-tag--skipped'
                                    : 'tku-review-ans-tag--wrong'
                                }`}
                              >
                                {isSkipped ? (
                                  <AlertCircle size={13} />
                                ) : (
                                  <XCircle size={13} />
                                )}
                                <span>Sinh viên chọn</span>
                              </div>
                              <span
                                className={`tku-review-ans-verdict ${
                                  isSkipped
                                    ? 'tku-review-ans-verdict--skipped'
                                    : 'tku-review-ans-verdict--wrong'
                                }`}
                              >
                                {isSkipped ? 'Chưa trả lời' : 'Chưa đúng (0đ)'}
                              </span>
                            </div>
                            <div
                              className={`tku-review-ans-body ${
                                isSkipped ? 'tku-review-ans-body--empty' : ''
                              }`}
                            >
                              {isSkipped
                                ? 'Sinh viên đã bỏ trống, không trả lời câu hỏi này'
                                : ans.selectedOptionContent}
                            </div>
                          </div>

                          {/* System Correct Answer */}
                          {ans.correctOptionContent && (
                            <div className="tku-review-ans-card tku-review-ans-card--correct">
                              <div className="tku-review-ans-header">
                                <div className="tku-review-ans-tag tku-review-ans-tag--correct">
                                  <Check size={13} />
                                  <span>Đáp án đúng của hệ thống</span>
                                </div>
                                <span className="tku-review-ans-verdict tku-review-ans-verdict--correct">
                                  Đáp án chuẩn
                                </span>
                              </div>
                              <div className="tku-review-ans-body">
                                {ans.correctOptionContent}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Solution Explanation if available */}
                    {ans.solutionText && (
                      <div className="tku-review-solution-box">
                        <div className="tku-review-solution-header">
                          <Lightbulb size={15} />
                          <span>Lời giải chi tiết & Hướng dẫn</span>
                        </div>
                        <div className="tku-review-solution-body">
                          {ans.solutionText}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Teacher Feedback / Remarks Section */}
              <div className="tku-modal-feedback-section">
                <div className="tku-feedback-title">
                  <MessageSquare size={16} style={{ color: '#1d68f2' }} />
                  <span>Lời phê và nhận xét của Giảng viên</span>
                </div>
                <textarea
                  className="tku-feedback-textarea"
                  placeholder="Ghi nhận xét, đánh giá hoặc dặn dò cho sinh viên này (ví dụ: Chú ý phương trình phản ứng ở câu 3, làm bài cẩn thận hơn)..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="tku-modal-actions-footer">
              <button
                type="button"
                className="tku-modal-btn-primary"
                onClick={handleSaveFeedback}
                disabled={isSavingFeedback}
              >
                {isSavingFeedback ? (
                  <>
                    <Loader2 size={15} className="tku-lecturer-spin-icon" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Lưu nhận xét</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerResultsPage;
