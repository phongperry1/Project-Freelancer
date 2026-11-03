import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  X,
  Play,
  Grid,
  List,
  ChevronDown,
  ArrowRight,
  LogIn,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Video,
  RotateCcw,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { EmptyState } from '../../components/common/EmptyState';
import { CustomSelect, type CustomSelectOption } from '../../components/common/CustomSelect';
import { useAuth } from '../../context/useAuth';
import {
  courseService,
  type StudentLessonItem,
  type StudentEnrolledCourseItem,
} from '../../services/course.service';
import { StudentLessonCard } from './components/StudentLessonCard';
import './coursesPage.css';
import './lessonsPage.css';

type StatusTab = 'all' | 'in_progress' | 'completed' | 'not_started';

const PAGE_SIZE = 24;

const GRADE_OPTIONS: CustomSelectOption[] = [
  { value: 'all', label: 'Tất cả khối lớp' },
  { value: '10', label: 'Hóa học Lớp 10' },
  { value: '11', label: 'Hóa học Lớp 11' },
  { value: '12', label: 'Hóa học Lớp 12' },
  { value: 'exam', label: 'Luyện thi THPT' },
  { value: 'other', label: 'Chuyên đề khác' },
];

const FORMAT_OPTIONS: CustomSelectOption[] = [
  { value: 'all', label: 'Tất cả hình thức' },
  { value: 'video', label: 'Video bài giảng' },
  { value: 'doc', label: 'Lý thuyết chuyên đề' },
];

export const LessonsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [lessons, setLessons] = useState<StudentLessonItem[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrolledCourseItem[]>([]);
  const [recentLesson, setRecentLesson] = useState<StudentLessonItem | null>(null);
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    inProgressLessons: 0,
    notStartedLessons: 0,
    averageProgress: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Filters state
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'video' | 'doc'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    document.title = 'Kho bài giảng Hóa học | TKU E-Learning';
    window.scrollTo(0, 0);
  }, []);

  // Reset pagination khi bộ lọc thay đổi
  const [prevFilterKey, setPrevFilterKey] = useState<string>('');
  const currentFilterKey = `${statusTab}|${searchQuery}|${selectedCourseId}|${selectedGrade}|${selectedFormat}`;
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setStatusTab('all');
    setSearchQuery('');
    setSelectedCourseId('all');
    setSelectedGrade('all');
    setSelectedFormat('all');
  }, []);

  // Tải dữ liệu bài giảng học tập với cơ chế đồng thời và fallback tối ưu
  useEffect(() => {
    let isMounted = true;

    courseService
      .getStudentLessonsOverview()
      .then((res) => {
        if (!isMounted) return;
        setLessons(res.lessons || []);
        setEnrolledCourses(res.enrolledCourses || []);
        setRecentLesson(res.recentLesson || null);
        setStats(
          res.stats || {
            totalLessons: 0,
            completedLessons: 0,
            inProgressLessons: 0,
            notStartedLessons: 0,
            averageProgress: 0,
          },
        );
      })
      .catch(async (err: unknown) => {
        if (!isMounted) return;
        console.warn('Không thể tải bài giảng từ endpoint chuyên biệt, sử dụng fallback tối ưu:', err);
        try {
          const publicRes = await courseService.getPublicCourses();
          if (!isMounted) return;

          const rawCourses = publicRes.courses || [];
          const detailsResults = await Promise.allSettled(
            rawCourses.map((c) => courseService.getPublicCourseById(c.id)),
          );

          if (!isMounted) return;

          const flattened: StudentLessonItem[] = [];
          let totalCount = 0;
          const completedCount = 0;
          const inProgressCount = 0;
          let notStartedCount = 0;

          for (let i = 0; i < detailsResults.length; i++) {
            const res = detailsResults[i];
            if (res.status === 'fulfilled') {
              const detail = res.value;
              const c = rawCourses[i];
              for (const ch of detail.chapters || []) {
                for (const les of ch.lessons || []) {
                  totalCount++;
                  notStartedCount++;
                  flattened.push({
                    id: les.id,
                    title: les.title,
                    sortOrder: les.sortOrder,
                    chapterId: ch.id,
                    chapterTitle: ch.title,
                    chapterOrder: ch.sortOrder,
                    courseId: c.id,
                    courseTitle: c.title,
                    courseGrade: c.grade,
                    teacher: c.teacher,
                    hasVideo: true,
                    hasContent: false,
                    isEnrolled: Boolean(isAuthenticated && c.isEnrolled),
                    isCompleted: false,
                    progressPercent: 0,
                    lastPosition: 0,
                  });
                }
              }
            }
          }

          if (isMounted) {
            setLessons(flattened);
            setStats({
              totalLessons: totalCount,
              completedLessons: completedCount,
              inProgressLessons: inProgressCount,
              notStartedLessons: notStartedCount,
              averageProgress: 0,
            });
          }
        } catch (fallbackErr) {
          if (isMounted) {
            setErrorMessage(
              fallbackErr instanceof Error
                ? fallbackErr.message
                : 'Không thể kết nối đến máy chủ để tải kho bài giảng. Vui lòng thử lại sau.',
            );
          }
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
  }, [refreshTrigger, isAuthenticated]);

  // Danh sách khóa học khả dụng cho dropdown lọc (kể cả khi chưa ghi danh)
  const availableCourses = useMemo(() => {
    if (enrolledCourses.length > 0) return enrolledCourses;
    const map = new Map<string, { id: string; title: string }>();
    for (const l of lessons) {
      if (!map.has(l.courseId)) {
        map.set(l.courseId, { id: l.courseId, title: l.courseTitle });
      }
    }
    return Array.from(map.values());
  }, [enrolledCourses, lessons]);

  const courseOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: 'all', label: 'Tất cả khóa học' },
      ...availableCourses.map((c) => ({
        value: c.id,
        label: c.title,
      })),
    ],
    [availableCourses]
  );

  const handleCourseChange = useCallback((val: string) => {
    setSelectedCourseId(val);
  }, []);

  const handleGradeChange = useCallback((val: string) => {
    setSelectedGrade(val);
  }, []);

  const handleFormatChange = useCallback((val: string) => {
    setSelectedFormat(val as 'all' | 'video' | 'doc');
  }, []);

  // Đếm số lượng theo tab trạng thái
  const tabCounts = useMemo(() => {
    let all = 0;
    let inProgress = 0;
    let completed = 0;
    let notStarted = 0;

    for (const l of lessons) {
      all++;
      if (l.isCompleted) {
        completed++;
      } else if (l.progressPercent > 0) {
        inProgress++;
      } else {
        notStarted++;
      }
    }

    return {
      all,
      in_progress: inProgress,
      completed,
      not_started: notStarted,
    };
  }, [lessons]);

  // Lọc bài giảng theo tất cả điều kiện
  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return lessons.filter((lesson) => {
      // 1. Tab trạng thái
      if (statusTab === 'in_progress') {
        if (lesson.isCompleted || lesson.progressPercent === 0) return false;
      } else if (statusTab === 'completed') {
        if (!lesson.isCompleted) return false;
      } else if (statusTab === 'not_started') {
        if (lesson.isCompleted || lesson.progressPercent > 0) return false;
      }

      // 2. Khóa học
      if (selectedCourseId !== 'all' && lesson.courseId !== selectedCourseId) {
        return false;
      }

      // 3. Khối lớp
      if (selectedGrade !== 'all' && lesson.courseGrade !== selectedGrade) {
        return false;
      }

      // 4. Định dạng
      if (selectedFormat === 'video' && !lesson.hasVideo) return false;
      if (selectedFormat === 'doc' && lesson.hasVideo) return false;

      // 5. Tìm kiếm theo tên bài, chương, khóa học
      if (q) {
        const matchTitle = lesson.title.toLowerCase().includes(q);
        const matchCourse = lesson.courseTitle.toLowerCase().includes(q);
        const matchChapter = lesson.chapterTitle.toLowerCase().includes(q);
        if (!matchTitle && !matchCourse && !matchChapter) return false;
      }

      return true;
    });
  }, [lessons, statusTab, selectedCourseId, selectedGrade, selectedFormat, searchQuery]);

  // Danh sách hiển thị giới hạn theo trang để tối ưu DOM
  const displayedLessons = useMemo(() => {
    return filteredLessons.slice(0, visibleCount);
  }, [filteredLessons, visibleCount]);

  return (
    <div className="tku-lessons-page-wrapper">
      <Navbar />

      <main className="tku-lessons-page-main">
        {/* Academic Hero Banner */}
        <section className="tku-lessons-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Bài giảng</span>
            </nav>

            <div className="tku-lessons-hero__grid">
              {/* Cột trái: Tiêu đề & Giới thiệu định hướng học tập */}
              <div className="tku-lessons-hero__main">
                <div className="tku-lessons-hero__tag-wrap">
                  <span className="tku-lessons-hero__tag">
                    <Sparkles size={14} />
                    <span>Không gian học tập TKU</span>
                  </span>
                  <span className="tku-lessons-hero__subtag">
                    Kho bài giảng Hóa học bài bản
                  </span>
                </div>

                <h1 className="tku-lessons-hero__title">
                  Hệ thống bài giảng Hóa học chuyên sâu
                </h1>

                <p className="tku-lessons-hero__desc">
                  Truy cập nhanh danh sách bài giảng, theo dõi sát sao tiến độ học tập và tiếp tục
                  các bài học trọng tâm chuẩn cấu trúc chương trình GDPT mới.
                </p>
              </div>

              {/* Cột phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism */}
              <div className="tku-lessons-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <BookOpen size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{stats.totalLessons}</span>
                    <span className="tku-hub-glass-card__lbl">Bài giảng tiếp cận</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{stats.completedLessons}</span>
                    <span className="tku-hub-glass-card__lbl">Đã hoàn thành</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <Clock size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{stats.inProgressLessons}</span>
                    <span className="tku-hub-glass-card__lbl">Đang học dở</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Sparkles size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{stats.averageProgress}%</span>
                    <span className="tku-hub-glass-card__lbl">Tiến độ tổng thể</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Thân trang: Spotlight + Bộ lọc + Danh sách bài giảng */}
        <div className="tku-container tku-lessons-container">
          {/* Spotlight Banner: Bài giảng đang học dở gần nhất */}
          {recentLesson && !recentLesson.isCompleted && (
            <section className="tku-continue-spotlight" aria-label="Tiếp tục bài giảng gần nhất">
              <div className="tku-continue-card">
                <div className="tku-continue-card__left">
                  <div className="tku-continue-card__play-icon" aria-hidden="true">
                    <Play size={22} fill="currentColor" />
                  </div>
                  <div className="tku-continue-card__info">
                    <div className="tku-continue-card__badge-row">
                      <span className="tku-continue-badge">
                        <Clock size={12} />
                        <span>Bài giảng đang học dở</span>
                      </span>
                    </div>
                    <h3 className="tku-continue-card__title">
                      {recentLesson.sortOrder > 0 && `Bài ${recentLesson.sortOrder}: `}
                      {recentLesson.title}
                    </h3>
                    <div className="tku-continue-card__meta">
                      <span>{recentLesson.courseTitle}</span>
                      <span>•</span>
                      <span>Chương {recentLesson.chapterOrder}: {recentLesson.chapterTitle}</span>
                    </div>
                  </div>
                </div>

                <div className="tku-continue-card__right">
                  <div className="tku-continue-card__progress">
                    <div className="tku-continue-progress-text">
                      <span>Tiến độ</span>
                      <span>{recentLesson.progressPercent}%</span>
                    </div>
                    <div className="tku-continue-progress-bar">
                      <div
                        className="tku-continue-progress-fill"
                        style={{ width: `${recentLesson.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tku-continue-btn"
                    onClick={() =>
                      navigate(`/courses/${recentLesson.courseId}/learn/${recentLesson.id}`)
                    }
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Tiếp tục học ngay</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Banner nhắc nhở đăng nhập nếu chưa đăng nhập */}
          {!isAuthenticated && (
            <div className="tku-lessons-prompt-banner">
              <div className="tku-lessons-prompt-banner__left">
                <div className="tku-lessons-prompt-banner__icon">
                  <LogIn size={24} />
                </div>
                <div className="tku-lessons-prompt-banner__content">
                  <h4>Đăng nhập để theo dõi bài giảng của bạn</h4>
                  <p>
                    Lưu tiến độ bài học, ghi nhận thời gian xem video và tiếp tục bài giảng bất cứ lúc nào trên mọi thiết bị.
                  </p>
                </div>
              </div>
              <div className="tku-lessons-prompt-banner__action">
                <Link to="/login?redirect=/lessons" className="tku-btn tku-btn--primary">
                  Đăng nhập tài khoản
                </Link>
              </div>
            </div>
          )}

          {/* Banner gợi ý khóa học nếu đã đăng nhập nhưng chưa có bài giảng nào */}
          {isAuthenticated && stats.totalLessons === 0 && !isLoading && (
            <div className="tku-lessons-prompt-banner">
              <div className="tku-lessons-prompt-banner__left">
                <div className="tku-lessons-prompt-banner__icon">
                  <BookOpen size={24} />
                </div>
                <div className="tku-lessons-prompt-banner__content">
                  <h4>Bạn chưa tham gia khóa học nào</h4>
                  <p>
                    Hãy khám phá các khóa học Hóa học Lớp 10, 11, 12 và Luyện thi THPT để bắt đầu học tập và theo dõi bài giảng.
                  </p>
                </div>
              </div>
              <div className="tku-lessons-prompt-banner__action">
                <Link to="/courses" className="tku-btn tku-btn--primary">
                  <span>Khám phá khóa học ngay</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {/* Thanh công cụ học tập: Tabs trạng thái + Tìm kiếm + Bộ lọc chi tiết */}
          <div className="tku-lessons-toolbar-wrapper">
            {/* Hàng 1: Tabs trạng thái & Ô tìm kiếm */}
            <div className="tku-lessons-toolbar__top">
              <div className="tku-lessons-status-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'all'}
                  className={`tku-lessons-tab-btn ${statusTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusTab('all')}
                >
                  <span>Tất cả bài giảng</span>
                  <span className="tku-lessons-tab-count">{tabCounts.all}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'in_progress'}
                  className={`tku-lessons-tab-btn ${statusTab === 'in_progress' ? 'is-active' : ''}`}
                  onClick={() => setStatusTab('in_progress')}
                >
                  <span>Đang học</span>
                  <span className="tku-lessons-tab-count">{tabCounts.in_progress}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'completed'}
                  className={`tku-lessons-tab-btn ${statusTab === 'completed' ? 'is-active' : ''}`}
                  onClick={() => setStatusTab('completed')}
                >
                  <span>Đã hoàn thành</span>
                  <span className="tku-lessons-tab-count">{tabCounts.completed}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusTab === 'not_started'}
                  className={`tku-lessons-tab-btn ${statusTab === 'not_started' ? 'is-active' : ''}`}
                  onClick={() => setStatusTab('not_started')}
                >
                  <span>Chưa học</span>
                  <span className="tku-lessons-tab-count">{tabCounts.not_started}</span>
                </button>
              </div>

              {/* Ô tìm kiếm bài giảng */}
              <div className="tku-lessons-search-wrap">
                <Search size={16} className="tku-lessons-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tên bài giảng hoặc chủ đề..."
                  className="tku-lessons-search-input"
                  aria-label="Tìm kiếm bài giảng"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="tku-lessons-search-clear"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Hàng 2: Bộ lọc phụ (Khóa học, Khối lớp, Định dạng) & Nút đổi View */}
            <div className="tku-lessons-toolbar__bottom">
              <div className="tku-lessons-filters-group">
                {/* Lọc theo Khóa học */}
                {availableCourses.length > 0 && (
                  <CustomSelect
                    value={selectedCourseId}
                    onChange={handleCourseChange}
                    options={courseOptions}
                    icon={<BookOpen size={14} />}
                    ariaLabel="Lọc theo khóa học"
                  />
                )}

                {/* Lọc theo Khối lớp */}
                <CustomSelect
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  options={GRADE_OPTIONS}
                  icon={<GraduationCap size={14} />}
                  ariaLabel="Lọc theo khối lớp"
                />

                {/* Lọc theo Định dạng bài giảng */}
                <CustomSelect
                  value={selectedFormat}
                  onChange={handleFormatChange}
                  options={FORMAT_OPTIONS}
                  icon={<Video size={14} />}
                  ariaLabel="Lọc theo định dạng bài giảng"
                />

                {/* Nút đặt lại bộ lọc nhanh khi có filter đang áp dụng */}
                {(selectedCourseId !== 'all' || selectedGrade !== 'all' || selectedFormat !== 'all') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="tku-filter-reset-btn"
                    title="Đặt lại toàn bộ bộ lọc"
                  >
                    <RotateCcw size={13} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* Nút chuyển đổi View: Grid vs List */}
              <div className="tku-view-switcher" role="group" aria-label="Chế độ hiển thị danh sách">
                <button
                  type="button"
                  className={`tku-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Hiển thị dạng thẻ lưới"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid size={16} />
                </button>
                <button
                  type="button"
                  className={`tku-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Hiển thị dạng danh sách chi tiết"
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Lỗi kết nối */}
          {errorMessage && (
            <div className="tku-course-detail__error-card" role="alert">
              <AlertCircle size={24} className="tku-course-detail__error-icon" />
              <div className="tku-course-detail__error-content">
                <h3 className="tku-course-detail__error-title">Không thể tải kho bài giảng</h3>
                <p className="tku-course-detail__error-desc">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="tku-course-detail__retry-btn"
                >
                  <RefreshCw size={14} />
                  <span>Thử tải lại</span>
                </button>
              </div>
            </div>
          )}

          {/* Đang tải dữ liệu: Hiển thị skeletons */}
          {isLoading && !errorMessage && (
            <div className={viewMode === 'grid' ? 'tku-lessons-grid' : 'tku-lessons-list'}>
              <div className="tku-lesson-skeleton" />
              <div className="tku-lesson-skeleton" />
              <div className="tku-lesson-skeleton" />
              <div className="tku-lesson-skeleton" />
              <div className="tku-lesson-skeleton" />
              <div className="tku-lesson-skeleton" />
            </div>
          )}

          {/* Hiển thị danh sách bài giảng */}
          {!isLoading && !errorMessage && (
            <>
              {displayedLessons.length > 0 ? (
                <>
                  <div
                    className={viewMode === 'grid' ? 'tku-lessons-grid' : 'tku-lessons-list'}
                    aria-label="Danh sách bài giảng học tập"
                  >
                    {displayedLessons.map((lesson) => (
                      <StudentLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>

                  {/* Nút xem thêm khi danh sách dài (Tối ưu DOM Rendering) */}
                  {filteredLessons.length > visibleCount && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '36px' }}>
                      <button
                        type="button"
                        className="tku-btn tku-btn--secondary"
                        onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                        style={{ minWidth: '240px' }}
                      >
                        <span>Xem thêm bài giảng ({filteredLessons.length - visibleCount} bài còn lại)</span>
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="Không tìm thấy bài giảng phù hợp"
                  description={
                    searchQuery || selectedCourseId !== 'all' || selectedGrade !== 'all' || selectedFormat !== 'all' || statusTab !== 'all'
                      ? 'Không có bài giảng nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.'
                      : 'Hiện chưa có bài giảng nào sẵn sàng trong hệ thống.'
                  }
                />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LessonsPage;
