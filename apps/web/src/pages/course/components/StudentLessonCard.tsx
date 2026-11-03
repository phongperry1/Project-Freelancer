import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Lock,
  BookOpen,
} from 'lucide-react';
import type { StudentLessonItem } from '../../../services/course.service';

export interface StudentLessonCardProps {
  lesson: StudentLessonItem;
  viewMode?: 'grid' | 'list';
}

function getGradeBadgeInfo(grade: StudentLessonItem['courseGrade']) {
  switch (grade) {
    case '10':
      return { label: 'Lớp 10', className: 'tku-lesson-grade--10' };
    case '11':
      return { label: 'Lớp 11', className: 'tku-lesson-grade--11' };
    case '12':
      return { label: 'Lớp 12', className: 'tku-lesson-grade--12' };
    case 'exam':
      return { label: 'Luyện thi THPT', className: 'tku-lesson-grade--exam' };
    default:
      return { label: 'Chuyên đề', className: 'tku-lesson-grade--other' };
  }
}

export const StudentLessonCard: React.FC<StudentLessonCardProps> = memo(
  ({ lesson, viewMode = 'grid' }) => {
    const navigate = useNavigate();
    const gradeInfo = getGradeBadgeInfo(lesson.courseGrade);

    const handleActionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!lesson.isEnrolled) {
        navigate(`/courses/${lesson.courseId}`);
      } else {
        navigate(`/courses/${lesson.courseId}/learn/${lesson.id}`);
      }
    };

    const handleCardClick = () => {
      if (!lesson.isEnrolled) {
        navigate(`/courses/${lesson.courseId}`);
      } else {
        navigate(`/courses/${lesson.courseId}/learn/${lesson.id}`);
      }
    };

    const teacherInitials = lesson.teacher.fullName
      ? lesson.teacher.fullName
          .trim()
          .split(/\s+/)
          .slice(-2)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
      : 'TKU';

    const isEnrolled = lesson.isEnrolled;
    const isCompleted = lesson.isCompleted;
    const inProgress = !isCompleted && lesson.progressPercent > 0;

    // Tránh trùng lặp nếu tiêu đề đã có sẵn tiền tố "Bài 1: ..."
    const hasExistingPrefix =
      lesson.sortOrder > 0 &&
      new RegExp(`^bài\\s*${lesson.sortOrder}\\s*[:.-]?\\s*`, 'i').test(lesson.title.trim());

    const renderActionBtn = () => {
      if (isEnrolled) {
        if (isCompleted) {
          return (
            <button
              type="button"
              className="tku-lesson-btn tku-lesson-btn--review"
              onClick={handleActionClick}
              title="Ôn tập lại bài giảng này"
            >
              <RotateCcw size={14} />
              <span>Ôn lại</span>
            </button>
          );
        }
        if (inProgress) {
          return (
            <button
              type="button"
              className="tku-lesson-btn tku-lesson-btn--continue"
              onClick={handleActionClick}
              title="Tiếp tục học bài giảng"
            >
              <Play size={14} fill="currentColor" />
              <span>Tiếp tục học</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            className="tku-lesson-btn tku-lesson-btn--start"
            onClick={handleActionClick}
            title="Bắt đầu học bài giảng này"
          >
            <span>Vào học</span>
            <ArrowRight size={14} />
          </button>
        );
      }
      return (
        <button
          type="button"
          className="tku-lesson-btn tku-lesson-btn--locked"
          onClick={handleActionClick}
          title="Khám phá khóa học để tham gia bài giảng"
        >
          <span>Xem khóa học</span>
          <ArrowRight size={14} />
        </button>
      );
    };

    // ----------------------------------------------------
    // GIAO DIỆN DẠNG DANH SÁCH (LIST VIEW - NGANG, ĐỒNG BỘ, ĐẸP MẮT)
    // ----------------------------------------------------
    if (viewMode === 'list') {
      return (
        <article
          className={`tku-student-lesson-card tku-student-lesson-card--list ${
            isCompleted ? 'is-completed' : inProgress ? 'is-in-progress' : ''
          }`}
          onClick={handleCardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
          aria-label={`Bài giảng: ${lesson.title}`}
        >
          {/* 1. Icon format bài giảng nổi bật */}
          <div className="tku-lesson-list__icon-wrap">
            <span
              className={`tku-lesson-type-icon ${
                lesson.hasVideo ? 'is-video' : 'is-doc'
              }`}
              title={lesson.hasVideo ? 'Video bài giảng trực quan' : 'Tài liệu lý thuyết chuyên sâu'}
            >
              {lesson.hasVideo ? <Play size={20} fill="currentColor" /> : <FileText size={20} />}
            </span>
          </div>

          {/* 2. Cột thông tin bài giảng chính */}
          <div className="tku-lesson-list__main">
            <div className="tku-lesson-meta-row">
              <span className="tku-lesson-meta-course" title={lesson.courseTitle}>
                <BookOpen size={12} className="tku-meta-inline-icon" />
                <span>{lesson.courseTitle}</span>
              </span>
              <span className="tku-lesson-meta-sep">•</span>
              <span className="tku-lesson-meta-chapter" title={lesson.chapterTitle}>
                Chương {lesson.chapterOrder}: {lesson.chapterTitle}
              </span>
            </div>

            <h3 className="tku-lesson-list__title" title={lesson.title}>
              {lesson.sortOrder > 0 && !hasExistingPrefix && (
                <span className="tku-lesson-order-prefix">Bài {lesson.sortOrder}: </span>
              )}
              {lesson.title}
            </h3>

            <div className="tku-lesson-list__meta-bottom">
              <span className={`tku-lesson-grade-pill ${gradeInfo.className}`}>
                {gradeInfo.label}
              </span>

              <span className="tku-lesson-type-text">
                {lesson.hasVideo ? 'Video bài giảng' : 'Lý thuyết chuyên đề'}
              </span>

              {/* Trạng thái tiến độ học tập */}
              {isEnrolled ? (
                isCompleted ? (
                  <span className="tku-lesson-status-pill is-completed">
                    <CheckCircle2 size={12} />
                    <span>Đã học xong</span>
                  </span>
                ) : inProgress ? (
                  <span className="tku-lesson-status-pill is-in-progress">
                    <Clock size={12} />
                    <span>{lesson.progressPercent}%</span>
                  </span>
                ) : (
                  <span className="tku-lesson-status-pill is-not-started">
                    Chưa học
                  </span>
                )
              ) : (
                <span className="tku-lesson-status-pill is-locked">
                  <Lock size={11} />
                  <span>Chưa ghi danh</span>
                </span>
              )}

              <span className="tku-lesson-meta-sep">•</span>

              {/* Thông tin giảng viên */}
              <div className="tku-lesson-teacher-info">
                {lesson.teacher.avatarUrl ? (
                  <img
                    src={lesson.teacher.avatarUrl}
                    alt={lesson.teacher.fullName}
                    className="tku-lesson-teacher-avatar"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.removeAttribute('style');
                    }}
                  />
                ) : null}
                <div
                  className="tku-lesson-teacher-avatar-fallback"
                  style={{ display: lesson.teacher.avatarUrl ? 'none' : 'flex' }}
                >
                  {teacherInitials}
                </div>
                <span className="tku-lesson-teacher-name" title={lesson.teacher.fullName}>
                  {lesson.teacher.fullName || 'Giảng viên TKU'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Cột bên phải: Thanh tiến độ học tập & Nút hành động CTA */}
          <div className="tku-lesson-list__right">
            {isEnrolled && (
              <div className="tku-lesson-list__progress-wrap">
                <div className="tku-lesson-progress-meta">
                  <span className="tku-lesson-progress-label">Tiến độ bài học</span>
                  <span className="tku-lesson-progress-value">
                    {isCompleted ? '100% Hoàn thành' : `${lesson.progressPercent}%`}
                  </span>
                </div>
                <div className="tku-lesson-progress-bar">
                  <div
                    className={`tku-lesson-progress-fill ${
                      isCompleted ? 'is-complete' : 'is-active'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, lesson.progressPercent))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="tku-lesson-action-wrap">
              {renderActionBtn()}
            </div>
          </div>
        </article>
      );
    }

    // ----------------------------------------------------
    // GIAO DIỆN DẠNG LƯỚI (GRID VIEW)
    // ----------------------------------------------------
    return (
      <article
        className={`tku-student-lesson-card tku-student-lesson-card--grid ${
          isCompleted ? 'is-completed' : inProgress ? 'is-in-progress' : ''
        }`}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Bài giảng: ${lesson.title}`}
      >
        {/* Phần định dạng & Số thứ tự bài học */}
        <div className="tku-student-lesson-card__head">
          <div className="tku-student-lesson-card__type-wrap">
            <span
              className={`tku-lesson-type-icon ${
                lesson.hasVideo ? 'is-video' : 'is-doc'
              }`}
              title={lesson.hasVideo ? 'Video bài giảng trực quan' : 'Tài liệu lý thuyết chuyên sâu'}
            >
              {lesson.hasVideo ? <Play size={16} fill="currentColor" /> : <FileText size={16} />}
            </span>
            <span className="tku-lesson-type-text">
              {lesson.hasVideo ? 'Video bài giảng' : 'Lý thuyết chuyên đề'}
            </span>
          </div>

          <div className="tku-student-lesson-card__badges">
            <span className={`tku-lesson-grade-pill ${gradeInfo.className}`}>
              {gradeInfo.label}
            </span>

            {/* Trạng thái tiến độ học tập */}
            {isEnrolled ? (
              isCompleted ? (
                <span className="tku-lesson-status-pill is-completed">
                  <CheckCircle2 size={13} />
                  <span>Đã học xong</span>
                </span>
              ) : inProgress ? (
                <span className="tku-lesson-status-pill is-in-progress">
                  <Clock size={13} />
                  <span>{lesson.progressPercent}%</span>
                </span>
              ) : (
                <span className="tku-lesson-status-pill is-not-started">
                  Chưa học
                </span>
              )
            ) : (
              <span className="tku-lesson-status-pill is-locked">
                <Lock size={12} />
                <span>Chưa ghi danh</span>
              </span>
            )}
          </div>
        </div>

        {/* Nội dung chính: Tên bài & Khóa học */}
        <div className="tku-student-lesson-card__body">
          <div className="tku-lesson-meta-row">
            <span className="tku-lesson-meta-course" title={lesson.courseTitle}>
              <BookOpen size={13} className="tku-meta-inline-icon" />
              <span>{lesson.courseTitle}</span>
            </span>
            <span className="tku-lesson-meta-sep">•</span>
            <span className="tku-lesson-meta-chapter" title={lesson.chapterTitle}>
              Chương {lesson.chapterOrder}: {lesson.chapterTitle}
            </span>
          </div>

          <h3 className="tku-student-lesson-card__title" title={lesson.title}>
            {lesson.sortOrder > 0 && !hasExistingPrefix && (
              <span className="tku-lesson-order-prefix">Bài {lesson.sortOrder}: </span>
            )}
            {lesson.title}
          </h3>
        </div>

        {/* Thanh tiến độ bài học trực quan (Chỉ hiện khi đã ghi danh) */}
        {isEnrolled && (
          <div className="tku-student-lesson-card__progress-wrap">
            <div className="tku-lesson-progress-bar">
              <div
                className={`tku-lesson-progress-fill ${
                  isCompleted ? 'is-complete' : 'is-active'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, lesson.progressPercent))}%` }}
              />
            </div>
            <div className="tku-lesson-progress-meta">
              <span className="tku-lesson-progress-label">Tiến độ bài học</span>
              <span className="tku-lesson-progress-value">
                {isCompleted ? '100% Hoàn thành' : `${lesson.progressPercent}%`}
              </span>
            </div>
          </div>
        )}

        {/* Chân thẻ: Giảng viên & Nút hành động trực quan */}
        <div className="tku-student-lesson-card__footer">
          <div className="tku-lesson-teacher-info">
            {lesson.teacher.avatarUrl ? (
              <img
                src={lesson.teacher.avatarUrl}
                alt={lesson.teacher.fullName}
                className="tku-lesson-teacher-avatar"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.removeAttribute('style');
                }}
              />
            ) : null}
            <div
              className="tku-lesson-teacher-avatar-fallback"
              style={{ display: lesson.teacher.avatarUrl ? 'none' : 'flex' }}
            >
              {teacherInitials}
            </div>
            <span className="tku-lesson-teacher-name" title={lesson.teacher.fullName}>
              {lesson.teacher.fullName || 'Giảng viên TKU'}
            </span>
          </div>

          {/* Nút hành động CTA */}
          <div className="tku-lesson-action-wrap">
            {renderActionBtn()}
          </div>
        </div>
      </article>
    );
  },
);
