import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FilePenLine,
  Users,
  MessagesSquare,
  Bell,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { NotificationDropdown } from '../../components/common/NotificationDropdown';
import './lecturerLayout.css';

interface NavItemConfig {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: (pathname: string) => boolean;
}

const TEACHING_NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/lecturer/dashboard',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    isActive: (p) =>
      p === '/lecturer' ||
      p === '/lecturer/dashboard' ||
      p === '/teacher' ||
      p === '/teacher/dashboard',
  },
  {
    to: '/lecturer/courses',
    label: 'Khóa học của tôi',
    icon: BookOpen,
    isActive: (p) =>
      p.startsWith('/lecturer/courses') || p.startsWith('/teacher/courses'),
  },
  {
    to: '/lecturer/assignments',
    label: 'Bài tập & kiểm tra',
    icon: FilePenLine,
    isActive: (p) =>
      p.startsWith('/lecturer/assignments') ||
      p.startsWith('/teacher/assignments'),
  },
  {
    to: '/lecturer/students',
    label: 'Theo dõi học sinh',
    icon: Users,
    isActive: (p) =>
      p.startsWith('/lecturer/students') ||
      p.startsWith('/teacher/students') ||
      p.startsWith('/lecturer/results') ||
      p.startsWith('/teacher/results') ||
      p.startsWith('/lecturer/grading') ||
      p.startsWith('/teacher/grading'),
  },
  {
    to: '/lecturer/discussions',
    label: 'Hỏi đáp & thảo luận',
    icon: MessagesSquare,
    isActive: (p) =>
      p.startsWith('/lecturer/discussions') ||
      p.startsWith('/teacher/discussions'),
  },
];

const PERSONAL_NAV_ITEMS: NavItemConfig[] = [
  {
    to: '/lecturer/notifications',
    label: 'Thông báo',
    icon: Bell,
    isActive: (p) =>
      p.startsWith('/lecturer/notifications') ||
      p.startsWith('/teacher/notifications'),
  },
  {
    to: '/lecturer/settings',
    label: 'Cài đặt tài khoản',
    icon: Settings,
    isActive: (p) =>
      p.startsWith('/lecturer/settings') || p.startsWith('/teacher/settings'),
  },
];

export const LecturerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const handleLogoutClick = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const teacherName = user?.fullName || 'Nguyễn Minh Anh';
  const teacherInitials = useMemo(() => {
    if (!teacherName) return 'GV';
    // Clean out parentheses like (K17 DN)
    const clean = teacherName.replace(/\s*\([^)]*\)/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'GV';
  }, [teacherName]);

  // Determine active breadcrumb label
  const breadcrumbCurrent = useMemo(() => {
    if (location.pathname.includes('/curriculum')) {
      return (
        <>
          <Link
            to="/lecturer/courses"
            className="tku-lecturer-breadcrumbs__parent"
          >
            Khóa học của tôi
          </Link>
          <span className="tku-lecturer-breadcrumbs__sep">/</span>
          <span className="tku-lecturer-breadcrumbs__current">Biên soạn giáo trình</span>
        </>
      );
    }
    if (location.pathname.includes('/assignments/')) {
      const stepMatch = location.pathname.match(
        /\/assignments\/([^/]+)\/(questions|scoring|assign)/
      );

      if (stepMatch) {
        const assignmentId = stepMatch[1];
        const stepKey = stepMatch[2];

        if (stepKey === 'questions') {
          return (
            <>
              <Link
                to="/lecturer/assignments"
                className="tku-lecturer-breadcrumbs__parent"
              >
                Bài tập & kiểm tra
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <span className="tku-lecturer-breadcrumbs__current">
                Tạo câu hỏi
              </span>
            </>
          );
        }

        if (stepKey === 'scoring') {
          return (
            <>
              <Link
                to="/lecturer/assignments"
                className="tku-lecturer-breadcrumbs__parent"
              >
                Bài tập & kiểm tra
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <Link
                to={`/lecturer/assignments/${assignmentId}/questions`}
                className="tku-lecturer-breadcrumbs__parent"
              >
                Tạo câu hỏi
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <span className="tku-lecturer-breadcrumbs__current">
                Thiết lập đáp án & thang điểm
              </span>
            </>
          );
        }

        if (stepKey === 'assign') {
          return (
            <>
              <Link
                to="/lecturer/assignments"
                className="tku-lecturer-breadcrumbs__parent"
              >
                Bài tập & kiểm tra
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <Link
                to={`/lecturer/assignments/${assignmentId}/questions`}
                className="tku-lecturer-breadcrumbs__parent"
              >
                Tạo câu hỏi
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <Link
                to={`/lecturer/assignments/${assignmentId}/scoring`}
                className="tku-lecturer-breadcrumbs__parent"
              >
                Thiết lập đáp án & thang điểm
              </Link>
              <span className="tku-lecturer-breadcrumbs__sep">/</span>
              <span className="tku-lecturer-breadcrumbs__current">
                Giao bài cho học sinh
              </span>
            </>
          );
        }
      }

      const isCreate = location.pathname.includes('/assignments/create');
      const isEdit = location.pathname.includes('/edit');

      let stepLabel = 'Chi tiết bài tập';
      if (isCreate) stepLabel = 'Khởi tạo bài tập & đề thi mới';
      else if (isEdit) stepLabel = 'Chỉnh sửa thông tin bài tập';

      return (
        <>
          <Link
            to="/lecturer/assignments"
            className="tku-lecturer-breadcrumbs__parent"
          >
            Bài tập & kiểm tra
          </Link>
          <span className="tku-lecturer-breadcrumbs__sep">/</span>
          <span className="tku-lecturer-breadcrumbs__current">{stepLabel}</span>
        </>
      );
    }

    if (
      location.pathname.includes('/students') &&
      location.pathname.includes('/progress')
    ) {
      return (
        <>
          <Link
            to="/lecturer/students"
            className="tku-lecturer-breadcrumbs__parent"
          >
            Theo dõi học sinh
          </Link>
          <span className="tku-lecturer-breadcrumbs__sep">/</span>
          <span className="tku-lecturer-breadcrumbs__current">
            Tiến độ học tập
          </span>
        </>
      );
    }

    if (
      location.pathname.startsWith('/lecturer/results') ||
      location.pathname.startsWith('/teacher/results')
    ) {
      return (
        <>
          <Link
            to="/lecturer/students"
            className="tku-lecturer-breadcrumbs__parent"
          >
            Theo dõi học sinh
          </Link>
          <span className="tku-lecturer-breadcrumbs__sep">/</span>
          <span className="tku-lecturer-breadcrumbs__current">
            Kết quả học tập
          </span>
        </>
      );
    }

    const all = [...TEACHING_NAV_ITEMS, ...PERSONAL_NAV_ITEMS];
    const match = all.find((item) => item.isActive(location.pathname));
    if (match) return match.label;
    if (
      location.pathname === '/lecturer' ||
      location.pathname === '/lecturer/dashboard'
    )
      return 'Tổng quan';
    return 'Trang chưa khả dụng';
  }, [location.pathname]);

  return (
    <div className="tku-lecturer-layout">
      {/* Sidebar */}
      <aside className="tku-lecturer-sidebar">
        <Link to="/lecturer/dashboard" className="tku-admin-brand">
          <div className="tku-admin-brand__logo-box">
            <img
              src="/assets/logo.png"
              alt="TKU Lecturer"
              className="tku-admin-brand__logo"
            />
          </div>
          <div className="tku-admin-brand__text">
            <span className="tku-admin-brand__title">TKU Lecturer</span>
            <span className="tku-admin-brand__subtitle">Learning Platform</span>
          </div>
        </Link>

        <nav className="tku-lecturer-nav">
          {/* Section 1: Không gian giảng dạy */}
          <div className="tku-lecturer-nav-group">
            <span className="tku-lecturer-nav-heading">KHÔNG GIAN GIẢNG DẠY</span>
            {TEACHING_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`tku-lecturer-nav-item ${
                    active ? 'tku-lecturer-nav-item--active' : ''
                  }`}
                >
                  <div className="tku-lecturer-nav-item__left">
                    <Icon size={18} className="tku-lecturer-nav-icon" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Section 2: Cá nhân */}
          <div className="tku-lecturer-nav-group">
            <span className="tku-lecturer-nav-heading">CÁ NHÂN</span>
            {PERSONAL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`tku-lecturer-nav-item ${
                    active ? 'tku-lecturer-nav-item--active' : ''
                  }`}
                >
                  <div className="tku-lecturer-nav-item__left">
                    <Icon size={18} className="tku-lecturer-nav-icon" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="tku-lecturer-sidebar-footer">
          <div className="tku-lecturer-user-card">
            <div className="tku-lecturer-user-card__main">
              <div className="tku-lecturer-user-avatar">
                {user?.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                  <img
                    key={user.avatarUrl}
                    src={user.avatarUrl}
                    alt={teacherName}
                    className="tku-lecturer-user-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (user?.avatarUrl) {
                        setFailedAvatarUrl(user.avatarUrl);
                      }
                    }}
                  />
                ) : (
                  teacherInitials
                )}
              </div>
              <div className="tku-lecturer-user-meta">
                <span className="tku-lecturer-user-name" title={teacherName}>
                  {teacherName}
                </span>
                <span className="tku-lecturer-user-role">Giảng viên</span>
              </div>
            </div>
            <button
              type="button"
              className="tku-lecturer-logout-btn"
              onClick={handleLogoutClick}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="tku-lecturer-main">
        {/* Top Header */}
        <header className="tku-lecturer-header">
          <div className="tku-lecturer-breadcrumbs">
            <span className="tku-lecturer-breadcrumbs__parent">
              Không gian giảng dạy
            </span>
            <span className="tku-lecturer-breadcrumbs__sep">/</span>
            {typeof breadcrumbCurrent === 'string' ? (
              <span className="tku-lecturer-breadcrumbs__current">
                {breadcrumbCurrent}
              </span>
            ) : (
              breadcrumbCurrent
            )}
          </div>

          <div className="tku-lecturer-header__right">
            <NotificationDropdown />
          </div>
        </header>

        {/* Content Outlet with Lazy Loading and Spinner Icon */}
        <Suspense
          fallback={
            <div className="tku-lecturer-loading-wrapper" role="status" aria-live="polite">
              <Loader2 size={36} className="tku-lecturer-spin-icon" />
              <span>Đang tải nội dung...</span>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default LecturerLayout;
