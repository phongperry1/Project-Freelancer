import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Sparkles,
  GraduationCap,
  BookOpen,
  Clock,
  Target,
  Layers,
  Award,
  CheckCircle2,
  Compass,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  User,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useAuth } from '../../context/useAuth';
import {
  courseService,
  type PublicCourseItem,
  type PublicCourseDetailResponse,
  type StudentLessonsOverviewResponse,
} from '../../services/course.service';
import '../course/coursesPage.css';
import './roadmapPage.css';

export type RoadmapTab = 'all' | 'exam' | '12' | '11' | '10' | 'other';

interface TabDefinition {
  key: RoadmapTab;
  label: string;
  badgeLabel: string;
  title: string;
  description: string;
}

const ROADMAP_TABS: TabDefinition[] = [
  {
    key: 'all',
    label: 'Tất cả lộ trình',
    badgeLabel: 'Toàn diện hệ thống',
    title: 'Hệ thống Lộ trình Học tập Hóa học Toàn diện',
    description:
      'Tổng hợp toàn bộ các khóa học chuẩn mực bám sát chương trình GDPT mới và ma trận đề thi tuyển sinh Đại học, ĐGNL. Học tập có định hướng rõ ràng, đo lường tiến độ từng chặng và bứt phá điểm số tối đa.',
  },
  {
    key: 'exam',
    label: 'Luyện thi THPT & ĐGNL',
    badgeLabel: 'Mục tiêu 9+ Điểm',
    title: 'Lộ trình Bứt phá THPT Quốc Gia & ĐGNL 9+',
    description:
      'Lộ trình toàn diện bám sát ma trận đề thi tốt nghiệp THPT và cấu trúc Đánh giá năng lực mới nhất. Giúp học sinh quét sạch lý thuyết chống sai ngu, làm chủ tư duy giải nhanh hiện đại và rèn luyện tâm lý phòng thi thực chiến.',
  },
  {
    key: '12',
    label: 'Hóa học Lớp 12',
    badgeLabel: 'Khung Điểm Khối 12',
    title: 'Lộ trình Chương trình Hóa học Lớp 12 Chuẩn GDPT Mới',
    description:
      'Làm chủ toàn bộ các chuyên đề cốt lõi lớp 12: Este - Lipit, Cacbohiđrat, Amin, Polime đến Đại cương kim loại và phức chất. Xây dựng nền tảng tư duy hóa học sâu sắc cho các kỳ thi quan trọng.',
  },
  {
    key: '11',
    label: 'Hóa học Lớp 11',
    badgeLabel: 'Nền tảng Khối 11',
    title: 'Lộ trình Chương trình Hóa học Lớp 11 Cốt lõi',
    description:
      'Hệ thống hóa kiến thức Cân bằng hóa học, Năng lượng hóa học, Hóa học vô cơ nhóm chính và Đại cương hóa học hữu cơ. Bản lề vững chắc trước khi bước vào giai đoạn ôn thi nước rút.',
  },
  {
    key: '10',
    label: 'Hóa học Lớp 10',
    badgeLabel: 'Khởi đầu Khối 10',
    title: 'Lộ trình Làm quen & Chinh phục Hóa học Lớp 10',
    description:
      'Làm chủ cấu tạo nguyên tử, bảng tuần hoàn, liên kết hóa học và phản ứng oxi hóa - khử theo chương trình sách giáo khoa mới. Khơi dậy niềm đam mê và phương pháp học Hóa khoa học.',
  },
  {
    key: 'other',
    label: 'Chuyên đề khác',
    badgeLabel: 'Bồi dưỡng & Mở rộng',
    title: 'Lộ trình Chuyên đề Nâng cao & Bồi dưỡng Chuyên sâu',
    description:
      'Các khóa học bồi dưỡng chuyên đề nâng cao, phương pháp giải nhanh trắc nghiệm và kỹ năng phòng thi dành cho học sinh muốn nâng cao tư duy hóa học toàn diện.',
  },
];

/**
 * Phân loại khóa học vào đúng tab dựa trên grade hoặc tiêu đề khóa học
 */
const getCourseGrade = (course: PublicCourseItem): RoadmapTab => {
  const g = String(course.grade || '').toLowerCase().trim();
  if (g === '10' || g === '11' || g === '12' || g === 'exam') {
    return g as RoadmapTab;
  }
  const text = `${course.title || ''} ${course.description || ''}`.toLowerCase();
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
};

const getInitials = (name?: string | null): string => {
  if (!name) return 'GV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Tab đang hoạt động
  const initialTab = (searchParams.get('tab') as RoadmapTab) || 'all';
  const [activeTab, setActiveTab] = useState<RoadmapTab>(initialTab);

  // Danh sách toàn bộ khóa học thật từ cơ sở dữ liệu
  const [allCourses, setAllCourses] = useState<PublicCourseItem[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chi tiết chương mục của các khóa học (cache để hiển thị cấu trúc thực tế)
  const [courseDetails, setCourseDetails] = useState<Record<string, PublicCourseDetailResponse>>({});

  // Dữ liệu tiến độ thực tế của học sinh nếu đã đăng nhập
  const [studentProgress, setStudentProgress] = useState<StudentLessonsOverviewResponse | null>(null);

  // Đồng bộ URL query khi chuyển tab
  const handleTabChange = useCallback(
    (tab: RoadmapTab) => {
      setActiveTab(tab);
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  // Tải danh sách khóa học thật từ Database
  const fetchAllData = useCallback(async () => {
    setIsLoadingCourses(true);
    setErrorMessage(null);
    try {
      const coursesRes = await courseService.getPublicCourses();
      const coursesList = coursesRes.courses || [];
      setAllCourses(coursesList);

      // Nếu học sinh đã đăng nhập, tải thêm dữ liệu tiến độ thực tế
      if (isAuthenticated) {
        courseService
          .getStudentLessonsOverview()
          .then((progressRes) => {
            setStudentProgress(progressRes);
          })
          .catch(() => {
            // Không làm gián đoạn trang nếu chưa ghi danh
          });
      }

      // Tải chi tiết chương mục cho các khóa học để hiển thị danh mục bài học thật
      coursesList.forEach((c) => {
        courseService
          .getPublicCourseById(c.id)
          .then((detail) => {
            setCourseDetails((prev) => ({ ...prev, [c.id]: detail }));
          })
          .catch(() => {
            // Bỏ qua lỗi lẻ
          });
      });
    } catch (err: unknown) {
      console.error('Lỗi tải dữ liệu lộ trình:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ để lấy dữ liệu lộ trình khóa học.',
      );
    } finally {
      setIsLoadingCourses(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    document.title = 'Lộ trình Học tập Hóa học Toàn diện | TKU E-Learning';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let isMounted = true;

    courseService
      .getPublicCourses()
      .then((coursesRes) => {
        if (!isMounted) return;
        const coursesList = coursesRes.courses || [];
        setAllCourses(coursesList);

        if (isAuthenticated) {
          courseService
            .getStudentLessonsOverview()
            .then((progressRes) => {
              if (isMounted) setStudentProgress(progressRes);
            })
            .catch(() => {});
        }

        coursesList.forEach((c) => {
          courseService
            .getPublicCourseById(c.id)
            .then((detail) => {
              if (isMounted) {
                setCourseDetails((prev) => ({ ...prev, [c.id]: detail }));
              }
            })
            .catch(() => {});
        });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error('Lỗi tải dữ liệu lộ trình:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến máy chủ để lấy dữ liệu lộ trình khóa học.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCourses(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Bộ đếm số lượng khóa học cố định theo từng tab (không bao giờ nhảy về 0)
  const tabCounts = useMemo(() => {
    const counts: Record<RoadmapTab, number> = {
      all: allCourses.length,
      exam: 0,
      '12': 0,
      '11': 0,
      '10': 0,
      other: 0,
    };
    allCourses.forEach((c) => {
      const g = getCourseGrade(c);
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [allCourses]);

  // Danh sách khóa học thuộc Tab đang chọn
  const activeCourses = useMemo(() => {
    if (activeTab === 'all') return allCourses;
    return allCourses.filter((c) => getCourseGrade(c) === activeTab);
  }, [allCourses, activeTab]);

  // Thống kê tổng hợp toàn hệ thống
  const totalLessons = useMemo(
    () => allCourses.reduce((acc, c) => acc + (c.lessonCount || 0), 0),
    [allCourses],
  );
  const totalChapters = useMemo(
    () => allCourses.reduce((acc, c) => acc + (c.chapterCount || 0), 0),
    [allCourses],
  );

  // Thống kê riêng cho Tab đang chọn
  const activeTabMeta = useMemo(() => {
    const found = ROADMAP_TABS.find((t) => t.key === activeTab);
    return found || ROADMAP_TABS[0];
  }, [activeTab]);

  const activeTabStats = useMemo(() => {
    const coursesCount = activeCourses.length;
    const chaptersCount = activeCourses.reduce((sum, c) => sum + (c.chapterCount || 0), 0);
    const lessonsCount = activeCourses.reduce((sum, c) => sum + (c.lessonCount || 0), 0);

    // Thu thập danh sách giảng viên phụ trách thực tế
    const teachersMap = new Map<string, string>();
    activeCourses.forEach((c) => {
      if (c.teacher?.fullName) {
        teachersMap.set(c.teacher.id, c.teacher.fullName);
      }
    });
    const teachersList = Array.from(teachersMap.values());

    return {
      coursesCount,
      chaptersCount,
      lessonsCount,
      teachers: teachersList.length > 0 ? teachersList.join(', ') : 'Đội ngũ Giảng viên TKU',
    };
  }, [activeCourses]);

  // Tính tiến độ thực tế của học sinh trong tab đang chọn (nếu có)
  const userEnrolledInActiveTab = useMemo(() => {
    if (!studentProgress || !studentProgress.enrolledCourses) return null;
    const activeIds = new Set(activeCourses.map((c) => c.id));
    const matching = studentProgress.enrolledCourses.filter((ec) => activeIds.has(ec.id));
    if (matching.length === 0) return null;

    const totalEnrollLessons = matching.reduce((sum, c) => sum + c.totalLessons, 0);
    const completedEnrollLessons = matching.reduce((sum, c) => sum + c.completedLessons, 0);
    const avgProgress =
      totalEnrollLessons > 0
        ? Math.round((completedEnrollLessons / totalEnrollLessons) * 100)
        : 0;

    return {
      enrolledCount: matching.length,
      totalEnrollLessons,
      completedEnrollLessons,
      avgProgress,
    };
  }, [studentProgress, activeCourses]);

  return (
    <div className="tku-app tku-courses-page-wrapper">
      <Navbar />

      <main className="tku-courses-page-main">
        {/* ================================================================
            1. ACADEMIC HERO BANNER (ĐỒNG BỘ 2 CỘT CHUẨN TKU E-LEARNING)
            ================================================================ */}
        <section className="tku-courses-hub-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Lộ trình học tập</span>
            </nav>

            <div className="tku-courses-hub-hero__grid">
              {/* Cột Trái: Tiêu đề & Thông tin học thuật */}
              <div className="tku-courses-hub-hero__main">
                <div className="tku-courses-hub-hero__tag-wrap">
                  <span className="tku-courses-hub-hero__tag">
                    <Sparkles size={14} />
                    <span>Hệ thống Lộ trình chuẩn hóa TKU</span>
                  </span>
                  <span className="tku-courses-hub-hero__subtag">
                    Bám sát cấu trúc thi BGD & GDPT mới
                  </span>
                </div>

                <h1 className="tku-courses-hub-hero__title">
                  Lộ trình Chinh phục Hóa học Toàn diện
                </h1>

                <p className="tku-courses-hub-hero__desc">
                  Hệ thống lộ trình đào tạo bài bản từ cơ bản đến nâng cao theo từng khối lớp và chương trình luyện thi. Bám sát ma trận đề thi BGD và chương trình GDPT mới. Học tập có định hướng rõ ràng, đo lường tiến độ từng chặng và bứt phá điểm số tối đa.
                </p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism Dữ Liệu Thật */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <Compass size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">5 Khối lớp</span>
                    <span className="tku-hub-glass-card__lbl">Lộ trình trọng tâm</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <BookOpen size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{allCourses.length} Khóa học</span>
                    <span className="tku-hub-glass-card__lbl">Hệ thống đào tạo</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <Layers size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalChapters} Chuyên đề</span>
                    <span className="tku-hub-glass-card__lbl">Chương học cốt lõi</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Award size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalLessons} Bài giảng</span>
                    <span className="tku-hub-glass-card__lbl">Học lý thuyết & bài tập</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            2. TOOLBAR: TABS CHỌN LỘ TRÌNH THEO KHỐI LỚP (BỘ ĐẾM CHÍNH XÁC)
            ================================================================ */}
        <div className="tku-container tku-courses-hub-container">
          <div className="tku-courses-hub__toolbar" style={{ marginBottom: '28px' }}>
            <div className="tku-courses-tabs" role="tablist" aria-label="Danh sách lộ trình học tập theo khối lớp">
              {ROADMAP_TABS.map((tab) => {
                const count = tabCounts[tab.key] ?? 0;
                const isActive = tab.key === activeTab;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(tab.key)}
                    className={`tku-tab-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <span>{tab.label}</span>
                    <span className="tku-tab-count">{count} khóa</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message if courses failed to load */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                marginBottom: '24px',
                color: '#991b1b',
                fontSize: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={fetchAllData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  background: '#ffffff',
                  color: '#b91c1c',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* ================================================================
              3. THẺ TỔNG QUAN LỘ TRÌNH ĐANG CHỌN (CHỈ HIỂN THỊ DỮ LIỆU THẬT)
              ================================================================ */}
          <div
            className="tku-courses-category-row tku-courses-category-row--special"
            style={{ marginBottom: '36px' }}
          >
            <div className="tku-category-row-header">
              <div className="tku-category-row-header__left">
                <div className="tku-category-row-header__icon-box tku-academic-icon--exam">
                  <GraduationCap size={24} />
                </div>
                <div className="tku-category-row-header__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span className="tku-category-badge tku-academic-badge--exam">
                      {activeTabMeta.badgeLabel}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--tku-hub-text-muted)' }}>
                      • Bám sát chương trình Giáo dục Phổ thông
                    </span>
                  </div>
                  <h2 className="tku-category-row-header__title" style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 6px' }}>
                    {activeTabMeta.title}
                  </h2>
                  <p className="tku-category-row-header__subtitle" style={{ maxWidth: '860px', margin: 0 }}>
                    {activeTabMeta.description}
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Thống kê Thực tế của Lộ trình này */}
            <div className="tku-roadmap-stat-pills-row">
              <div className="tku-roadmap-stat-pill">
                <BookOpen size={18} />
                <div>
                  <div className="tku-roadmap-stat-pill__label">Khóa học trong lộ trình</div>
                  <div className="tku-roadmap-stat-pill__value">{activeTabStats.coursesCount} Khóa học</div>
                </div>
              </div>

              <div className="tku-roadmap-stat-pill">
                <Layers size={18} />
                <div>
                  <div className="tku-roadmap-stat-pill__label">Quy mô chuyên đề</div>
                  <div className="tku-roadmap-stat-pill__value">{activeTabStats.chaptersCount} Chương học cốt lõi</div>
                </div>
              </div>

              <div className="tku-roadmap-stat-pill">
                <Target size={18} />
                <div>
                  <div className="tku-roadmap-stat-pill__label">Tổng số bài giảng</div>
                  <div className="tku-roadmap-stat-pill__value">{activeTabStats.lessonsCount} Bài học & Bài tập</div>
                </div>
              </div>

              <div className="tku-roadmap-stat-pill">
                <Award size={18} />
                <div>
                  <div className="tku-roadmap-stat-pill__label">Giảng viên phụ trách</div>
                  <div className="tku-roadmap-stat-pill__value" style={{ fontSize: '13px' }}>
                    {activeTabStats.teachers}
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Tiến độ Học tập Thực tế (Nếu học sinh đã đăng ký các khóa trong lộ trình này) */}
            {userEnrolledInActiveTab && (
              <div className="tku-roadmap-progress-banner">
                <div className="tku-roadmap-progress-left">
                  <div className="tku-roadmap-progress-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div className="tku-roadmap-progress-title">
                      Tiến độ học tập của bạn trong lộ trình này
                    </div>
                    <div className="tku-roadmap-progress-desc">
                      Đã hoàn thành {userEnrolledInActiveTab.completedEnrollLessons}/
                      {userEnrolledInActiveTab.totalEnrollLessons} bài học (
                      {userEnrolledInActiveTab.enrolledCount} khóa đang theo học)
                    </div>
                  </div>
                </div>

                <div className="tku-roadmap-progress-bar-wrap">
                  <div className="tku-roadmap-progress-bar-bg">
                    <div
                      className="tku-roadmap-progress-bar-fill"
                      style={{ width: `${userEnrolledInActiveTab.avgProgress}%` }}
                    />
                  </div>
                  <span className="tku-roadmap-progress-bar-pct">
                    {userEnrolledInActiveTab.avgProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              4. HÀNH TRÌNH TỪNG CHẶNG / KHÓA HỌC THẬT TỪ CƠ SỞ DỮ LIỆU
              ================================================================ */}
          <div className="tku-roadmap-milestones-container">
            <div className="tku-roadmap-section-header">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tku-hub-primary)', background: 'var(--tku-hub-primary-soft)', border: '1px solid var(--tku-hub-primary-border)', padding: '4px 12px', borderRadius: '999px', marginBottom: '8px' }}>
                <Layers size={13} />
                <span>Chi tiết các chặng đào tạo thực tế</span>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--tku-hub-text-title)', margin: '4px 0 6px' }}>
                Hành trình {activeCourses.length} Chặng từ Nền tảng đến Bứt phá
              </h3>
              <p style={{ fontSize: '14.5px', color: 'var(--tku-hub-text-muted)', margin: 0 }}>
                Mỗi chặng là một khóa học bài bản trên hệ thống TKU kèm danh mục chương mục cụ thể, giúp học sinh học tập và rèn luyện trực tiếp.
              </p>
            </div>

            {/* Danh sách các khóa học thực tế đại diện cho từng chặng */}
            {isLoadingCourses ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[1, 2].map((n) => (
                  <div key={n} className="tku-roadmap-stage-block" style={{ opacity: 0.6 }}>
                    <div style={{ width: '120px', height: '14px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '12px' }} />
                    <div style={{ width: '40%', height: '22px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '10px' }} />
                    <div style={{ width: '80%', height: '14px', background: '#f1f5f9', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            ) : activeCourses.length > 0 ? (
              <div className="tku-roadmap-stepper-list">
                {activeCourses.map((course, index) => {
                  const detail = courseDetails[course.id];
                  const chapters = detail?.chapters || [];
                  const isEnrolled = Boolean(isAuthenticated && course.isEnrolled);

                  // Tìm tiến độ cụ thể của khóa này nếu có
                  const progressItem = studentProgress?.enrolledCourses?.find(
                    (ec) => ec.id === course.id,
                  );
                  const progressPct = progressItem?.progressPercent ?? (isEnrolled ? 0 : 0);

                  return (
                    <article
                      key={course.id}
                      className={`tku-roadmap-stage-block ${isEnrolled ? 'is-enrolled' : ''}`}
                    >
                      {/* Badge Chặng và Trạng thái */}
                      <div className="tku-roadmap-stage-badge-wrap">
                        <span className="tku-roadmap-stage-num-badge">
                          Chặng 0{index + 1}
                        </span>

                        <span className="tku-roadmap-stage-grade-badge tku-academic-badge--exam">
                          Khối {course.grade === 'exam' ? 'Luyện thi 9+' : `Lớp ${course.grade}`}
                        </span>

                        {isEnrolled ? (
                          <span className="tku-roadmap-stage-enrolled-badge">
                            <CheckCircle2 size={13} />
                            <span>Đang theo học ({progressPct}%)</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tku-hub-text-muted)', background: 'var(--tku-hub-surface-subtle)', border: '1px solid var(--tku-hub-border)', padding: '3px 10px', borderRadius: '999px' }}>
                            Khóa học chuẩn hóa
                          </span>
                        )}
                      </div>

                      {/* Nội dung chính của chặng */}
                      <div className="tku-roadmap-stage-main">
                        <div className="tku-roadmap-stage-info">
                          <h4 className="tku-roadmap-stage-title">{course.title}</h4>

                          <p className="tku-roadmap-stage-desc">
                            {course.description ||
                              'Khóa học cung cấp kiến thức toàn diện, hệ thống lý thuyết chuẩn mực và bài tập rèn luyện tư duy giải nhanh bám sát ma trận thi.'}
                          </p>

                          <div className="tku-roadmap-stage-meta-row">
                            <span className="tku-roadmap-stage-meta-item">
                              <Layers size={15} />
                              <span>{course.chapterCount || chapters.length || 0} Chương chuyên đề</span>
                            </span>

                            <span className="tku-roadmap-stage-meta-item">
                              <BookOpen size={15} />
                              <span>{course.lessonCount || 0} Bài giảng video & Bài tập</span>
                            </span>

                            <span className="tku-roadmap-stage-meta-item">
                              <User size={15} />
                              <span>{course.studentCount || 0} Học sinh đã tham gia</span>
                            </span>
                          </div>

                          {/* Cấu trúc Chương học thực tế từ Cơ sở dữ liệu */}
                          {chapters.length > 0 && (
                            <div className="tku-roadmap-chapters-wrap">
                              <div className="tku-roadmap-chapters-label">
                                <Layers size={13} />
                                <span>Cấu trúc chương học then chốt ({chapters.length} chương):</span>
                              </div>

                              <div className="tku-roadmap-chapters-grid">
                                {chapters.map((ch, chIdx) => (
                                  <div key={ch.id} className="tku-roadmap-chapter-card">
                                    <span className="tku-roadmap-chapter-name" title={ch.title}>
                                      Chương {chIdx + 1}: {ch.title}
                                    </span>
                                    <span className="tku-roadmap-chapter-count">
                                      {ch.lessons?.length || 0} bài
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cột Phải: Giảng viên phụ trách & Nút điều hướng */}
                        <div className="tku-roadmap-stage-side">
                          <div className="tku-roadmap-stage-teacher">
                            <div className="tku-roadmap-stage-teacher-avatar">
                              {course.teacher?.avatarUrl ? (
                                <img src={course.teacher.avatarUrl} alt={course.teacher.fullName} />
                              ) : (
                                <span>{getInitials(course.teacher?.fullName)}</span>
                              )}
                            </div>
                            <div>
                              <div className="tku-roadmap-stage-teacher-name">
                                {course.teacher?.fullName || 'Giảng viên TKU'}
                              </div>
                              <div className="tku-roadmap-stage-teacher-role">
                                Giảng viên Chuyên môn
                              </div>
                            </div>
                          </div>

                          {/* Tiến độ cá nhân nếu đã ghi danh */}
                          {isEnrolled && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--tku-hub-text-muted)', marginBottom: '4px' }}>
                                <span>Tiến độ của bạn</span>
                                <span style={{ color: '#10b981', fontWeight: 700 }}>{progressPct}%</span>
                              </div>
                              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progressPct}%`, background: '#10b981', borderRadius: '999px' }} />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="tku-roadmap-stage-actions">
                            {isEnrolled ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/courses/${course.id}/learn`)}
                                className="tku-roadmap-stage-btn-primary"
                              >
                                <span>Vào phòng học ngay</span>
                                <ExternalLink size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/courses/${course.id}`)}
                                className="tku-roadmap-stage-btn-primary"
                              >
                                <span>Xem chi tiết & Kích hoạt</span>
                                <ExternalLink size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => navigate(`/courses/${course.id}`)}
                              className="tku-roadmap-stage-btn-secondary"
                            >
                              <span>Thông tin chi tiết khóa học</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Empty State khi chưa có khóa học trong Tab này */
              <div className="tku-roadmap-empty-state">
                <div className="tku-roadmap-empty-icon">
                  <Compass size={32} />
                </div>
                <h4 className="tku-roadmap-empty-title">
                  Chưa có khóa học trong lộ trình {activeTabMeta.label}
                </h4>
                <p className="tku-roadmap-empty-desc">
                  Hiện tại ban chuyên môn TKU đang hoàn thiện và cập nhật các khóa học mới cho lộ trình này. Bạn có thể xem các khóa học ở những khối lớp khác để bắt đầu học tập ngay!
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className="tku-roadmap-btn-primary"
                  style={{ margin: '0 auto' }}
                >
                  <BookOpen size={16} />
                  <span>Xem tất cả khóa học khả dụng</span>
                </button>
              </div>
            )}
          </div>

          {/* ================================================================
              5. KHỐI QUY CHUẨN & ĐỊNH HƯỚNG HỌC TẬP THEO LỘ TRÌNH TKU
              ================================================================ */}
          <section className="tku-roadmap-advisor-card">
            <div className="tku-roadmap-advisor-head">
              <div className="tku-roadmap-advisor-icon">
                <GraduationCap size={22} />
              </div>
              <h3 className="tku-roadmap-advisor-title">Định hướng Học tập Hiệu quả theo Lộ trình TKU</h3>
            </div>

            <p className="tku-roadmap-advisor-subtitle">
              Phương pháp học tập khoa học được đúc kết từ các thủ khoa và đội ngũ Giảng viên TKU E-Learning:
            </p>

            <div className="tku-roadmap-advice-grid">
              <div className="tku-roadmap-advice-box">
                <div className="tku-roadmap-advice-box__target">
                  <CheckCircle2 size={16} />
                  <span>Học cuốn chiếu từng chuyên đề</span>
                </div>
                <p className="tku-roadmap-advice-box__text">
                  Không nhảy cóc bài giảng. Học kỹ video lý thuyết, ghi chép bản chất hóa học và làm bài tập củng cố ngay sau mỗi bài học.
                </p>
              </div>

              <div className="tku-roadmap-advice-box">
                <div className="tku-roadmap-advice-box__target">
                  <Clock size={16} />
                  <span>Tự kiểm tra & Đo lường định kỳ</span>
                </div>
                <p className="tku-roadmap-advice-box__text">
                  Thực hiện các bài kiểm tra trắc nghiệm online sau mỗi chương học để đánh giá chính xác mức độ hiểu bài và phát hiện lỗ hổng kịp thời.
                </p>
              </div>

              <div className="tku-roadmap-advice-box">
                <div className="tku-roadmap-advice-box__target">
                  <Award size={16} />
                  <span>Hỏi đáp & Trao đổi 24/7</span>
                </div>
                <p className="tku-roadmap-advice-box__text">
                  Chủ động đặt câu hỏi thắc mắc tại mục Hỏi đáp để được Giảng viên và trợ lý học tập giải đáp bản chất và phương pháp giải nhanh.
                </p>
              </div>
            </div>
          </section>

          {/* ================================================================
              6. BOTTOM CALL TO ACTION
              ================================================================ */}
          <section className="tku-roadmap-bottom-cta">
            <div className="tku-roadmap-bottom-cta__left">
              <h4 className="tku-roadmap-bottom-cta__title">
                Bạn đã sẵn sàng bước vào hành trình chinh phục điểm số môn Hóa?
              </h4>
              <p className="tku-roadmap-bottom-cta__desc">
                Khám phá kho bài giảng chuyên đề hoặc tham gia diễn đàn hỏi đáp học tập cùng cộng đồng học sinh TKU.
              </p>
            </div>

            <div className="tku-roadmap-bottom-cta__actions">
              <Link to="/lessons" className="tku-roadmap-btn-primary">
                <BookOpen size={16} />
                <span>Xem kho bài giảng</span>
              </Link>

              <Link to="/qa" className="tku-roadmap-btn-secondary">
                <Sparkles size={16} />
                <span>Tham gia Hỏi đáp học tập</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RoadmapPage;
