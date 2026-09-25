import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, X, LogOut } from 'lucide-react';
import { MAIN_NAV_ITEMS } from '../../data/navigation.data';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('nav-home');

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    toast.info('Bạn đã đăng xuất tài khoản thành công.');
    navigate('/login');
  };

  const DEFAULT_AVATAR = '/assets/default-avatar.jpg';

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (!target.src.endsWith(DEFAULT_AVATAR)) {
      target.src = DEFAULT_AVATAR;
    }
  };

  return (
    <header className="tku-navbar-wrapper">
      <div className="tku-container tku-navbar">
        <a href="/" className="tku-brand">
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
        </a>

        <nav className="tku-nav-menu" aria-label="Điều hướng chính">
          {MAIN_NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={() => setActiveNav(item.id)}
              className={`tku-nav-item ${activeNav === item.id ? 'is-active' : ''}`}
            >
              {item.label}
            </a>
          ))}
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
                    onError={handleAvatarError}
                  />
                </div>
                <span className="tku-user-name">{user.fullName}</span>
              </div>
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
              <a href="/login" className="tku-btn tku-btn--outline">
                Đăng nhập
              </a>
              <a href="/register" className="tku-btn tku-btn--primary">
                Đăng ký
              </a>
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
            {MAIN_NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`tku-mobile-nav-item ${activeNav === item.id ? 'is-active' : ''}`}
              >
                {item.label}
              </a>
            ))}

            <div className="tku-mobile-actions">
              {isAuthenticated && user ? (
                <>
                  <div className="tku-user-chip w-full" style={{ justifyContent: 'flex-start' }}>
                    <div className="tku-user-avatar">
                      <img
                        src={user.avatarUrl || DEFAULT_AVATAR}
                        alt={user.fullName}
                        className="tku-user-avatar-img"
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
                  <a
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tku-btn tku-btn--outline w-full"
                  >
                    Đăng nhập
                  </a>
                  <a
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tku-btn tku-btn--primary w-full"
                  >
                    Đăng ký
                  </a>
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
