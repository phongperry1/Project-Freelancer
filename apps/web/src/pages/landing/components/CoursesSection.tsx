import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  ArrowRight,
  Search,
  Layers,
  FlaskConical,
  GraduationCap,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { courseService, type PublicCourseItem } from '../../../services/course.service';
import type { GradeLevel } from '../../../types/course.types';

const FILTER_TABS: Array<{ key: GradeLevel; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: '10', label: 'Hóa học Lớp 10' },
  { key: '11', label: 'Hóa học Lớp 11' },
  { key: '12', label: 'Hóa học Lớp 12' },
  { key: 'exam', label: 'Luyện thi THPT' },
];

function getGradeLabel(grade: PublicCourseItem['grade']): string {
  switch (grade) {
    case '10':
      return 'Hóa 10';
    case '11':
      return 'Hóa 11';
    case '12':
      return 'Hóa 12';
    case 'exam':
      return 'Luyện thi THPT';
    default:
      return 'Hóa học';
  }
}

function getGradeBadgeClass(grade: PublicCourseItem['grade']): string {
  switch (grade) {
    case '10':
      return 'tku-course-card__badge--10';
    case '11':
      return 'tku-course-card__badge--11';
    case '12':
      return 'tku-course-card__badge--12';
    case 'exam':
      return 'tku-course-card__badge--exam';
    default:
      return 'tku-course-card__badge--other';
  }
}

// Subcomponent: Thẻ khóa học thực tế (Được tối ưu với memo để tránh render lại không cần thiết)
interface CourseCardProps {
  course: PublicCourseItem;
  onSelect: (courseId: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = memo(({ course, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const teacherInitials = useMemo(() => {
    if (!course.teacher.fullName) return 'GV';
    const parts = course.teacher.fullName.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [course.teacher.fullName]);

  const hasValidThumbnail =
    Boolean(course.thumbnailUrl) &&
    course.thumbnailUrl?.trim() !== '' &&
    !imageFailed;

  return (
    <article className="tku-course-card" aria-label={`Khóa học ${course.title}`}>
      {/* Thumbnail Area */}
      <div className="tku-course-card__thumb">
        {hasValidThumbnail ? (
          <img
            src={course.thumbnailUrl!}
            alt={course.title}
            className="tku-course-card__thumb-img"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="tku-course-card__thumb-fallback" role="img" aria-label="Hình minh họa khóa học TKU">
            <FlaskConical size={32} className="tku-course-card__fallback-icon" aria-hidden="true" />
            <span className="tku-course-card__fallback-title">TKU E-Learning</span>
            <span className="tku-course-card__fallback-sub">
              {getGradeLabel(course.grade)} · Bài giảng chuẩn
            </span>
          </div>
        )}

        {/* Floating Grade Badge */}
        <span
          className={`tku-course-card__badge ${getGradeBadgeClass(course.grade)}`}
        >
          <GraduationCap size={13} aria-hidden="true" />
          <span>{getGradeLabel(course.grade)}</span>
        </span>

        {/* Floating Status Tag */}
        <span className="tku-course-card__status-tag">
          <span className="tku-course-card__status-dot" aria-hidden="true" />
          <span>Đang diễn ra</span>
        </span>
      </div>

      {/* Body Area */}
      <div className="tku-course-card__body">
        {/* Meta Stats Top */}
        <div className="tku-course-card__meta-top">
          <span className="tku-course-card__meta-item" title={`${course.lessonCount} bài giảng`}>
            <BookOpen size={14} aria-hidden="true" />
            <span>{course.lessonCount} bài giảng</span>
          </span>
          <span className="tku-course-card__meta-item" title={`${course.chapterCount} chương mục`}>
            <Layers size={14} aria-hidden="true" />
            <span>{course.chapterCount} chương</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="tku-course-card__title" title={course.title}>
          {course.title}
        </h3>

        {/* Description */}
        <p className="tku-course-card__desc">
          {course.description?.trim() ||
            'Khóa học trọng tâm bám sát khung chuẩn kiến thức và hệ thống bài tập thực hành phong phú.'}
        </p>

        {/* Teacher Info */}
        <div className="tku-course-card__teacher">
          {course.teacher.avatarUrl ? (
            <img
              src={course.teacher.avatarUrl}
              alt={course.teacher.fullName}
              className="tku-course-card__teacher-avatar"
            />
          ) : (
            <div className="tku-course-card__teacher-fallback" aria-hidden="true">
              {teacherInitials}
            </div>
          )}
          <div className="tku-course-card__teacher-info">
            <span
              className="tku-course-card__teacher-name"
              title={course.teacher.fullName}
            >
              {course.teacher.fullName}
            </span>
            <span className="tku-course-card__teacher-role">
              Giảng viên phụ trách
            </span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="tku-course-card__footer">
          <span className="tku-course-card__students" title={`${course.studentCount} học viên tham gia`}>
            <Users size={15} aria-hidden="true" />
            <span>{course.studentCount} học viên</span>
          </span>

          <button
            type="button"
            className="tku-course-card__action-btn"
            onClick={() => onSelect(course.id)}
            aria-label={`Xem chi tiết khóa học ${course.title}`}
          >
            <span>Xem chi tiết</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});

CourseCard.displayName = 'CourseCard';

// Subcomponent: Skeleton Loading
const CourseSkeleton: React.FC = memo(() => {
  return (
    <div className="tku-course-skeleton" aria-hidden="true">
      <div className="tku-skeleton-thumb" />
      <div className="tku-skeleton-body">
        <div className="tku-skeleton-line tku-skeleton-line--half" />
        <div className="tku-skeleton-line tku-skeleton-line--title" />
        <div className="tku-skeleton-line tku-skeleton-line--desc" />
        <div className="tku-skeleton-footer">
          <div className="tku-skeleton-line" style={{ width: '80px' }} />
          <div
            className="tku-skeleton-line"
            style={{ width: '100px', height: '32px', borderRadius: '999px' }}
          />
        </div>
      </div>
    </div>
  );
});

CourseSkeleton.displayName = 'CourseSkeleton';

export const CoursesSection: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<PublicCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GradeLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

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

  // Tính số lượng khóa học thực tế theo từng Tab
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

  // Bộ lọc theo tab và ô tìm kiếm
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
      navigate(`/courses/${courseId}`);
    },
    [navigate],
  );

  return (
    <section id="courses" className="tku-section tku-courses-section">
      <div className="tku-container">
        {/* Section Header */}
        <div className="tku-section-header">
          <Badge variant="blue">
            <Sparkles size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Khóa học trực tuyến
          </Badge>
          <h2 className="tku-section-title">Lựa chọn lộ trình học của bạn</h2>
          <p className="tku-section-subtitle">
            Hệ thống khóa học Hóa học trọng tâm từ cơ bản đến nâng cao, bám sát cấu trúc đề thi mới nhất.
            Dữ liệu bài giảng được đồng bộ trực tiếp từ các thầy cô tại TKU E-Learning.
          </p>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="tku-courses-toolbar">
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
          // Loading Skeleton
          <div className="tku-courses-grid" aria-busy="true" aria-label="Đang tải dữ liệu khóa học">
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </div>
        ) : errorMessage ? (
          // Network Error State
          <div className="tku-empty-state" role="alert">
            <div className="tku-empty-state__icon-wrapper" style={{ color: '#ef4444' }}>
              <AlertCircle size={40} />
            </div>
            <h3 className="tku-empty-state__title">Đã xảy ra sự cố tải dữ liệu</h3>
            <p className="tku-empty-state__desc">{errorMessage}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="tku-empty-state__btn"
            >
              <RefreshCw size={16} />
              <span>Thử lại</span>
            </button>
          </div>
        ) : filteredCourses.length > 0 ? (
          // Real Courses Grid
          <div className="tku-courses-grid" id="courses-grid">
            {filteredCourses.map((course) => (
              <CourseCard
                key={`${course.id}-${course.thumbnailUrl ?? 'default'}`}
                course={course}
                onSelect={handleSelectCourse}
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          // No courses in Database
          <EmptyState
            title="Chưa có khóa học nào được phát hành"
            description="Hiện tại các giảng viên đang hoàn thiện nội dung bài giảng. Danh sách khóa học mới sẽ được cập nhật sớm nhất."
            actionText="Tải lại trang"
            onAction={handleRetry}
          />
        ) : (
          // Filter yielded no results
          <EmptyState
            title="Không tìm thấy khóa học phù hợp"
            description={`Không có khóa học nào khớp với bộ lọc "${
              activeTab !== 'all'
                ? FILTER_TABS.find((t) => t.key === activeTab)?.label
                : ''
            }" ${searchQuery ? `hoặc từ khóa "${searchQuery}"` : ''}.`}
            actionText="Xem tất cả khóa học"
            onAction={() => {
              setActiveTab('all');
              setSearchQuery('');
            }}
          />
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
