import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { courseService, type PublicCourseItem } from '../../../services/course.service';
import { AcademicCourseCard } from '../../course/components/AcademicCourseCard';
import { useAuth } from '../../../context/useAuth';

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
  const { isAuthenticated, user } = useAuth();
  const [courses, setCourses] = useState<PublicCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setRefreshTrigger((prev) => prev + 1);
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

  // Các khóa học tiêu biểu hiển thị trên Landing Page (tối đa 6 khóa học nổi bật)
  const featuredCourses = useMemo(() => {
    return courses.slice(0, 6);
  }, [courses]);

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

        {/* Content Area - Hiển thị trực tiếp các khóa học tiêu biểu */}
        {isLoading ? (
          <div className="tku-courses-grid" aria-busy="true" aria-label="Đang tải dữ liệu khóa học">
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </div>
        ) : errorMessage ? (
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
        ) : featuredCourses.length > 0 ? (
          <div className="tku-courses-grid" id="courses-grid">
            {featuredCourses.map((course) => (
              <AcademicCourseCard
                key={`${course.id}-${course.thumbnailUrl ?? 'default'}`}
                course={course}
                onSelect={handleSelectCourse}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có khóa học nào được phát hành"
            description="Hiện tại các giảng viên đang hoàn thiện nội dung bài giảng. Danh sách khóa học mới sẽ được cập nhật sớm nhất."
            actionText="Tải lại trang"
            onAction={handleRetry}
          />
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
