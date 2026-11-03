import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  CheckCircle2,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { EmptyState } from '../../components/common/EmptyState';
import { courseService, type PublicCourseItem } from '../../services/course.service';
import { AcademicCourseCard } from './components/AcademicCourseCard';
import { useAuth } from '../../context/useAuth';
import type { GradeLevel } from '../../types/course.types';
import './coursesPage.css';
import './categoryCoursesPage.css';

interface CategoryConfig {
  key: GradeLevel | 'my-courses';
  badgeLabel: string;
  heroThemeClass: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  'my-courses': {
    key: 'my-courses',
    badgeLabel: 'Khóa học của tôi',
    heroThemeClass: 'tku-cat-hero--my-courses',
    title: 'Khóa học của tôi',
    subtitle:
      'Không gian học tập cá nhân. Theo dõi tiến độ bài học, ôn tập kiến thức và tiếp tục hành trình bứt phá môn Hóa học.',
    icon: CheckCircle2,
  },
  '10': {
    key: '10',
    badgeLabel: 'Hóa học Lớp 10',
    heroThemeClass: 'tku-cat-hero--10',
    title: 'Chương trình Hóa học Lớp 10',
    subtitle:
      'Nền tảng Hóa học THPT: Cấu tạo nguyên tử, Bảng tuần hoàn các nguyên tố, Liên kết hóa học và Phản ứng oxi hóa - khử theo chuẩn GDPT mới.',
    icon: BookOpen,
  },
  '11': {
    key: '11',
    badgeLabel: 'Hóa học Lớp 11',
    heroThemeClass: 'tku-cat-hero--11',
    title: 'Chương trình Hóa học Lớp 11',
    subtitle:
      'Kiến thức trọng tâm nâng cao: Cân bằng hóa học, Thuyết điện li, Nhóm Nitơ - Lưu huỳnh và Mở đầu Hóa học hữu cơ chuyên sâu.',
    icon: FlaskConical,
  },
  '12': {
    key: '12',
    badgeLabel: 'Hóa học Lớp 12',
    heroThemeClass: 'tku-cat-hero--12',
    title: 'Chương trình Hóa học Lớp 12',
    subtitle:
      'Khung kiến thức then chốt tốt nghiệp THPT: Este - Lipit, Cacbohiđrat, Amin - Amino axit - Peptit, Polime và Kim loại.',
    icon: GraduationCap,
  },
  exam: {
    key: 'exam',
    badgeLabel: 'Luyện thi THPT & ĐGNL',
    heroThemeClass: 'tku-cat-hero--exam',
    title: 'Luyện thi THPT Quốc Gia & ĐGNL',
    subtitle:
      'Chuyên đề bứt phá điểm 9+, rèn luyện kỹ năng giải nhanh trắc nghiệm và thực chiến phòng thi với bộ đề thi chuẩn cấu trúc ma trận Bộ GD&ĐT.',
    icon: Sparkles,
  },
  other: {
    key: 'other',
    badgeLabel: 'Chuyên đề học thuật',
    heroThemeClass: 'tku-cat-hero--other',
    title: 'Chuyên đề bồi dưỡng & Kỹ năng học thuật',
    subtitle:
      'Các khóa học chuyên biệt về phương pháp giải bài tập định lượng, thí nghiệm hóa học mô phỏng và kỹ năng bồi dưỡng học sinh giỏi.',
    icon: Layers,
  },
};

interface CategoryCoursesPageProps {
  defaultCategory?: string;
}

export const CategoryCoursesPage: React.FC<CategoryCoursesPageProps> = ({ defaultCategory }) => {
  const { categoryKey: paramCategoryKey } = useParams<{ categoryKey?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const currentCategoryKey = defaultCategory || paramCategoryKey || 'my-courses';
  const categoryConfig: CategoryConfig =
    CATEGORY_MAP[currentCategoryKey] || CATEGORY_MAP['my-courses'];

  const [courses, setCourses] = useState<PublicCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'students' | 'lessons' | 'title'>('newest');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    document.title = `${categoryConfig.title} | TKU E-Learning`;
    window.scrollTo(0, 0);
  }, [categoryConfig.title, currentCategoryKey]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Tải dữ liệu thật từ Backend Database (tối ưu: chỉ tải khóa học thuộc khối lớp này từ DB)
  useEffect(() => {
    let isMounted = true;

    const gradeQuery = currentCategoryKey === 'my-courses' ? undefined : currentCategoryKey;

    courseService
      .getPublicCourses({ grade: gradeQuery })
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
  }, [currentCategoryKey, refreshTrigger]);

  // Danh sách khóa học thuộc phân mục hiện tại
  const rawTargetCourses = useMemo(() => {
    if (currentCategoryKey === 'my-courses') {
      if (!isAuthenticated || !user) return [];
      return courses.filter((c) => Boolean(c.isEnrolled));
    }
    return courses.filter((c) => c.grade === currentCategoryKey);
  }, [courses, currentCategoryKey, isAuthenticated, user]);

  // Tìm kiếm và sắp xếp kết quả
  const displayedCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = rawTargetCourses.filter((course) => {
      if (!query) return true;
      return (
        course.title.toLowerCase().includes(query) ||
        (course.description && course.description.toLowerCase().includes(query)) ||
        course.teacher.fullName.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'students') {
        return (b.studentCount || 0) - (a.studentCount || 0);
      }
      if (sortBy === 'lessons') {
        return (b.lessonCount || 0) - (a.lessonCount || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'vi');
      }
      // 'newest' default
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [rawTargetCourses, searchQuery, sortBy]);

  const totalCatLessons = useMemo(
    () => rawTargetCourses.reduce((acc, c) => acc + (c.lessonCount || 0), 0),
    [rawTargetCourses],
  );
  const totalCatChapters = useMemo(
    () => rawTargetCourses.reduce((acc, c) => acc + (c.chapterCount || 0), 0),
    [rawTargetCourses],
  );
  const totalCatStudents = useMemo(
    () => rawTargetCourses.reduce((acc, c) => acc + (c.studentCount || 0), 0),
    [rawTargetCourses],
  );

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

  const IconComponent = categoryConfig.icon;

  return (
    <div className="tku-app tku-category-page-wrapper">
      <Navbar />

      <main className="tku-category-page-main">
        {/* Tinh chỉnh Hero Banner: Bố cục 2 cột cân đối chuẩn E-Learning */}
        <section className={`tku-cat-hero ${categoryConfig.heroThemeClass}`}>
          <div className="tku-container">
            {/* Breadcrumb Trail Tinh Tế, Nhẹ Nhàng */}
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
              <span className="tku-hero-breadcrumb-current">{categoryConfig.title}</span>
            </nav>

            {/* Bố Cục 2 Cột Đối Xứng Chuẩn E-Learning */}
            <div className="tku-courses-hub-hero__grid">
              <div className="tku-cat-hero__content">
                <div className="tku-cat-hero__badge-row">
                  <span className="tku-cat-hero__badge">
                    <IconComponent size={14} />
                    <span>{categoryConfig.badgeLabel}</span>
                  </span>
                  <span className="tku-cat-hero__count-pill">
                    {currentCategoryKey === 'my-courses' ? 'Học tập cá nhân' : 'Chương trình GDPT mới'}
                  </span>
                </div>

                <h1 className="tku-cat-hero__title">{categoryConfig.title}</h1>
                <p className="tku-cat-hero__desc">{categoryConfig.subtitle}</p>
              </div>

              {/* Cột Phải: 4 Thẻ Thống Kê Học Thuật Glassmorphism */}
              <div className="tku-courses-hub-stats-grid">
                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--blue">
                    <BookOpen size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{rawTargetCourses.length}</span>
                    <span className="tku-hub-glass-card__lbl">Khóa học chuyên sâu</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--amber">
                    <FlaskConical size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalCatLessons}</span>
                    <span className="tku-hub-glass-card__lbl">Bài giảng chất lượng</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--purple">
                    <Layers size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalCatChapters}</span>
                    <span className="tku-hub-glass-card__lbl">Chương mục học tập</span>
                  </div>
                </div>

                <div className="tku-hub-glass-card">
                  <div className="tku-hub-glass-card__icon tku-hub-glass-card__icon--emerald">
                    <GraduationCap size={20} />
                  </div>
                  <div className="tku-hub-glass-card__content">
                    <span className="tku-hub-glass-card__num">{totalCatStudents}</span>
                    <span className="tku-hub-glass-card__lbl">Học viên tham gia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Khu vực nội dung & Toolbar lọc đồng bộ chuẩn */}
        <div className="tku-container tku-cat-container">
          {/* Toolbar lọc và tìm kiếm đồng bộ theo chuẩn hệ thống */}
          <div className="tku-category-filter-toolbar">
            <div className="tku-courses-search-wrap">
              <Search size={17} className="tku-courses-search-icon" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentCategoryKey === 'my-courses'
                    ? 'Tìm kiếm khóa học của bạn theo tên hoặc giáo viên...'
                    : `Tìm kiếm khóa học trong ${categoryConfig.title}...`
                }
                className="tku-courses-search-input"
                aria-label="Tìm kiếm khóa học"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="tku-courses-search-clear"
                  aria-label="Xóa từ khóa tìm kiếm"
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Bộ điều khiển bên phải: Dropdown Sắp xếp và Đếm số lượng */}
            <div className="tku-category-filter-toolbar__right">
              <div className="tku-courses-select-wrap">
                <select
                  id="tku-cat-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="tku-courses-select"
                  aria-label="Sắp xếp danh sách khóa học"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="students">Nhiều học viên nhất</option>
                  <option value="lessons">Nhiều bài học nhất</option>
                  <option value="title">Tên khóa học (A - Z)</option>
                </select>
                <ChevronDown size={14} className="tku-courses-select-icon" />
              </div>

              <div className="tku-category-filter-toolbar__count">
                <span>
                  Hiển thị <strong>{displayedCourses.length}</strong> khóa học
                </span>
              </div>
            </div>
          </div>

          {/* Thanh kết quả khi đang gõ tìm kiếm */}
          {searchQuery.trim() && (
            <div className="tku-courses-search-result-bar">
              <div className="tku-courses-search-result-left">
                <Search size={16} className="tku-courses-search-result-icon" />
                <span>
                  Kết quả tìm kiếm cho: <strong>"{searchQuery.trim()}"</strong>
                </span>
                <span className="tku-courses-search-result-count">
                  {displayedCourses.length} khóa học
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="tku-courses-search-result-clear-btn"
              >
                <X size={14} />
                <span>Xóa tìm kiếm</span>
              </button>
            </div>
          )}

          {/* Danh sách khóa học hoặc trạng thái Empty */}
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
          ) : displayedCourses.length > 0 ? (
            <div className="tku-courses-grid">
              {displayedCourses.map((course) => (
                <AcademicCourseCard
                  key={`${course.id}-${course.thumbnailUrl ?? 'default'}`}
                  course={course}
                  onSelect={handleSelectCourse}
                />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <EmptyState
              title="Không tìm thấy khóa học phù hợp"
              description={`Không có khóa học nào trong ${categoryConfig.title} khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`}
              actionText="Xóa từ khóa tìm kiếm"
              onAction={() => setSearchQuery('')}
            />
          ) : currentCategoryKey === 'my-courses' ? (
            user?.role === 'TEACHER' ? (
              <EmptyState
                title="Bạn chưa có khóa học nào phụ trách"
                description="Hãy truy cập không gian Giảng viên để khởi tạo và quản lý toàn bộ khóa học cùng hệ thống bài giảng của bạn."
                actionText="Quản lý khóa học của tôi"
                onAction={() => navigate('/lecturer/courses')}
              />
            ) : (
              <EmptyState
                title="Bạn chưa tham gia khóa học nào"
                description="Hãy kích hoạt mã Key được cấp bởi ban quản trị hoặc khám phá danh mục khóa học để bắt đầu hành trình học tập!"
                actionText="Khám phá toàn bộ khóa học"
                onAction={() => navigate('/courses')}
              />
            )
          ) : (
            <EmptyState
              title={`Chưa có khóa học cho ${categoryConfig.title}`}
              description="Hiện tại các giảng viên đang trong quá trình biên soạn và kiểm định bài giảng chất lượng cao. Các khóa học mới sẽ được cập nhật sớm nhất."
              actionText="Khám phá các khối lớp khác"
              onAction={() => navigate('/courses')}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryCoursesPage;
