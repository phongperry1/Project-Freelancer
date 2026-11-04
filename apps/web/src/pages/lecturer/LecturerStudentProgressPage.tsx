import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Calendar,
  Award,
  Clock,
  AlertCircle,
  ChevronDown,
  Loader2,
  Mail,
  GraduationCap,
  FileCheck2,
  PlayCircle,
  Send,
  MessageSquare,
  HelpCircle,
  FileText,
  Phone,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import {
  lecturerService,
  type LecturerCourseItem,
  type MonitoredStudentItem,
  type StudentProgressDetailResponse,
} from '../../services/lecturer.service';
import { toast } from '../../context/toastService';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import './lecturerStudentProgress.css';

export const LecturerStudentProgressPage: React.FC = () => {
  const { id: paramStudentId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryCourseId = searchParams.get('courseId') || '';

  // Data states
  const [courses, setCourses] = useState<LecturerCourseItem[]>([]);
  const [students, setStudents] = useState<MonitoredStudentItem[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);


  // Options for custom selects
  const courseOptions = useMemo<CustomSelectOption[]>(() => {
    return courses.map((c) => ({
      value: c.id,
      label: `${c.title} (${c.studentCount} học sinh)`,
    }));
  }, [courses]);

  const studentOptions = useMemo<CustomSelectOption[]>(() => {
    if (students.length === 0) {
      return [{ value: '', label: '(Không có học sinh trong khóa này)' }];
    }
    return students.map((s) => ({
      value: s.id,
      label: `${s.fullName} — ${s.email} (${s.progressPercent}% hoàn thành)`,
    }));
  }, [students]);

  // Fast in-memory cache to allow instantaneous switching between students and prevent reload delays
  const [progressCache, setProgressCache] = useState<
    Record<string, StudentProgressDetailResponse>
  >({});

  // Loaded keys to derive loading states cleanly
  const [loadedStudentsCourseId, setLoadedStudentsCourseId] =
    useState<string>('');

  // Tab & Accordion states
  const [activeTab, setActiveTab] = useState<
    'CURRICULUM' | 'ASSESSMENTS' | 'NOTES'
  >('CURRICULUM');
  const [expandedChapters, setExpandedChapters] = useState<
    Record<string, boolean>
  >({});

  // Note state
  const [studentNote, setStudentNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // 1. Load lecturer courses on mount
  useEffect(() => {
    let isMounted = true;
    lecturerService
      .getMyCourses()
      .then((res) => {
        if (!isMounted) return;
        const fetchedCourses = res.courses || [];
        setCourses(fetchedCourses);
        setIsLoadingCourses(false);

        // If no courseId in URL and courses exist, set the first course in URL
        setSearchParams(
          (prev) => {
            if (prev.get('courseId') || fetchedCourses.length === 0) return prev;
            const updated = new URLSearchParams(prev);
            updated.set('courseId', fetchedCourses[0].id);
            return updated;
          },
          { replace: true },
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoadingCourses(false);
        toast.error('Không thể tải danh sách khóa học');
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active course ID
  const activeCourseId = useMemo(() => {
    if (queryCourseId && queryCourseId !== 'ALL') return queryCourseId;
    return courses.length > 0 ? courses[0].id : '';
  }, [queryCourseId, courses]);

  // Derived loading states without cascading effect updates
  const isLoadingStudents = Boolean(
    activeCourseId && loadedStudentsCourseId !== activeCourseId,
  );

  const currentProgressKey =
    paramStudentId && activeCourseId
      ? `${paramStudentId}_${activeCourseId}`
      : '';

  // Directly derive progressData from progressCache (single source of truth)
  const progressData = currentProgressKey
    ? progressCache[currentProgressKey] || null
    : null;

  const isLoadingProgress = Boolean(
    paramStudentId && activeCourseId && !progressCache[currentProgressKey],
  );

  // If no student is selected in route yet, we are in the process of
  // either fetching the course's students or auto-redirecting to the first student
  const isWaitingAutoSelectStudent =
    !paramStudentId &&
    (isLoadingCourses ||
      isLoadingStudents ||
      students.length > 0 ||
      !loadedStudentsCourseId);

  const isPageLoading =
    isLoadingCourses ||
    isLoadingStudents ||
    isLoadingProgress ||
    isWaitingAutoSelectStudent;

  // 2. Load students list when activeCourseId changes
  useEffect(() => {
    if (!activeCourseId) return;
    let isMounted = true;

    lecturerService
      .getMonitoredStudents(activeCourseId)
      .then((res) => {
        if (!isMounted) return;
        const list = res.students || [];
        setStudents(list);
        setLoadedStudentsCourseId(activeCourseId);

        // If no student is selected in route, and students exist, pick the first
        if (!paramStudentId && list.length > 0) {
          navigate(
            `/lecturer/students/${list[0].id}/progress?courseId=${activeCourseId}`,
            { replace: true },
          );
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadedStudentsCourseId(activeCourseId);
        toast.error('Không thể tải danh sách học sinh của khóa học');
      });

    return () => {
      isMounted = false;
    };
  }, [activeCourseId, paramStudentId, navigate]);

  // 3. Load progress detail when paramStudentId and activeCourseId are available
  useEffect(() => {
    if (!paramStudentId || !activeCourseId) return;
    let isMounted = true;
    const cacheKey = `${paramStudentId}_${activeCourseId}`;

    // If already in cache, do not re-fetch!
    if (progressCache[cacheKey]) return;

    lecturerService
      .getStudentProgress(paramStudentId, activeCourseId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProgressCache((prev) => ({ ...prev, [cacheKey]: data }));
        }

        // Auto expand all chapters by default
        if (data?.chapters) {
          const map: Record<string, boolean> = {};
          data.chapters.forEach((ch) => {
            map[ch.id] = true;
          });
          setExpandedChapters(map);
        }

        // Load saved notes for this student
        const saved =
          localStorage.getItem(
            `tku_progress_note_${paramStudentId}_${activeCourseId}`,
          ) || '';
        setStudentNote(saved);
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(err.message || 'Không thể tải tiến độ học tập của học sinh');
      });

    return () => {
      isMounted = false;
    };
  }, [paramStudentId, activeCourseId, progressCache]);

  const handleSelectCourse = useCallback(
    (newCourseId: string) => {
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          updated.set('courseId', newCourseId);
          return updated;
        },
        { replace: true },
      );
      // Reset student selection to let the effect select the first student in the new course
      navigate(`/lecturer/students/progress?courseId=${newCourseId}`);
    },
    [navigate, setSearchParams],
  );

  const handleSelectStudent = useCallback(
    (newStudentId: string) => {
      if (!newStudentId) return;
      navigate(
        `/lecturer/students/${newStudentId}/progress?courseId=${activeCourseId}`,
      );
    },
    [navigate, activeCourseId],
  );

  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!paramStudentId || !activeCourseId) return;
    setIsSavingNote(true);
    try {
      localStorage.setItem(
        `tku_progress_note_${paramStudentId}_${activeCourseId}`,
        studentNote.trim(),
      );
      setTimeout(() => {
        setIsSavingNote(false);
        toast.success('Đã lưu nhận xét học sinh thành công!');
      }, 350);
    } catch {
      setIsSavingNote(false);
      toast.error('Không thể lưu nhận xét.');
    }
  }, [paramStudentId, activeCourseId, studentNote]);

  const handleApplyTemplate = useCallback((templateText: string) => {
    setStudentNote((prev) =>
      prev ? `${prev}\n- ${templateText}` : `- ${templateText}`,
    );
  }, []);

  // Compute initials for student avatar
  const studentInitials = useMemo(() => {
    const name = progressData?.student.fullName || '';
    if (!name) return 'SV';
    const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'SV';
  }, [progressData?.student.fullName]);

  return (
    <div className="tku-progress-page">
      {/* 1. Academic Header Banner */}
      <section className="tku-progress-banner">
        <div className="tku-progress-banner__content">
          <div className="tku-progress-banner__pill">
            <GraduationCap size={13} />
            <span>Học vụ & Giám sát tiến độ</span>
          </div>
          <h1 className="tku-progress-banner__title">
            Tiến độ học tập của học sinh
          </h1>
          <p className="tku-progress-banner__desc">
            Theo dõi chi tiết mức độ hoàn thành từng chương, bài học, lịch sử
            làm bài và điểm số các bài kiểm tra để hỗ trợ học sinh kịp thời.
          </p>
        </div>
      </section>

      {/* Sub Navigation Tabs */}
      <nav
        className="tku-progress-nav-tabs"
        aria-label="Phân hệ theo dõi học sinh"
      >
        <button
          type="button"
          className="tku-progress-nav-tab"
          onClick={() =>
            navigate(
              activeCourseId
                ? `/lecturer/students?courseId=${activeCourseId}`
                : '/lecturer/students',
            )
          }
        >
          <Users size={16} />
          <span>Danh sách học sinh</span>
        </button>
        <button
          type="button"
          className="tku-progress-nav-tab tku-progress-nav-tab--active"
        >
          <TrendingUp size={16} />
          <span>Tiến độ học tập</span>
        </button>
        <button
          type="button"
          className="tku-progress-nav-tab"
          onClick={() =>
            navigate(
              activeCourseId
                ? `/lecturer/results?courseId=${activeCourseId}`
                : '/lecturer/results',
            )
          }
        >
          <BarChart3 size={16} />
          <span>Kết quả học tập</span>
        </button>
      </nav>

      {/* 2. Course & Student Dual Selector Card */}
      <section className="tku-progress-selector-card">
        <div className="tku-progress-selector-header">
          <div className="tku-progress-selector-title">
            <div className="tku-progress-selector-title-icon">
              <BookOpen size={16} />
            </div>
            <span>Chọn khóa học & học sinh cần xem tiến độ</span>
          </div>
        </div>

        <div className="tku-progress-selector-grid">
          {/* Select Course */}
          <div className="tku-progress-select-field">
            <label className="tku-progress-select-label">
              <BookOpen size={13} />
              <span>Khóa học</span>
            </label>
            <CustomSelect
              value={activeCourseId}
              onChange={handleSelectCourse}
              options={courseOptions}
              icon={<BookOpen size={14} />}
              disabled={isLoadingCourses}
              ariaLabel="Chọn khóa học"
              className="tku-progress-custom-select"
            />
          </div>

          {/* Select Student */}
          <div className="tku-progress-select-field">
            <label className="tku-progress-select-label">
              <Users size={13} />
              <span>Học sinh trong khóa</span>
            </label>
            <CustomSelect
              value={paramStudentId || ''}
              onChange={handleSelectStudent}
              options={studentOptions}
              icon={<Users size={14} />}
              disabled={isLoadingStudents || students.length === 0}
              ariaLabel="Chọn học sinh trong khóa"
              className="tku-progress-custom-select"
            />
          </div>
        </div>
      </section>

      {/* 3. Main Content: Loading Spinner, Empty State, or Progress Data */}
      {isPageLoading ? (
        <div
          className="tku-lecturer-loading-wrapper"
          style={{ minHeight: '360px' }}
        >
          <Loader2 size={38} className="tku-lecturer-spin-icon" />
          <span>Đang tải dữ liệu tiến độ học tập của học sinh...</span>
        </div>
      ) : !progressData ? (
        <div className="tku-progress-empty-card">
          <div className="tku-progress-empty-icon">
            <HelpCircle size={32} />
          </div>
          <h2 className="tku-progress-empty-title">
            {students.length === 0
              ? 'Khóa học chưa có học sinh nào'
              : 'Chưa có học sinh được chọn'}
          </h2>
          <p className="tku-progress-empty-desc">
            {students.length === 0
              ? 'Khóa học này hiện tại chưa có học sinh nào ghi danh tham gia. Vui lòng chọn khóa học khác hoặc quay lại danh sách học sinh.'
              : 'Vui lòng chọn một học sinh ở thanh điều hướng phía trên để xem chi tiết tiến độ.'}
          </p>
          <button
            type="button"
            className="tku-hero-btn tku-hero-btn--primary"
            onClick={() => navigate('/lecturer/students')}
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách học sinh</span>
          </button>
        </div>
      ) : (
        <>
          {/* Student Profile & Academic Progress Hero Card (Thiết kế học thuật chuẩn mực TKU) */}
          <section className="tku-student-hero-card">
            <div className="tku-student-hero-left">
              <div className="tku-hero-avatar">
                {progressData.student.avatarUrl ? (
                  <img
                    src={progressData.student.avatarUrl}
                    alt={progressData.student.fullName}
                    className="tku-hero-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{studentInitials}</span>
                )}
              </div>

              <div className="tku-hero-details">
                <div className="tku-hero-name-row">
                  <h2 className="tku-hero-name">
                    {progressData.student.fullName}
                  </h2>
                  <span
                    className={`tku-status-badge ${
                      progressData.enrollment.learningStatus === 'COMPLETED'
                        ? 'tku-status-badge--completed'
                        : progressData.enrollment.learningStatus === 'ON_TRACK'
                          ? 'tku-status-badge--on-track'
                          : progressData.enrollment.learningStatus ===
                              'NEEDS_ATTENTION'
                            ? 'tku-status-badge--needs-attention'
                            : 'tku-status-badge--not-started'
                    }`}
                  >
                    {progressData.enrollment.learningStatus === 'COMPLETED' && (
                      <CheckCircle2 size={13} />
                    )}
                    {progressData.enrollment.learningStatus ===
                      'NEEDS_ATTENTION' && <AlertCircle size={13} />}
                    {progressData.enrollment.learningStatus === 'ON_TRACK' && (
                      <TrendingUp size={13} />
                    )}
                    {progressData.enrollment.learningStatus ===
                      'NOT_STARTED' && <Clock size={13} />}
                    <span>{progressData.enrollment.learningStatusText}</span>
                  </span>

                  {progressData.course?.title && (
                    <span className="tku-hero-course-tag" title={progressData.course.title}>
                      <BookOpen size={12} />
                      <span>{progressData.course.title}</span>
                    </span>
                  )}
                </div>

                <div className="tku-hero-contacts">
                  <span className="tku-hero-contact-item">
                    <Mail size={13} />
                    <span>{progressData.student.email}</span>
                  </span>
                  {progressData.student.phoneNumber && (
                    <span className="tku-hero-contact-item">
                      <Phone size={13} />
                      <span>{progressData.student.phoneNumber}</span>
                    </span>
                  )}
                  <span className="tku-hero-contact-item">
                    <Calendar size={13} />
                    <span>
                      Tham gia: {progressData.enrollment.enrolledAtText}
                    </span>
                  </span>
                  {progressData.enrollment.completedAt && (
                    <span className="tku-hero-contact-item tku-hero-contact-item--completed">
                      <CheckCircle2 size={13} />
                      <span>
                        Hoàn thành: {new Date(progressData.enrollment.completedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="tku-student-hero-right">
              {/* Academic KPI Stat Pills */}
              <div className="tku-hero-stats-row">
                <div className="tku-hero-stat-pill" title="Tổng số bài giảng đã học xong">
                  <div className="tku-hero-stat-pill__icon tku-hero-stat-pill__icon--lessons">
                    <FileText size={15} />
                  </div>
                  <div className="tku-hero-stat-pill__info">
                    <span className="tku-hero-stat-pill__val">
                      <strong>{progressData.metrics?.completedLessons ?? 0}</strong>
                      <span className="tku-hero-stat-pill__sep">/</span>
                      {progressData.metrics?.totalLessons ?? progressData.chapters.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0)}
                    </span>
                    <span className="tku-hero-stat-pill__lbl">Bài giảng</span>
                  </div>
                </div>

                <div className="tku-hero-stat-pill" title="Tổng số bài tập / đề thi đã nộp">
                  <div className="tku-hero-stat-pill__icon tku-hero-stat-pill__icon--assessments">
                    <FileCheck2 size={15} />
                  </div>
                  <div className="tku-hero-stat-pill__info">
                    <span className="tku-hero-stat-pill__val">
                      <strong>{progressData.metrics?.submittedAssessments ?? 0}</strong>
                      <span className="tku-hero-stat-pill__sep">/</span>
                      {progressData.metrics?.totalAssessments ?? progressData.assessments.length}
                    </span>
                    <span className="tku-hero-stat-pill__lbl">Đã nộp bài</span>
                  </div>
                </div>

                <div className="tku-hero-stat-pill" title="Điểm trung bình các bài kiểm tra">
                  <div className="tku-hero-stat-pill__icon tku-hero-stat-pill__icon--score">
                    <Award size={15} />
                  </div>
                  <div className="tku-hero-stat-pill__info">
                    <span className="tku-hero-stat-pill__val">
                      <strong>
                        {progressData.metrics?.averageScore !== null && progressData.metrics?.averageScore !== undefined
                          ? progressData.metrics.averageScore.toFixed(1)
                          : '—'}
                      </strong>
                      {progressData.metrics?.averageScore !== null && progressData.metrics?.averageScore !== undefined && (
                        <span className="tku-hero-stat-pill__sep">/10</span>
                      )}
                    </span>
                    <span className="tku-hero-stat-pill__lbl">Điểm TB</span>
                  </div>
                </div>
              </div>

              {/* Course Overall Progress Box */}
              <div className="tku-hero-progress-box">
                <div className="tku-hero-progress-header">
                  <span>Tiến độ chương trình</span>
                  <span
                    className={`tku-hero-progress-pct ${
                      progressData.enrollment.progressPercent >= 100
                        ? 'tku-hero-progress-pct--completed'
                        : ''
                    }`}
                  >
                    {progressData.enrollment.progressPercent}%
                  </span>
                </div>
                <div className="tku-hero-progress-bar">
                  <div
                    className={`tku-hero-progress-fill ${
                      progressData.enrollment.progressPercent >= 100
                        ? 'tku-hero-progress-fill--completed'
                        : ''
                    }`}
                    style={{
                      width: `${progressData.enrollment.progressPercent}%`,
                    }}
                  />
                </div>
                <span className="tku-hero-progress-sub">
                  {progressData.enrollment.progressPercent >= 100
                    ? '✓ Đã hoàn thành khóa'
                    : `Đạt ${progressData.enrollment.progressPercent}% lộ trình`}
                </span>
              </div>
            </div>
          </section>



          {/* Navigation Tabs (Curriculum vs Assessments vs Notes) */}
          <div className="tku-progress-content-tabs">
            <button
              type="button"
              className={`tku-progress-content-tab ${
                activeTab === 'CURRICULUM'
                  ? 'tku-progress-content-tab--active'
                  : ''
              }`}
              onClick={() => setActiveTab('CURRICULUM')}
            >
              <BookOpen size={16} />
              <span>Tiến độ giáo trình & bài học</span>
              <span className="tku-progress-tab-badge">
                {progressData.chapters.length} chương
              </span>
            </button>

            <button
              type="button"
              className={`tku-progress-content-tab ${
                activeTab === 'ASSESSMENTS'
                  ? 'tku-progress-content-tab--active'
                  : ''
              }`}
              onClick={() => setActiveTab('ASSESSMENTS')}
            >
              <FileCheck2 size={16} />
              <span>Kết quả bài tập & đề thi</span>
              <span className="tku-progress-tab-badge">
                {progressData.assessments.length} bài
              </span>
            </button>

            <button
              type="button"
              className={`tku-progress-content-tab ${
                activeTab === 'NOTES' ? 'tku-progress-content-tab--active' : ''
              }`}
              onClick={() => setActiveTab('NOTES')}
            >
              <MessageSquare size={16} />
              <span>Sổ tay nhận xét giảng viên</span>
            </button>
          </div>

          {/* Tab 1: Curriculum & Lessons Breakdown */}
          {activeTab === 'CURRICULUM' && (
            <div className="tku-chapter-list">
              {progressData.chapters.length === 0 ? (
                <div className="tku-progress-empty-card">
                  <BookOpen size={32} style={{ color: '#94a3b8' }} />
                  <p className="tku-progress-empty-desc">
                    Khóa học này chưa có chương mục giáo trình nào.
                  </p>
                </div>
              ) : (
                progressData.chapters.map((chapter) => {
                  const isExpanded = Boolean(expandedChapters[chapter.id]);
                  const orderDisplay = chapter.sortOrder < 10 ? `0${chapter.sortOrder}` : chapter.sortOrder;
                  return (
                    <div key={chapter.id} className="tku-chapter-card">
                      <div
                        className="tku-chapter-header"
                        onClick={() => toggleChapter(chapter.id)}
                      >
                        <div className="tku-chapter-header-left">
                          <span className="tku-chapter-pill">
                            Chương {orderDisplay}
                          </span>
                          <h3 className="tku-chapter-title">
                            {chapter.title}
                          </h3>
                          <span className="tku-chapter-lessons-count">
                            {chapter.totalLessons} bài học
                          </span>
                        </div>

                        <div className="tku-chapter-header-right">
                          {chapter.totalLessons === 0 ? (
                            <span className="tku-chapter-status-pill tku-chapter-status-pill--empty">
                              Trống
                            </span>
                          ) : chapter.progressPercent >= 100 ? (
                            <span className="tku-chapter-status-pill tku-chapter-status-pill--completed">
                              <CheckCircle2 size={13} />
                              <span>Hoàn thành 100%</span>
                            </span>
                          ) : chapter.progressPercent > 0 ? (
                            <span className="tku-chapter-status-pill tku-chapter-status-pill--progress">
                              <Clock size={13} />
                              <span>Đang học ({chapter.completedLessons}/{chapter.totalLessons})</span>
                            </span>
                          ) : (
                            <span className="tku-chapter-status-pill tku-chapter-status-pill--pending">
                              <span>Chưa học</span>
                            </span>
                          )}

                          {chapter.totalLessons > 0 && (
                            <div className="tku-chapter-mini-progress" title={`Tiến độ chương: ${chapter.progressPercent}%`}>
                              <div className="tku-chapter-mini-bar">
                                <div
                                  className={`tku-chapter-mini-fill ${
                                    chapter.progressPercent >= 100
                                      ? 'tku-chapter-mini-fill--completed'
                                      : ''
                                  }`}
                                  style={{ width: `${chapter.progressPercent}%` }}
                                />
                              </div>
                              <span className="tku-chapter-stats-text">
                                {chapter.completedLessons}/{chapter.totalLessons} bài ({chapter.progressPercent}%)
                              </span>
                            </div>
                          )}

                          <div className="tku-chapter-chevron-wrap">
                            <ChevronDown
                              size={15}
                              className={`tku-chapter-chevron ${
                                isExpanded ? 'tku-chapter-chevron--open' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="tku-lesson-list">
                          {chapter.lessons.length === 0 ? (
                            <div className="tku-chapter-lessons-empty">
                              <div className="tku-chapter-lessons-empty__icon">
                                <BookOpen size={18} />
                              </div>
                              <div className="tku-chapter-lessons-empty__text">
                                <span className="tku-chapter-lessons-empty__title">
                                  Chưa có bài học nào trong chương này
                                </span>
                                <span className="tku-chapter-lessons-empty__sub">
                                  Chương này hiện chưa được cấu hình bài giảng video hoặc tài liệu lý thuyết.
                                </span>
                              </div>
                            </div>
                          ) : (
                            chapter.lessons.map((lesson, lIdx) => (
                              <div key={lesson.id} className="tku-lesson-item">
                                <div className="tku-lesson-item-left">
                                  <span className="tku-lesson-order-num">
                                    {lIdx + 1 < 10 ? `0${lIdx + 1}` : lIdx + 1}
                                  </span>

                                  <div
                                    className={`tku-lesson-type-icon-box ${
                                      lesson.videoUrl
                                        ? 'tku-lesson-type-icon-box--video'
                                        : 'tku-lesson-type-icon-box--doc'
                                    }`}
                                    title={lesson.videoUrl ? 'Bài giảng Video' : 'Lý thuyết / Tài liệu'}
                                  >
                                    {lesson.videoUrl ? <PlayCircle size={15} /> : <FileText size={15} />}
                                  </div>

                                  <div className="tku-lesson-info-wrap">
                                    <span className="tku-lesson-title" title={lesson.title}>
                                      {lesson.title}
                                    </span>
                                    <div className="tku-lesson-meta-chips">
                                      <span className="tku-lesson-meta-chip">
                                        {lesson.videoUrl ? 'Video bài giảng' : 'Lý thuyết / Tài liệu'}
                                      </span>
                                      {lesson.durationMinutes && (
                                        <span className="tku-lesson-meta-chip">
                                          <Clock size={11} />
                                          <span>{lesson.durationMinutes} phút</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="tku-lesson-item-right">
                                  {lesson.isCompleted ? (
                                    <span className="tku-lesson-status-pill tku-lesson-status-pill--completed">
                                      <CheckCircle2 size={13} />
                                      <span>
                                        Đã hoàn thành{lesson.completedAt ? ` • ${new Date(lesson.completedAt).toLocaleDateString('vi-VN')}` : ''}
                                      </span>
                                    </span>
                                  ) : lesson.progressPercent > 0 ? (
                                    <span className="tku-lesson-status-pill tku-lesson-status-pill--progress">
                                      <Clock size={13} />
                                      <span>Đang học ({lesson.progressPercent}%)</span>
                                    </span>
                                  ) : (
                                    <span className="tku-lesson-status-pill tku-lesson-status-pill--pending">
                                      <span>Chưa học</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Assessments & Test Results Table */}
          {activeTab === 'ASSESSMENTS' && (
            <div className="tku-progress-assessments-card">
              {progressData.assessments.length === 0 ? (
                <div className="tku-progress-empty-card">
                  <FileText size={32} style={{ color: '#94a3b8' }} />
                  <p className="tku-progress-empty-desc">
                    Khóa học này hiện chưa có bài tập hoặc đề thi nào được tạo.
                  </p>
                </div>
              ) : (
                <table className="tku-progress-table">
                  <thead>
                    <tr>
                      <th>Bài tập / Đề thi</th>
                      <th>Thể loại</th>
                      <th>Thời lượng</th>
                      <th>Số lần nộp</th>
                      <th>Điểm cao nhất</th>
                      <th>Trạng thái</th>
                      <th>Thời gian nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressData.assessments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <span
                              style={{ fontWeight: 700, color: '#0f172a' }}
                            >
                              {a.title}
                            </span>
                            <span
                              style={{ fontSize: '12px', color: '#64748b' }}
                            >
                              Thang điểm: {a.totalScore} điểm
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`tku-assessment-type-chip ${
                              a.type === 'EXAM'
                                ? 'tku-assessment-type-chip--exam'
                                : a.type === 'TEST'
                                  ? 'tku-assessment-type-chip--test'
                                  : 'tku-assessment-type-chip--quiz'
                            }`}
                          >
                            {a.typeText}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: '#64748b',
                              fontSize: '13px',
                            }}
                          >
                            <Clock size={13} />
                            <span>
                              {a.durationMinutes
                                ? `${a.durationMinutes} phút`
                                : 'Tự do'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {a.attemptsCount} lần làm
                          </span>
                        </td>

                        <td>
                          {a.bestScore !== null ? (
                            <span
                              className={`tku-score-tag ${
                                a.bestScore >= 8.0
                                  ? 'tku-score-tag--excellent'
                                  : a.bestScore >= 6.5
                                    ? 'tku-score-tag--good'
                                    : a.bestScore >= 5.0
                                      ? 'tku-score-tag--fair'
                                      : 'tku-score-tag--weak'
                              }`}
                            >
                              {a.bestScore.toFixed(1)} / {a.totalScore}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: '#94a3b8',
                                fontStyle: 'italic',
                                fontSize: '12.5px',
                              }}
                            >
                              Chưa có điểm
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`tku-status-badge ${
                              a.status === 'PASSED'
                                ? 'tku-status-badge--completed'
                                : a.status === 'SUBMITTED'
                                  ? 'tku-status-badge--on-track'
                                  : a.status === 'FAILED'
                                    ? 'tku-status-badge--needs-attention'
                                    : 'tku-status-badge--not-started'
                            }`}
                          >
                            {a.status === 'PASSED' && (
                              <CheckCircle2 size={13} />
                            )}
                            {a.status === 'FAILED' && (
                              <AlertCircle size={13} />
                            )}
                            {a.status === 'SUBMITTED' && (
                              <FileCheck2 size={13} />
                            )}
                            {a.status === 'NOT_SUBMITTED' && (
                              <Clock size={13} />
                            )}
                            <span>{a.statusText}</span>
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            {a.lastSubmittedAt
                              ? new Date(a.lastSubmittedAt).toLocaleString(
                                  'vi-VN',
                                )
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 3: Lecturer Observations & Notebook */}
          {activeTab === 'NOTES' && (
            <div className="tku-progress-notes-card">
              <div className="tku-progress-notes-title">
                <MessageSquare size={16} style={{ color: '#1d68f2' }} />
                <span>Sổ tay theo dõi & Đánh giá cá nhân của giảng viên</span>
              </div>

              <div className="tku-progress-templates-bar">
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  Gợi ý nhanh:
                </span>
                <button
                  type="button"
                  className="tku-progress-template-btn"
                  onClick={() =>
                    handleApplyTemplate(
                      'Tiếp thu bài giảng rất tốt, tích cực hoàn thành bài tập đúng hạn.',
                    )
                  }
                >
                  + Tiếp thu tốt
                </button>
                <button
                  type="button"
                  className="tku-progress-template-btn"
                  onClick={() =>
                    handleApplyTemplate(
                      'Cần tăng tốc độ hoàn thành các bài học còn lại trước ngày thi học phần.',
                    )
                  }
                >
                  + Nhắc nhở tiến độ
                </button>
                <button
                  type="button"
                  className="tku-progress-template-btn"
                  onClick={() =>
                    handleApplyTemplate(
                      'Điểm bài tập lý thuyết đạt khá, cần luyện tập thêm phần thực hành.',
                    )
                  }
                >
                  + Cần cải thiện thực hành
                </button>
                <button
                  type="button"
                  className="tku-progress-template-btn"
                  onClick={() =>
                    handleApplyTemplate(
                      'Đã hoàn thành toàn bộ chương trình môn học xuất sắc.',
                    )
                  }
                >
                  + Khen ngợi hoàn thành
                </button>
              </div>

              <textarea
                className="tku-progress-notes-textarea"
                placeholder="Nhập ghi chú theo dõi tiến độ, nhận xét ưu/khuyết điểm hoặc kế hoạch ôn tập cho học sinh..."
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
              />

              <div className="tku-progress-notes-footer">
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Ghi chú được lưu trữ an toàn trong hồ sơ học vụ giảng dạy của
                  bạn.
                </span>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <a
                    href={`mailto:${
                      progressData.student.email
                    }?subject=${encodeURIComponent(
                      `[TKU LMS] Nhận xét học tập môn ${progressData.course.title}`,
                    )}&body=${encodeURIComponent(
                      `Chào ${progressData.student.fullName},\n\nGiảng viên gửi nhận xét về quá trình học tập của bạn:\n${studentNote}\n\nChúc bạn học tập tốt!`,
                    )}`}
                    className="tku-hero-btn tku-hero-btn--secondary"
                    title="Gửi nhận xét này qua email cho học sinh"
                    style={{ textDecoration: 'none' }}
                  >
                    <Mail size={14} />
                    <span>Gửi nội dung này qua Email</span>
                  </a>

                  <button
                    type="button"
                    className="tku-hero-btn tku-hero-btn--primary"
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                  >
                    {isSavingNote ? (
                      <>
                        <Loader2 size={14} className="tku-lecturer-spin-icon" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Lưu nhận xét</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LecturerStudentProgressPage;
