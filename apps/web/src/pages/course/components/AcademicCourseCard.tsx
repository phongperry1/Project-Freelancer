import React, { useState, useMemo, memo } from 'react';
import {
  BookOpen,
  Users,
  ArrowRight,
  Layers,
  FlaskConical,
  GraduationCap,
} from 'lucide-react';
import type { PublicCourseItem } from '../../../services/course.service';
import { useAuth } from '../../../context/useAuth';

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
    case 'other':
      return 'Chuyên đề';
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

export interface AcademicCourseCardProps {
  course: PublicCourseItem;
  onSelect: (courseId: string) => void;
}

export const AcademicCourseCard: React.FC<AcademicCourseCardProps> = memo(({ course, onSelect }) => {
  const { isAuthenticated, user } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

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

  const hasValidAvatar =
    Boolean(course.teacher.avatarUrl) &&
    course.teacher.avatarUrl?.trim() !== '' &&
    !avatarFailed;

  // Khóa học chỉ được hiển thị "Đã tham gia" / "Vào học ngay" khi và chỉ khi:
  // 1. Tài khoản đã đăng nhập (isAuthenticated === true và user hợp lệ)
  // 2. Tài khoản đã thực sự ghi danh trong database (course.isEnrolled) hoặc có cache ghi danh hợp lệ
  const isEnrolled = useMemo(() => {
    if (!isAuthenticated || !user) {
      return false;
    }
    if (course.isEnrolled) {
      return true;
    }
    if (typeof window !== 'undefined') {
      const userSpecificEnrolled = user.id
        ? localStorage.getItem(`tku_enrolled_${user.id}_${course.id}`)
        : null;
      if (userSpecificEnrolled === 'true') {
        return true;
      }
      const genericEnrolled = localStorage.getItem(`tku_enrolled_${course.id}`);
      if (genericEnrolled === 'true') {
        return true;
      }
    }
    return false;
  }, [isAuthenticated, user, course.isEnrolled, course.id]);

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
        <span className={`tku-course-card__badge ${getGradeBadgeClass(course.grade)}`}>
          <GraduationCap size={13} aria-hidden="true" />
          <span>{getGradeLabel(course.grade)}</span>
        </span>

        {/* Floating Status Tag - Chỉ hiển thị khi học sinh đã ghi danh khóa học */}
        {isEnrolled && (
          <span className="tku-course-card__status-tag tku-course-card__status-tag--enrolled">
            <span
              className="tku-course-card__status-dot tku-course-card__status-dot--enrolled"
              aria-hidden="true"
            />
            <span>Đã tham gia</span>
          </span>
        )}
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
          {hasValidAvatar ? (
            <img
              src={course.teacher.avatarUrl!}
              alt={course.teacher.fullName}
              className="tku-course-card__teacher-avatar"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
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
            className={`tku-course-card__action-btn ${
              isEnrolled ? 'tku-course-card__action-btn--enrolled' : ''
            }`}
            onClick={() => onSelect(course.id)}
            aria-label={
              isEnrolled
                ? `Vào học ngay khóa học ${course.title}`
                : `Xem chi tiết khóa học ${course.title}`
            }
          >
            <span>{isEnrolled ? 'Vào học ngay' : 'Xem chi tiết'}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});

AcademicCourseCard.displayName = 'AcademicCourseCard';
