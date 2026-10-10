import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  AlertCircle,
  RotateCw,
  GraduationCap,
  Calendar,
  Clock,
  User as UserIcon,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import {
  adminService,
  type AdminCourseDetail,
} from '../../services/admin.service';
import './adminCourseDetail.css';

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const AdminCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseData = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    adminService
      .getCourseById(id)
      .then((courseData) => {
        setCourse(courseData);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin chi tiết khóa học.',
        );
        setIsLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    adminService
      .getCourseById(id)
      .then((courseData) => {
        if (isMounted) {
          setCourse(courseData);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin chi tiết khóa học.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <div className="tku-detail-page">
      {/* 1. Header & Breadcrumbs & Action Bar */}
      <header className="tku-detail-header">
        <div className="tku-detail-top-nav">
          <div className="tku-detail-breadcrumbs">
            <Link to="/admin">Dashboard</Link>
            <span className="tku-detail-breadcrumbs__sep">/</span>
            <Link to="/admin/courses">Khóa học</Link>
            <span className="tku-detail-breadcrumbs__sep">/</span>
            <span className="tku-detail-breadcrumbs__current">
              {course ? course.title : 'Chi tiết khóa học'}
            </span>
          </div>
        </div>
      </header>

      <div className="tku-detail-content">
        {isLoading ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải thông tin chi tiết khóa học...</span>
          </div>
        ) : error ? (
          <div className="tku-detail-card">
            <div className="tku-detail-empty-box">
              <div
                className="tku-detail-empty-icon"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 className="tku-detail-empty-title">Không thể tải khóa học</h3>
              <p className="tku-detail-empty-desc">{error}</p>
              <button
                type="button"
                className="tku-detail-btn tku-detail-btn--secondary"
                onClick={fetchCourseData}
                style={{ marginTop: '12px' }}
              >
                <RotateCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : course ? (
          <div className="tku-detail-layout">
            {/* Cột Trái: Giới thiệu khóa học & Thống kê đào tạo */}
            <div className="tku-detail-col-main">
              {/* Card 1: Tổng quan & Giới thiệu khóa học */}
              <div className="tku-detail-card">
                <div className="tku-detail-hero-box">
                  <div className="tku-detail-hero-header-row">
                    <span className="tku-detail-academic-pill">
                      <GraduationCap size={14} />
                      <span>Khóa học học thuật</span>
                    </span>

                    <span
                      className={`tku-detail-status-pill ${
                        course.status === 'ACTIVE'
                          ? 'tku-detail-status-pill--active'
                          : 'tku-detail-status-pill--hidden'
                      }`}
                    >
                      <span className="tku-detail-status-dot" />
                      <span>
                        {course.status === 'ACTIVE' ? 'Đang hiển thị' : 'Đang tạm ẩn'}
                      </span>
                    </span>
                  </div>

                  <h1 className="tku-detail-course-heading">{course.title}</h1>

                  {/* Khu vực mô tả khóa học */}
                  <div className="tku-detail-description-section">
                    <h3 className="tku-detail-desc-title">Mô tả khóa học</h3>
                    {course.description ? (
                      <p className="tku-detail-desc-body">{course.description}</p>
                    ) : (
                      <p className="tku-detail-desc-placeholder">
                        Khóa học này hiện chưa có nội dung mô tả chi tiết.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Thông tin & Thống kê đào tạo */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <div className="tku-detail-section-title-wrap">
                    <h2 className="tku-detail-section-title-main">
                      Thông tin & Thống kê đào tạo
                    </h2>
                    <p className="tku-detail-section-title-sub">
                      Dữ liệu vận hành và học viên của khóa học trên hệ thống
                    </p>
                  </div>
                </div>

                <div className="tku-detail-stats-grid-4">
                  {/* Ô 1: Số học viên */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--blue">
                      <Users size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {(course._count?.enrollments || 0).toLocaleString('vi-VN')}
                      </span>
                      <span className="tku-detail-stat-caption">Học viên tham gia</span>
                    </div>
                  </div>

                  {/* Ô 2: Trạng thái hiển thị */}
                  <div className="tku-detail-stat-card-item">
                    <div
                      className={`tku-detail-stat-icon-wrapper ${
                        course.status === 'ACTIVE'
                          ? 'tku-detail-stat-icon--emerald'
                          : 'tku-detail-stat-icon--slate'
                      }`}
                    >
                      {course.status === 'ACTIVE' ? (
                        <Eye size={20} />
                      ) : (
                        <EyeOff size={20} />
                      )}
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {course.status === 'ACTIVE' ? 'Công khai' : 'Tạm ẩn'}
                      </span>
                      <span className="tku-detail-stat-caption">Trạng thái hệ thống</span>
                    </div>
                  </div>

                  {/* Ô 3: Ngày tạo */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--purple">
                      <Calendar size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {formatDate(course.createdAt)}
                      </span>
                      <span className="tku-detail-stat-caption">Thời gian khởi tạo</span>
                    </div>
                  </div>

                  {/* Ô 4: Cập nhật gần nhất */}
                  <div className="tku-detail-stat-card-item">
                    <div className="tku-detail-stat-icon-wrapper tku-detail-stat-icon--slate">
                      <Clock size={20} />
                    </div>
                    <div className="tku-detail-stat-info-text">
                      <span className="tku-detail-stat-number">
                        {formatDate(course.updatedAt)}
                      </span>
                      <span className="tku-detail-stat-caption">Lần cập nhật cuối</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột Phải: Ảnh bìa & Giảng viên phụ trách */}
            <div className="tku-detail-col-side">
              {/* Thẻ Ảnh bìa đại diện */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <h3 className="tku-detail-section-title-main" style={{ fontSize: '15px' }}>
                    Ảnh bìa đại diện
                  </h3>
                </div>
                <div className="tku-detail-thumb-container">
                  <div className="tku-detail-thumb-box-rounded">
                    {course.thumbnailUrl || course.thumbnail ? (
                      <img
                        src={course.thumbnailUrl || course.thumbnail || ''}
                        alt={course.title}
                        className="tku-detail-thumb-image"
                      />
                    ) : (
                      <div className="tku-detail-thumb-empty-notice">
                        <BookOpen size={32} />
                        <span>Chưa cập nhật ảnh bìa</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Thẻ Giảng viên phụ trách */}
              <div className="tku-detail-card">
                <div className="tku-detail-section-head">
                  <h3 className="tku-detail-section-title-main" style={{ fontSize: '15px' }}>
                    Giảng viên phụ trách
                  </h3>
                </div>
                <div className="tku-detail-teacher-box">
                  <div className="tku-detail-teacher-profile-row">
                    <div className="tku-detail-teacher-avatar-big">
                      {course.teacher?.fullName
                        ? course.teacher.fullName.slice(0, 1).toUpperCase()
                        : 'G'}
                    </div>
                    <div className="tku-detail-teacher-info-column">
                      <span className="tku-detail-teacher-name-bold">
                        {course.teacher?.fullName || 'Chưa phân công giảng viên'}
                      </span>
                      <span className="tku-detail-teacher-role-tag">Giảng viên</span>
                    </div>
                  </div>

                  {course.teacher?.id && (
                    <Link
                      to={`/admin/users/${course.teacher.id}`}
                      className="tku-detail-teacher-link-btn"
                    >
                      <UserIcon size={14} />
                      <span>Xem hồ sơ giảng viên</span>
                      <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminCourseDetailPage;
