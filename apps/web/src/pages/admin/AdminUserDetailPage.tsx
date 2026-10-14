import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import {
  adminService,
  type AdminUserDetailResponse,
} from '../../services/admin.service';
import './adminUserDetail.css';

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<AdminUserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvatarFailed, setIsAvatarFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    adminService
      .getUserById(id)
      .then((res) => {
        if (isMounted) {
          setUser(res);
          setIsAvatarFailed(false);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin chi tiết người dùng.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleRetry = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    adminService
      .getUserById(id)
      .then((res) => {
        setUser(res);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin chi tiết người dùng.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const userFullName = user?.fullName;
  const userInitials = useMemo(() => {
    if (!userFullName) return 'U';
    const words = userFullName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return userFullName.slice(0, 2).toUpperCase();
  }, [userFullName]);

  return (
    <div className="tku-user-detail-page">
      <header className="tku-user-detail-header">
        <div className="tku-user-detail-breadcrumbs">
          <Link to="/admin">Admin</Link>
          <span className="tku-user-detail-breadcrumbs__sep">/</span>
          <Link to="/admin/users">Quản lý người dùng</Link>
          <span className="tku-user-detail-breadcrumbs__sep">/</span>
          <span className="tku-user-detail-breadcrumbs__current">
            {user ? user.fullName : 'Chi tiết người dùng'}
          </span>
        </div>

        <div className="tku-user-detail-title-box">
          <div className="tku-user-detail-title-main">
            <h1 className="tku-user-detail-title">Hồ sơ người dùng</h1>
            <p className="tku-user-detail-desc">
              Xem chi tiết thông tin hồ sơ và hoạt động học thuật của tài khoản trên hệ thống.
            </p>
          </div>
        </div>
      </header>

      <div className="tku-user-detail-content">
        {isLoading ? (
          <div className="tku-admin-loading-wrapper">
            <div className="tku-admin-spinner" />
            <span>Đang tải thông tin chi tiết người dùng...</span>
          </div>
        ) : error ? (
          <div className="tku-user-detail-card">
            <div className="tku-user-detail-empty-box" style={{ padding: '48px 24px' }}>
              <div
                className="tku-user-detail-empty-icon"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
              >
                <AlertCircle size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                Không thể tải thông tin người dùng
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>{error}</p>
              <button
                type="button"
                className="tku-user-detail-btn tku-user-detail-btn--outline"
                onClick={handleRetry}
              >
                <RotateCw size={14} />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : user ? (
          <div className="tku-user-detail-container">
            {/* 1. Thẻ Hero Profile */}
            <div className="tku-user-detail-card tku-user-detail-hero">
              <div className="tku-user-detail-hero-top">
                <div className="tku-user-detail-academic-badge">
                  {user.role === 'TEACHER' ? (
                    <BookOpen size={14} />
                  ) : user.role === 'ADMIN' ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <GraduationCap size={14} />
                  )}
                  <span>{user.roleText}</span>
                </div>

                <span
                  className={
                    user.status === 'ACTIVE'
                      ? 'tku-status-badge tku-status-badge--active'
                      : 'tku-status-badge tku-status-badge--suspended'
                  }
                >
                  <span className="tku-status-dot" />
                  <span>{user.statusText}</span>
                </span>
              </div>

              <div className="tku-user-detail-profile-header">
                <div className="tku-user-detail-avatar-box">
                  {user.avatarUrl && !isAvatarFailed ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="tku-user-detail-avatar-img"
                      referrerPolicy="no-referrer"
                      onError={() => setIsAvatarFailed(true)}
                    />
                  ) : (
                    <div className="tku-user-detail-avatar-initials">
                      {userInitials}
                    </div>
                  )}
                </div>

                <div className="tku-user-detail-profile-meta">
                  <h2 className="tku-user-detail-user-name">{user.fullName}</h2>
                  <div className="tku-user-detail-user-email">
                    <Mail size={14} />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Thẻ Thông tin định danh & Liên hệ */}
            <div className="tku-user-detail-card">
              <div className="tku-user-detail-section-header">
                <div className="tku-user-detail-section-title-box">
                  <h3 className="tku-user-detail-section-title">
                    Thông tin định danh & liên hệ
                  </h3>
                  <p className="tku-user-detail-section-sub">
                    Dữ liệu hồ sơ cá nhân của người dùng trên nền tảng
                  </p>
                </div>
              </div>

              <div className="tku-user-detail-card-body">
                <div className="tku-user-detail-grid">
                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">Họ và tên đầy đủ</span>
                    <span className="tku-user-detail-field__value">{user.fullName}</span>
                  </div>

                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">Email học thuật / đăng nhập</span>
                    <span className="tku-user-detail-field__value">{user.email}</span>
                  </div>

                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">
                      <Phone size={13} />
                      <span>Số điện thoại</span>
                    </span>
                    <span className="tku-user-detail-field__value">
                      {user.phoneNumber ? (
                        <a href={`tel:${user.phoneNumber}`} className="tku-user-detail-phone-link">
                          {user.phoneNumber}
                        </a>
                      ) : (
                        <span className="tku-user-detail-empty-text-inline">Chưa cập nhật</span>
                      )}
                    </span>
                  </div>

                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">
                      <Calendar size={13} />
                      <span>Ngày sinh</span>
                    </span>
                    <span className="tku-user-detail-field__value">
                      {user.formattedDateOfBirth || (
                        <span className="tku-user-detail-empty-text-inline">Chưa cập nhật</span>
                      )}
                    </span>
                  </div>

                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">Vai trò hệ thống</span>
                    <span className="tku-user-detail-field__value">
                      <span
                        className={
                          user.role === 'TEACHER'
                            ? 'tku-role-badge tku-role-badge--teacher'
                            : user.role === 'ADMIN'
                            ? 'tku-role-badge tku-role-badge--admin'
                            : 'tku-role-badge tku-role-badge--student'
                        }
                      >
                        {user.roleText}
                      </span>
                    </span>
                  </div>

                  <div className="tku-user-detail-field">
                    <span className="tku-user-detail-field__label">Ngày đăng ký tài khoản</span>
                    <span className="tku-user-detail-field__value">
                      {user.formattedCreatedAt} ({user.timeAgo})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Thẻ Khóa học */}
            <div className="tku-user-detail-card">
              <div className="tku-user-detail-section-header">
                <div className="tku-user-detail-section-title-box">
                  <h3 className="tku-user-detail-section-title">
                    {user.role === 'TEACHER'
                      ? `Khóa học phụ trách (${user.taughtCourses?.length || 0})`
                      : `Khóa học đã đăng ký (${user.enrolledCourses?.length || 0})`}
                  </h3>
                  <p className="tku-user-detail-section-sub">
                    {user.role === 'TEACHER'
                      ? 'Danh sách các khóa học do giảng viên này trực tiếp phụ trách'
                      : 'Danh sách các chương trình học mà học sinh đang tham gia'}
                  </p>
                </div>
              </div>

              <div className="tku-user-detail-card-body">
                {user.role === 'TEACHER' ? (
                  user.taughtCourses && user.taughtCourses.length > 0 ? (
                    <div className="tku-user-detail-courses-list">
                      {user.taughtCourses.map((c) => (
                        <div key={c.id} className="tku-user-detail-course-card">
                          <div className="tku-user-detail-course-left">
                            <div className="tku-user-detail-course-thumb">
                              {c.thumbnailUrl ? (
                                <img
                                  src={c.thumbnailUrl}
                                  alt={c.title}
                                  className="tku-user-detail-course-thumb-img"
                                />
                              ) : (
                                <BookOpen size={20} />
                              )}
                            </div>
                            <div className="tku-user-detail-course-meta">
                              <Link
                                to={`/admin/courses/${c.id}`}
                                className="tku-user-detail-course-name"
                              >
                                {c.title}
                              </Link>
                              <div className="tku-user-detail-course-sub">
                                <span>
                                  <strong>{c.studentCount || 0}</strong> học viên
                                </span>
                                <span>•</span>
                                <span>Tạo ngày {c.formattedCreatedAt}</span>
                                <span>•</span>
                                <span
                                  className={
                                    c.status === 'ACTIVE'
                                      ? 'tku-status-badge tku-status-badge--active'
                                      : 'tku-status-badge tku-status-badge--suspended'
                                  }
                                  style={{ padding: '2px 8px', fontSize: '11px' }}
                                >
                                  {c.statusText}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="tku-user-detail-course-action">
                            <Link
                              to={`/admin/courses/${c.id}`}
                              className="tku-user-detail-course-link"
                            >
                              <span>Chi tiết</span>
                              <ExternalLink size={13} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tku-user-detail-empty-box">
                      <div className="tku-user-detail-empty-icon">
                        <BookOpen size={24} />
                      </div>
                      <p className="tku-user-detail-empty-text">
                        Giảng viên này hiện chưa được phân công phụ trách khóa học nào.
                      </p>
                    </div>
                  )
                ) : user.enrolledCourses && user.enrolledCourses.length > 0 ? (
                  <div className="tku-user-detail-courses-list">
                    {user.enrolledCourses.map((c) => (
                      <div key={c.id} className="tku-user-detail-course-card">
                        <div className="tku-user-detail-course-left">
                          <div className="tku-user-detail-course-thumb">
                            {c.thumbnailUrl ? (
                              <img
                                src={c.thumbnailUrl}
                                alt={c.title}
                                className="tku-user-detail-course-thumb-img"
                              />
                            ) : (
                              <GraduationCap size={20} />
                            )}
                          </div>
                          <div className="tku-user-detail-course-meta">
                            <Link
                              to={`/admin/courses/${c.id}`}
                              className="tku-user-detail-course-name"
                            >
                              {c.title}
                            </Link>
                            <div className="tku-user-detail-course-sub">
                              <span>Tiến độ: {c.progress || 0}%</span>
                              <span>•</span>
                              <span>Ghi danh: {c.formattedCreatedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="tku-user-detail-course-action">
                          <Link
                            to={`/admin/courses/${c.id}`}
                            className="tku-user-detail-course-link"
                          >
                            <span>Xem khóa</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tku-user-detail-empty-box">
                    <div className="tku-user-detail-empty-icon">
                      <GraduationCap size={24} />
                    </div>
                    <p className="tku-user-detail-empty-text">
                      Học sinh này chưa đăng ký khóa học nào trên nền tảng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
