import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  BookOpen,
  FileText,
  KeyRound,
  ArrowRight,
  TrendingUp,
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

  const maxMonthCount = useMemo(() => {
    if (!stats || stats.userActivityByMonth.length === 0) return 1;
    return Math.max(
      1,
      ...stats.userActivityByMonth.map((m) =>
        Math.max(m.totalCount, m.studentCount),
      ),
    );
  }, [stats]);

  const hasActivityData = useMemo(() => {
    return Boolean(
      stats?.userActivityByMonth.some(
        (m) => m.totalCount > 0 || m.studentCount > 0,
      ),
    );
  }, [stats]);

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
                <div className="tku-admin-card">
                  <div className="tku-admin-card__header">
                    <div className="tku-admin-card__title-group">
                      <h3 className="tku-admin-card__title">Hoạt động người dùng</h3>
                      <span className="tku-admin-card__subtitle">
                        Số người dùng mới theo tháng
                      </span>
                    </div>
                    <select className="tku-admin-select" defaultValue="6months">
                      <option value="6months">6 tháng gần đây</option>
                    </select>
                  </div>

                  {!hasActivityData ? (
                    <div className="tku-admin-empty-state">
                      <div className="tku-admin-empty-state__icon">
                        <TrendingUp size={24} />
                      </div>
                      <span className="tku-admin-empty-state__text">
                        Chưa có dữ liệu hoạt động trong 6 tháng qua
                      </span>
                      <span className="tku-admin-empty-state__sub">
                        Số liệu sẽ xuất hiện khi có học viên đăng ký mới
                      </span>
                    </div>
                  ) : (
                    <div className="tku-admin-bar-chart">
                      {stats.userActivityByMonth.map((item, idx) => {
                        const totalHeightPct = Math.max(
                          8,
                          Math.round((item.totalCount / maxMonthCount) * 100),
                        );
                        const studentHeightPct = Math.max(
                          6,
                          Math.round((item.studentCount / maxMonthCount) * 100),
                        );

                        return (
                          <div key={idx} className="tku-admin-bar-col">
                            <div className="tku-admin-bar-track">
                              <div
                                className="tku-admin-bar tku-admin-bar--secondary"
                                style={{
                                  height: item.totalCount > 0 ? `${totalHeightPct}%` : '0px',
                                  opacity: item.totalCount > 0 ? 1 : 0,
                                }}
                                title={`Tổng: ${item.totalCount}`}
                              />
                              <div
                                className="tku-admin-bar tku-admin-bar--primary"
                                style={{
                                  height: item.studentCount > 0 ? `${studentHeightPct}%` : '0px',
                                  opacity: item.studentCount > 0 ? 1 : 0,
                                }}
                                title={`Học sinh: ${item.studentCount}`}
                              />
                            </div>
                            <span className="tku-admin-bar-label">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      <h3 className="tku-admin-card__title">Khóa học gần đây</h3>
                      <span className="tku-admin-card__subtitle">
                        Theo dõi trạng thái các khóa học mới nhất
                      </span>
                    </div>
                    <a href="#all-courses" className="tku-admin-card__link">
                      <span>Xem tất cả</span>
                      <ArrowRight size={14} />
                    </a>
                  </div>

                  {stats.recentCourses.length === 0 ? (
                    <div className="tku-admin-empty-state">
                      <div className="tku-admin-empty-state__icon">
                        <Inbox size={24} />
                      </div>
                      <span className="tku-admin-empty-state__text">
                        Chưa có khóa học nào trên hệ thống
                      </span>
                      <span className="tku-admin-empty-state__sub">
                        Các khóa học mới khởi tạo sẽ hiển thị tại đây
                      </span>
                    </div>
                  ) : (
                    <div className="tku-admin-table-container">
                      <table className="tku-admin-table">
                        <thead>
                          <tr>
                            <th>KHÓA HỌC</th>
                            <th>GIẢNG VIÊN</th>
                            <th>HỌC SINH</th>
                            <th>TRẠNG THÁI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCourses.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div className="tku-admin-course-cell">
                                  <div className="tku-admin-course-code">
                                    {c.code}
                                  </div>
                                  <div className="tku-admin-course-meta">
                                    <span className="tku-admin-course-title">
                                      {c.title}
                                    </span>
                                    <span className="tku-admin-course-sub">
                                      {c.subTitle}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>{c.teacherName}</td>
                              <td>{c.studentCount}</td>
                              <td>
                                <span
                                  className={`tku-admin-badge ${
                                    c.status === 'ACTIVE'
                                      ? 'tku-admin-badge--active'
                                      : c.status === 'PENDING'
                                        ? 'tku-admin-badge--pending'
                                        : 'tku-admin-badge--draft'
                                  }`}
                                >
                                  {c.statusText}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

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
                            <span className="tku-admin-activity-time">
                              {act.timeAgo}
                            </span>
                          </div>
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
