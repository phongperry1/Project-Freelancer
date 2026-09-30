import React, { Suspense, useCallback, useMemo } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  BookOpen,
  FileText,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import './adminDashboard.css';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogoutClick = useCallback(() => {
    logout();
    window.location.href = '/login';
  }, [logout]);

  const userFullName = user?.fullName;
  const adminInitials = useMemo(() => {
    if (!userFullName) return 'AD';
    const words = userFullName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return userFullName.slice(0, 2).toUpperCase();
  }, [userFullName]);

  return (
    <div className="tku-admin-layout">
      <aside className="tku-admin-sidebar">
        <Link to="/admin" className="tku-admin-brand">
          <div className="tku-admin-brand__logo-box">
            <img
              src="/assets/logo.png"
              alt="TKU Admin"
              className="tku-admin-brand__logo"
            />
          </div>
          <div className="tku-admin-brand__text">
            <span className="tku-admin-brand__title">TKU Admin</span>
            <span className="tku-admin-brand__subtitle">Learning Platform</span>
          </div>
        </Link>

        <nav className="tku-admin-nav">
          <div className="tku-admin-nav-group">
            <span className="tku-admin-nav-heading">TỔNG QUAN</span>
            <Link
              to="/admin"
              className={`tku-admin-nav-item ${location.pathname === '/admin' ? 'tku-admin-nav-item--active' : ''}`}
            >
              <div className="tku-admin-nav-item__left">
                <LayoutGrid size={18} />
                <span>Dashboard</span>
              </div>
            </Link>
          </div>

          <div className="tku-admin-nav-group">
            <span className="tku-admin-nav-heading">QUẢN TRỊ</span>
            <Link
              to="/admin/users"
              className={`tku-admin-nav-item ${location.pathname === '/admin/users' ? 'tku-admin-nav-item--active' : ''}`}
            >
              <div className="tku-admin-nav-item__left">
                <Users size={18} />
                <span>Người dùng</span>
              </div>
            </Link>

            <Link
              to="/admin/courses"
              className={`tku-admin-nav-item ${location.pathname.startsWith('/admin/courses') ? 'tku-admin-nav-item--active' : ''}`}
            >
              <div className="tku-admin-nav-item__left">
                <BookOpen size={18} />
                <span>Khóa học</span>
              </div>
            </Link>

            <Link
              to="/admin/content"
              className={`tku-admin-nav-item ${location.pathname === '/admin/content' ? 'tku-admin-nav-item--active' : ''}`}
            >
              <div className="tku-admin-nav-item__left">
                <FileText size={18} />
                <span>Nội dung</span>
              </div>
            </Link>

            <Link
              to="/admin/keys"
              className={`tku-admin-nav-item ${location.pathname === '/admin/keys' ? 'tku-admin-nav-item--active' : ''}`}
            >
              <div className="tku-admin-nav-item__left">
                <KeyRound size={18} />
                <span>Key đăng nhập</span>
              </div>
            </Link>
          </div>
        </nav>

        <div className="tku-admin-sidebar-footer">
          <div className="tku-admin-user-card">
            <div className="tku-admin-user-card__main">
              <div className="tku-admin-user-avatar">{adminInitials}</div>
              <div className="tku-admin-user-meta">
                <span className="tku-admin-user-name">
                  {user?.fullName || 'Admin'}
                </span>
                <span className="tku-admin-user-role">Quản trị viên</span>
              </div>
            </div>
            <button
              type="button"
              className="tku-admin-logout-btn"
              onClick={handleLogoutClick}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="tku-admin-main">
        <Suspense
          fallback={
            <div className="tku-admin-loading-wrapper">
              <div className="tku-admin-spinner" />
              <span>Đang tải...</span>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default AdminLayout;
