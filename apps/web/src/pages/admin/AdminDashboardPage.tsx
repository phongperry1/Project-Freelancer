import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  BookOpen,
  FileText,
  KeyRound,
  GraduationCap,
  UserCheck,
  Inbox,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { adminService, type DashboardStats } from '../../services/admin.service';
import './adminDashboard.css';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    adminService
      .getDashboardStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải dữ liệu bảng điều khiển.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    adminService
      .getDashboardStats()
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu bảng điều khiển.',
        );
        setIsLoading(false);
      });
  }, []);


  const donutData = useMemo(() => {
    if (!stats || stats.totalUsers <= 0) return null;
    const total = stats.totalUsers;
    const s = stats.userRoleDistribution.students;
    const t = stats.userRoleDistribution.teachers;
    const a = stats.userRoleDistribution.admins;
    const o = stats.userRoleDistribution.others;

    const circumference = 2 * Math.PI * 40;
    const studentDash = (s / total) * circumference;
    const teacherDash = (t / total) * circumference;
    const adminDash = (a / total) * circumference;
    const otherDash = (o / total) * circumference;

    return {
      circumference,
      studentDash,
      teacherDash,
      adminDash,
      otherDash,
      studentOffset: 0,
      teacherOffset: -studentDash,
      adminOffset: -(studentDash + teacherDash),
      otherOffset: -(studentDash + teacherDash + adminDash),
    };
  }, [stats]);

  return (
    <>
      <header className="tku-admin-header">
        <div className="tku-admin-header__titles">
          <h1 className="tku-admin-header__title">Dashboard</h1>
          <p className="tku-admin-header__subtitle">
            Tổng quan hoạt động của nền tảng học tập
          </p>
        </div>
      </header>

      <div className="tku-admin-content">
          {isLoading ? (
            <div className="tku-admin-loading-wrapper">
              <div className="tku-admin-spinner" />
              <span>Đang tải số liệu hệ thống...</span>
            </div>
          ) : error ? (
            <div className="tku-admin-card">
              <div className="tku-admin-empty-state">
                <div className="tku-admin-empty-state__icon">
                  <AlertCircle size={24} color="#ef4444" />
                </div>
                <span className="tku-admin-empty-state__text">{error}</span>
                <button
                  type="button"
                  className="tku-admin-select"
                  onClick={handleRetry}
                  style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCw size={14} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          ) : stats ? (
            <>
              <section className="tku-admin-banner">
                <div className="tku-admin-banner__content">
                  <h2 className="tku-admin-banner__title">
                    Chào mừng trở lại, {user?.fullName || 'Admin'}
                  </h2>
                  <p className="tku-admin-banner__desc">
                    Đây là bảng điều khiển tổng quan giúp bạn theo dõi người dùng, khóa học và nội dung trên hệ thống.
                  </p>
                </div>
              </section>

              <div className="tku-admin-charts-grid">
                <div className="tku-admin-stats-card-group">
                  <div className="tku-admin-stat-card">
                    <div className="tku-admin-stat-card__icon tku-admin-stat-card__icon--blue">
                      <BookOpen size={22} />
                    </div>
                    <div className="tku-admin-stat-card__info">
                      <span className="tku-admin-stat-card__label">Tổng khóa học</span>
                      <span className="tku-admin-stat-card__value">
                        {stats.activeCourses.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="tku-admin-stat-card">
                    <div className="tku-admin-stat-card__icon tku-admin-stat-card__icon--emerald">
                      <FileText size={22} />
                    </div>
                    <div className="tku-admin-stat-card__info">
                      <span className="tku-admin-stat-card__label">Tổng bài học</span>
                      <span className="tku-admin-stat-card__value">
                        {stats.totalLessons.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="tku-admin-stat-card">
                    <div className="tku-admin-stat-card__icon tku-admin-stat-card__icon--amber">
                      <GraduationCap size={22} />
                    </div>
                    <div className="tku-admin-stat-card__info">
                      <span className="tku-admin-stat-card__label">Học sinh</span>
                      <span className="tku-admin-stat-card__value">
                        {stats.userRoleDistribution.students.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="tku-admin-stat-card">
                    <div className="tku-admin-stat-card__icon tku-admin-stat-card__icon--purple">
                      <UserCheck size={22} />
                    </div>
                    <div className="tku-admin-stat-card__info">
                      <span className="tku-admin-stat-card__label">Giảng viên</span>
                      <span className="tku-admin-stat-card__value">
                        {stats.userRoleDistribution.teachers.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tku-admin-card">
                  <div className="tku-admin-card__header">
                    <div className="tku-admin-card__title-group">
                      <h3 className="tku-admin-card__title">Phân bổ người dùng</h3>
                      <span className="tku-admin-card__subtitle">
                        Theo vai trò trên hệ thống
                      </span>
                    </div>
                  </div>

                  {stats.totalUsers === 0 ? (
                    <div className="tku-admin-empty-state">
                      <div className="tku-admin-empty-state__icon">
                        <Users size={24} />
                      </div>
                      <span className="tku-admin-empty-state__text">
                        Chưa có dữ liệu người dùng
                      </span>
                      <span className="tku-admin-empty-state__sub">
                        Hệ thống hiện chưa có tài khoản nào
                      </span>
                    </div>
                  ) : (
                    <div className="tku-admin-donut-wrapper">
                      <div className="tku-admin-donut-container">
                        <svg className="tku-admin-donut-svg" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="14"
                          />
                          {donutData && (
                            <>
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#1d68f2"
                                strokeWidth="14"
                                strokeDasharray={`${donutData.studentDash} ${donutData.circumference - donutData.studentDash}`}
                                strokeDashoffset={donutData.studentOffset}
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#60a5fa"
                                strokeWidth="14"
                                strokeDasharray={`${donutData.teacherDash} ${donutData.circumference - donutData.teacherDash}`}
                                strokeDashoffset={donutData.teacherOffset}
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#93c5fd"
                                strokeWidth="14"
                                strokeDasharray={`${donutData.adminDash} ${donutData.circumference - donutData.adminDash}`}
                                strokeDashoffset={donutData.adminOffset}
                              />
                              {stats.userRoleDistribution.others > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                  stroke="#cbd5e1"
                                  strokeWidth="14"
                                  strokeDasharray={`${donutData.otherDash} ${donutData.circumference - donutData.otherDash}`}
                                  strokeDashoffset={donutData.otherOffset}
                                />
                              )}
                            </>
                          )}
                        </svg>
                        <div className="tku-admin-donut-center">
                          <span className="tku-admin-donut-number">
                            {stats.totalUsers.toLocaleString('vi-VN')}
                          </span>
                          <span className="tku-admin-donut-sub">Tài khoản</span>
                        </div>
                      </div>

                      <div className="tku-admin-donut-legend">
                        <div className="tku-admin-legend-item">
                          <div className="tku-admin-legend-label">
                            <span className="tku-admin-legend-dot" style={{ backgroundColor: '#1d68f2' }} />
                            <span>Học sinh</span>
                          </div>
                          <span className="tku-admin-legend-value">
                            {stats.userRoleDistribution.students.toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="tku-admin-legend-item">
                          <div className="tku-admin-legend-label">
                            <span className="tku-admin-legend-dot" style={{ backgroundColor: '#60a5fa' }} />
                            <span>Giảng viên</span>
                          </div>
                          <span className="tku-admin-legend-value">
                            {stats.userRoleDistribution.teachers.toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="tku-admin-legend-item">
                          <div className="tku-admin-legend-label">
                            <span className="tku-admin-legend-dot" style={{ backgroundColor: '#93c5fd' }} />
                            <span>Admin</span>
                          </div>
                          <span className="tku-admin-legend-value">
                            {stats.userRoleDistribution.admins.toLocaleString('vi-VN')}
                          </span>
                        </div>

                        {stats.userRoleDistribution.others > 0 && (
                          <div className="tku-admin-legend-item">
                            <div className="tku-admin-legend-label">
                              <span className="tku-admin-legend-dot" style={{ backgroundColor: '#cbd5e1' }} />
                              <span>Khác</span>
                            </div>
                            <span className="tku-admin-legend-value">
                              {stats.userRoleDistribution.others.toLocaleString('vi-VN')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="tku-admin-bottom-grid">
                <div className="tku-admin-card">
                  <div className="tku-admin-card__header">
                    <div className="tku-admin-card__title-group">
                      <h3 className="tku-admin-card__title">Hoạt động gần đây</h3>
                      <span className="tku-admin-card__subtitle">
                        Các thao tác mới nhất của hệ thống
                      </span>
                    </div>
                  </div>

                  {stats.recentActivities.length === 0 ? (
                    <div className="tku-admin-empty-state">
                      <div className="tku-admin-empty-state__icon">
                        <Inbox size={24} />
                      </div>
                      <span className="tku-admin-empty-state__text">
                        Chưa có hoạt động gần đây
                      </span>
                      <span className="tku-admin-empty-state__sub">
                        Các thao tác người dùng và hệ thống sẽ xuất hiện tại đây
                      </span>
                    </div>
                  ) : (
                    <div className="tku-admin-activity-list">
                      {stats.recentActivities.map((act) => (
                        <div key={act.id} className="tku-admin-activity-item">
                          <div className="tku-admin-activity-left">
                            <div
                              className={`tku-admin-activity-icon ${
                                act.type === 'COURSE'
                                  ? 'tku-admin-activity-icon--course'
                                  : act.type === 'CONTENT'
                                    ? 'tku-admin-activity-icon--content'
                                    : act.type === 'KEY'
                                      ? 'tku-admin-activity-icon--key'
                                      : ''
                              }`}
                            >
                              {act.type === 'COURSE' ? (
                                <BookOpen size={16} />
                              ) : act.type === 'CONTENT' ? (
                                <FileText size={16} />
                              ) : act.type === 'KEY' ? (
                                <KeyRound size={16} />
                              ) : (
                                <Users size={16} />
                              )}
                            </div>
                            <div className="tku-admin-activity-meta">
                              <span className="tku-admin-activity-title">
                                {act.title}
                              </span>
                              <span className="tku-admin-activity-desc">
                                {act.description}
                              </span>
                            </div>
                          </div>
                          <span className="tku-admin-activity-time">
                            {act.timeAgo}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
    </>
  );
};

export default AdminDashboardPage;
