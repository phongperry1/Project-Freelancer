import React, { useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut } from 'lucide-react';
import { MAIN_NAV_ITEMS } from '../../data/navigation.data';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavActive = useCallback(
    (itemId: string, href: string) => {
      if (itemId === 'nav-courses') {
        return (
          location.pathname.startsWith('/courses') ||
          location.pathname === '/my-courses'
        );
      }
      if (itemId === 'nav-home') {
        return location.pathname === '/' && !location.hash;
      }
      if (href.startsWith('/#')) {
        return location.pathname === '/' && location.hash === href.replace('/', '');
      }
      return false;
    },
    [location.pathname, location.hash],
  );

  const handleNavClick = useCallback(
    (href: string) => {
      setMobileMenuOpen(false);
      if (href.startsWith('/#')) {
        const hash = href.replace('/', '');
        if (location.pathname === '/') {
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          navigate(href);
        }
      }
    },
    [location.pathname, navigate],
  );

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    toast.info('Bạn đã đăng xuất tài khoản thành công.');
    navigate('/login');
  };

  const DEFAULT_AVATAR = '/assets/default-avatar.jpg';

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.onerror = null;
    if (!target.src.endsWith(DEFAULT_AVATAR)) {
      target.src = DEFAULT_AVATAR;
    }
  };

  return (
    <header className="tku-navbar-wrapper">
      <div className="tku-container tku-navbar">
        <Link to="/" className="tku-brand">
          <img
            src="/assets/logo.png"
            alt="TKU Chemistry Center"
            className="tku-brand__logo"
            width={44}
            height={44}
          />
          <div className="tku-brand__text">
            <span className="tku-brand__title">TKU</span>
            <span className="tku-brand__subtitle">TƯ DUY • KIẾN THỨC • ƯỚC MƠ</span>
          </div>
        </Link>

        <nav className="tku-nav-menu" aria-label="Điều hướng chính">
          {MAIN_NAV_ITEMS.map((item) => {
            const active = isNavActive(item.id, item.href);
            if (item.href.startsWith('/#')) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault();
                      handleNavClick(item.href);
                    }
                  }}
                  className={`tku-nav-item ${active ? 'is-active' : ''}`}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.href}
                className={`tku-nav-item ${active ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="tku-nav-actions">
          <button
            type="button"
            className="tku-btn-icon"
            aria-label="Thông báo"
            title="Thông báo"
            onClick={() => toast.info('Hiện chưa có thông báo mới.')}
          >
            <Bell size={18} />
          </button>

          {isAuthenticated && user ? (
            <div className="tku-user-profile">
              <div className="tku-user-chip" title={user.email}>
                <div className="tku-user-avatar">
                  <img
                    src={user.avatarUrl || DEFAULT_AVATAR}
                    alt={user.fullName}
                    className="tku-user-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={handleAvatarError}
                  />
                </div>
                <span className="tku-user-name">{user.fullName}</span>
              </div>
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="tku-btn tku-btn--outline"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Trang quản trị
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="tku-logout-btn"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="tku-btn tku-btn--outline">
                Đăng nhập
              </Link>
              <Link to="/register" className="tku-btn tku-btn--primary">
                Đăng ký
              </Link>
            </>
          )}

          <button
            type="button"
            className="tku-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu điều hướng"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="tku-mobile-drawer">
          <nav className="tku-mobile-nav">
            {MAIN_NAV_ITEMS.map((item) => {
              const active = isNavActive(item.id, item.href);
              if (item.href.startsWith('/#')) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      if (location.pathname === '/') {
                        e.preventDefault();
                        handleNavClick(item.href);
                      } else {
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`tku-mobile-nav-item ${active ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`tku-mobile-nav-item ${active ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="tku-mobile-actions">
              {isAuthenticated && user ? (
                <>
                  <div className="tku-user-chip w-full" style={{ justifyContent: 'flex-start' }}>
                    <div className="tku-user-avatar">
                      <img
                        src={user.avatarUrl || DEFAULT_AVATAR}
                        alt={user.fullName}
                        className="tku-user-avatar-img"
                        referrerPolicy="no-referrer"
                        onError={handleAvatarError}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="tku-user-name" style={{ maxWidth: '100%' }}>
                        {user.fullName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {user.email}
                      </span>
                    </div>
                  </div>
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="tku-btn tku-btn--outline w-full"
                      style={{ justifyContent: 'center', marginBottom: '8px' }}
                    >
                      Trang quản trị
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="tku-logout-btn w-full"
                    style={{ justifyContent: 'center', padding: '10px' }}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tku-btn tku-btn--outline w-full"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tku-btn tku-btn--primary w-full"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
