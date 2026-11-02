import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  Search,
  Layers,
  FlaskConical,
  GraduationCap,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle2,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { EmptyState } from '../../components/common/EmptyState';
import { courseService, type PublicCourseItem } from '../../services/course.service';
import { AcademicCourseCard } from './components/AcademicCourseCard';
import { useAuth } from '../../context/useAuth';
import type { GradeLevel } from '../../types/course.types';
import './coursesPage.css';

const FILTER_TABS: Array<{ key: GradeLevel; label: string }> = [
  { key: 'all', label: 'Tất cả khóa học' },
  { key: '10', label: 'Hóa học Lớp 10' },
  { key: '11', label: 'Hóa học Lớp 11' },
  { key: '12', label: 'Hóa học Lớp 12' },
  { key: 'exam', label: 'Luyện thi THPT' },
  { key: 'other', label: 'Chuyên đề khác' },
];

interface AcademicCategory {
  key: GradeLevel | 'my-courses';
  grade?: GradeLevel;
  badgeLabel: string;
  badgeClass: string;
  iconBgClass: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isSpecial?: boolean;
}

const ACADEMIC_CATEGORIES: AcademicCategory[] = [
  {
    key: 'my-courses',
    badgeLabel: 'Đang theo học',
    badgeClass: 'tku-academic-badge--enrolled',
    iconBgClass: 'tku-academic-icon--enrolled',
    title: 'Khóa học của tôi',
    subtitle: 'Tiếp tục hành trình học tập, theo dõi bài học và hoàn thành các chương mục trong khóa học bạn đã tham gia.',
    icon: CheckCircle2,
    isSpecial: true,
  },
  {
    key: '10',
    grade: '10',
    badgeLabel: 'Khối 10',
    badgeClass: 'tku-academic-badge--10',
    iconBgClass: 'tku-academic-icon--10',
    title: 'Chương trình Hóa học Lớp 10',
    subtitle: 'Nền tảng Hóa học THPT: Cấu tạo nguyên tử, Bảng tuần hoàn các nguyên tố, Liên kết hóa học và Phản ứng oxi hóa - khử theo chuẩn GDPT mới.',
    icon: BookOpen,
  },
  {
    key: '11',
    grade: '11',
    badgeLabel: 'Khối 11',
    badgeClass: 'tku-academic-badge--11',
    iconBgClass: 'tku-academic-icon--11',
    title: 'Chương trình Hóa học Lớp 11',
    subtitle: 'Kiến thức trọng tâm nâng cao: Cân bằng hóa học, Thuyết điện li, Nhóm Nitơ - Lưu huỳnh và Mở đầu Hóa học hữu cơ chuyên sâu.',
    icon: FlaskConical,
  },
  {
    key: '12',
    grade: '12',
    badgeLabel: 'Khối 12',
    badgeClass: 'tku-academic-badge--12',
    iconBgClass: 'tku-academic-icon--12',
    title: 'Chương trình Hóa học Lớp 12',
    subtitle: 'Khung kiến thức then chốt tốt nghiệp THPT: Este - Lipit, Cacbohiđrat, Amin - Amino axit - Peptit, Polime và Kim loại.',
    icon: GraduationCap,
  },
  {
    key: 'exam',
    grade: 'exam',
    badgeLabel: 'Luyện thi 9+',
    badgeClass: 'tku-academic-badge--exam',
    iconBgClass: 'tku-academic-icon--exam',
    title: 'Luyện thi THPT Quốc Gia & Đánh giá năng lực (ĐGNL)',
    subtitle: 'Chuyên đề bứt phá điểm 9+, rèn luyện kỹ năng giải nhanh trắc nghiệm và thực chiến phòng thi với bộ đề thi chuẩn cấu trúc ma trận BGD.',
    icon: Sparkles,
  },
  {
    key: 'other',
    grade: 'other',
    badgeLabel: 'Chuyên đề',
    badgeClass: 'tku-academic-badge--other',
    iconBgClass: 'tku-academic-icon--other',
    title: 'Chuyên đề bồi dưỡng & Kỹ năng học thuật',
    subtitle: 'Các khóa học chuyên biệt về phương pháp giải bài tập định lượng, thí nghiệm hóa học mô phỏng và kỹ năng bồi dưỡng học sinh giỏi.',
    icon: Layers,
  },
];

export const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [courses, setCourses] = useState<PublicCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GradeLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    document.title = 'Danh mục khóa học Hóa học | TKU E-Learning';
    window.scrollTo(0, 0);
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  useEffect(() => {
    let isMounted = true;

    courseService
      .getPublicCourses()
      .then((res) => {
        if (isMounted) {
          setCourses(res.courses || []);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error('Lỗi tải danh sách khóa học:', err);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Không thể kết nối đến máy chủ để lấy dữ liệu khóa học. Vui lòng thử lại sau.',
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
  }, [refreshTrigger]);

  // Đếm số lượng khóa học theo từng khối lớp
  const tabCounts = useMemo(() => {
    return {
      all: courses.length,
      '10': courses.filter((c) => c.grade === '10').length,
      '11': courses.filter((c) => c.grade === '11').length,
      '12': courses.filter((c) => c.grade === '12').length,
      exam: courses.filter((c) => c.grade === 'exam').length,
      other: courses.filter((c) => c.grade === 'other').length,
    };
  }, [courses]);

  // Danh sách các khóa học học sinh đã đăng ký / tham gia (từ database thực tế)
  const enrolledCourses = useMemo(() => {
    if (!isAuthenticated || !user) return [];
    return courses.filter((c) => Boolean(c.isEnrolled));
  }, [courses, isAuthenticated, user]);

  // Thống kê toàn hệ thống từ cơ sở dữ liệu thật
  const totalCourses = courses.length;
  const totalLessons = useMemo(
    () => courses.reduce((acc, c) => acc + (c.lessonCount || 0), 0),
    [courses],
  );
  const totalChapters = useMemo(
    () => courses.reduce((acc, c) => acc + (c.chapterCount || 0), 0),
    [courses],
  );
  const totalStudents = useMemo(
    () => courses.reduce((acc, c) => acc + (c.studentCount || 0), 0),
    [courses],
  );

  // Bộ lọc khóa học khi tìm kiếm hoặc xem một tab cụ thể
  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      // Lọc theo Tab khối lớp
      const matchesTab = activeTab === 'all' || course.grade === activeTab;
      if (!matchesTab) return false;

      // Lọc theo từ khóa tìm kiếm
      if (!query) return true;

      return (
        course.title.toLowerCase().includes(query) ||
        (course.description && course.description.toLowerCase().includes(query)) ||
        course.teacher.fullName.toLowerCase().includes(query)
      );
    });
  }, [courses, activeTab, searchQuery]);

  const handleSelectCourse = useCallback(
    (courseId: string) => {
      const selected = courses.find((c) => c.id === courseId);
      const isEnrolled =
        isAuthenticated &&
        Boolean(
          selected?.isEnrolled ||
            (user?.id &&
              typeof window !== 'undefined' &&
              (localStorage.getItem(`tku_enrolled_${user.id}_${courseId}`) === 'true' ||
                localStorage.getItem(`tku_enrolled_${courseId}`) === 'true')),
        );

      if (isEnrolled) {
        navigate(`/courses/${courseId}/learn`);
      } else {
        navigate(`/courses/${courseId}`);
      }
    },
    [navigate, courses, isAuthenticated, user],
  );

  const currentCategoryInfo = useMemo(() => {
    return ACADEMIC_CATEGORIES.find((cat) => cat.grade === activeTab);
  }, [activeTab]);

  return (
    <div className="tku-app tku-courses-page-wrapper">
      <Navbar />

      <main className="tku-courses-page-main">
        {/* Academic Hero Banner (Bố cục 2 cột chuẩn E-Learning TKU) */}
        <section className="tku-courses-hub-hero">
          <div className="tku-container">
            {/* Breadcrumb Trail Tinh Tế, Nhẹ Nhàng */}
            <nav className="tku-hero-breadcrumbs" aria-label="Đường dẫn điều hướng">
              <Link to="/" className="tku-hero-breadcrumb-link">
                <Home size={14} />
                <span>Trang chủ</span>
              </Link>
              <ChevronRight size={13} className="tku-hero-breadcrumb-sep" />
              <span className="tku-hero-breadcrumb-current">Danh mục khóa học</span>
            </nav>

            <div className="tku-courses-hub-hero__grid">
              {/* Cột Trái: Tiêu đề & Thông tin học thuật */}
              <div className="tku-courses-hub-hero__main">
                <div className="tku-courses-hub-hero__tag-wrap">
                  <span className="tku-courses-hub-hero__tag">
                    <Sparkles size={14} />
                    <span>Hệ sinh thái học tập TKU</span>
                  </span>
                  <span className="tku-courses-hub-hero__subtag">
                    Chương trình GDPT Mới
                  </span>
                </div>

                <h1 className="tku-courses-hub-hero__title">
                  Khám phá toàn bộ khóa học Hóa học
                </h1>

                <p className="tku-courses-hub-hero__desc">
                  Hệ thống chương trình đào tạo Hóa học trọng tâm từ Lớp 10 đến Luyện thi THPT Quốc Gia & Đánh giá năng lực. 
                  Giáo trình được biên soạn bài bản, khoa học, giúp học sinh làm chủ kiến thức và đạt kết quả cao nhất.
                </p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism Đẳng Cấp */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <BookOpen size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalCourses}</span>
                    <span className="tku-hub-glass-card__lbl">Khóa học chuyên sâu</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <FlaskConical size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalLessons}</span>
                    <span className="tku-hub-glass-card__lbl">Bài giảng chất lượng</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Layers size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalChapters}</span>
                    <span className="tku-hub-glass-card__lbl">Chương mục học tập</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <GraduationCap size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalStudents}</span>
                    <span className="tku-hub-glass-card__lbl">Học viên tham gia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar & Content */}
        <div className="tku-container tku-courses-hub-container">
          {/* Toolbar: Search & Filter Tabs */}
          <div className="tku-courses-hub__toolbar">
            {/* Search Input */}
            <div className="tku-courses-search-wrap">
              <Search size={18} className="tku-courses-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm khóa học theo tên, chuyên đề hoặc giáo viên..."
                className="tku-courses-search-input"
                aria-label="Tìm kiếm khóa học"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="tku-courses-search-clear"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="tku-courses-tabs" role="tablist" aria-label="Lọc khóa học theo khối lớp">
              {FILTER_TABS.map((tab) => {
                const count = tabCounts[tab.key] ?? 0;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`tku-tab-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <span className="tku-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          {isLoading ? (
            <div className="tku-courses-grid" aria-busy="true" aria-label="Đang tải dữ liệu khóa học">
              <div className="tku-course-skeleton" />
              <div className="tku-course-skeleton" />
              <div className="tku-course-skeleton" />
            </div>
          ) : errorMessage ? (
            <div className="tku-empty-state" role="alert">
              <div className="tku-empty-state__icon-wrapper" style={{ color: '#ef4444' }}>
                <AlertCircle size={40} />
              </div>
              <h3 className="tku-empty-state__title">Đã xảy ra sự cố tải dữ liệu</h3>
              <p className="tku-empty-state__desc">{errorMessage}</p>
              <button type="button" onClick={handleRetry} className="tku-empty-state__btn">
                <RefreshCw size={16} />
                <span>Thử lại</span>
              </button>
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              title="Chưa có khóa học nào được phát hành"
              description="Hiện tại các giảng viên đang hoàn thiện nội dung bài giảng. Danh sách khóa học mới sẽ được cập nhật sớm nhất."
              actionText="Tải lại trang"
              onAction={handleRetry}
            />
          ) : searchQuery.trim() ? (
            // 1. Chế độ tìm kiếm
            <div>
              <div className="tku-courses-search-result-bar">
                <div className="tku-courses-search-result-left">
                  <Search size={18} className="tku-courses-search-result-icon" />
                  <span>
                    Kết quả tìm kiếm cho: <strong>"{searchQuery.trim()}"</strong>
                  </span>
                  <span className="tku-courses-search-result-count">
                    {filteredCourses.length} khóa học tìm thấy
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="tku-courses-search-result-clear-btn"
                >
                  <X size={14} />
                  <span>Xóa tìm kiếm</span>
                </button>
              </div>

              {filteredCourses.length > 0 ? (
                <div className="tku-courses-grid">
                  {filteredCourses.map((course) => (
                    <AcademicCourseCard
                      key={`${course.id}-${course.thumbnailUrl ?? 'default'}`}
                      course={course}
                      onSelect={handleSelectCourse}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Không tìm thấy khóa học phù hợp"
                  description={`Không có khóa học nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với tên khóa học hoặc giáo viên khác.`}
                  actionText="Xóa từ khóa tìm kiếm"
                  onAction={handleClearSearch}
                />
              )}
            </div>
          ) : activeTab !== 'all' ? (
            // 2. Chế độ xem theo Tab khối lớp riêng biệt
            <div>
              {currentCategoryInfo && (
                <div className="tku-category-dedicated-banner">
                  <div className="tku-category-dedicated-banner__left">
                    <div
                      className={`tku-category-dedicated-banner__icon-box ${currentCategoryInfo.iconBgClass}`}
                    >
                      <currentCategoryInfo.icon size={28} />
                    </div>
                    <div>
                      <div className="tku-category-dedicated-banner__badge-row">
                        <span className={`tku-category-badge ${currentCategoryInfo.badgeClass}`}>
                          {currentCategoryInfo.badgeLabel}
                        </span>
                        <span className="tku-category-dedicated-banner__count">
                          {filteredCourses.length} khóa học đang hoạt động
                        </span>
                      </div>
                      <h2 className="tku-category-dedicated-banner__title">
                        {currentCategoryInfo.title}
                      </h2>
                      <p className="tku-category-dedicated-banner__subtitle">
                        {currentCategoryInfo.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {filteredCourses.length > 0 ? (
                <div className="tku-courses-grid">
                  {filteredCourses.map((course) => (
                    <AcademicCourseCard
                      key={`${course.id}-${course.thumbnailUrl ?? 'default'}`}
                      course={course}
                      onSelect={handleSelectCourse}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có khóa học cho khối lớp này"
                  description={`Hiện tại hệ thống đang hoàn thiện các chuyên đề bài giảng cho ${
                    currentCategoryInfo?.title || 'khối lớp này'
                  }. Bạn có thể khám phá các khối lớp khác.`}
                  actionText="Xem tất cả khóa học"
                  onAction={() => setActiveTab('all')}
                />
              )}
            </div>
          ) : (
            // 3. Chế độ xem "Tất cả" - Phân loại theo từng Hàng học thuật logic
            <div className="tku-courses-academic-catalog">
              {ACADEMIC_CATEGORIES.map((category) => {
                let rowCourses: PublicCourseItem[] = [];

                if (category.key === 'my-courses') {
                  rowCourses = enrolledCourses;
                } else if (category.grade) {
                  rowCourses = courses.filter((c) => c.grade === category.grade);
                }

                if (rowCourses.length === 0) return null;

                const IconComponent = category.icon;

                return (
                  <section
                    key={category.key}
                    className={`tku-courses-category-row ${
                      category.isSpecial ? 'tku-courses-category-row--special' : ''
                    }`}
                    aria-labelledby={`hub-cat-title-${category.key}`}
                  >
                    {/* Category Row Header */}
                    <div className="tku-category-row-header">
                      <div className="tku-category-row-header__left">
                        <div
                          className={`tku-category-row-header__icon-box ${category.iconBgClass}`}
                        >
                          <IconComponent size={22} />
                        </div>
                        <div className="tku-category-row-header__text">
                          <div className="tku-category-row-header__meta">
                            <span className={`tku-category-badge ${category.badgeClass}`}>
                              {category.badgeLabel}
                            </span>
                            <span className="tku-category-row-header__count">
                              {rowCourses.length} khóa học
                            </span>
                          </div>
                          <h2
                            id={`hub-cat-title-${category.key}`}
                            className="tku-category-row-header__title"
                          >
                            {category.title}
                          </h2>
                          <p className="tku-category-row-header__subtitle">
                            {category.subtitle}
                          </p>
                        </div>
                      </div>

                      {category.key === 'my-courses' ? (
                        <div className="tku-category-row-header__right">
                          <button
                            type="button"
                            className="tku-category-row-header__jump-btn tku-category-row-header__jump-btn--enrolled"
                            onClick={() => navigate('/my-courses')}
                            aria-label="Xem toàn bộ khóa học của tôi trên trang riêng"
                          >
                            <span>Xem toàn bộ khóa học của tôi</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : category.grade ? (
                        <div className="tku-category-row-header__right">
                          <button
                            type="button"
                            className="tku-category-row-header__jump-btn"
                            onClick={() => navigate(`/courses/category/${category.grade}`)}
                            aria-label={`Xem toàn bộ khóa học ${category.title} trên trang riêng`}
                          >
                            <span>Xem toàn bộ khối</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Course Cards Grid của từng hàng */}
                    <div className="tku-courses-grid">
                      {rowCourses.map((course) => (
                        <AcademicCourseCard
                          key={`${category.key}-${course.id}-${course.thumbnailUrl ?? 'default'}`}
                          course={course}
                          onSelect={handleSelectCourse}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoursesPage;
