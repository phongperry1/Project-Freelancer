import React, { useState } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { MAIN_NAV_ITEMS } from '../../data/navigation.data';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('nav-home');

  return (
    <header className="tku-navbar-wrapper">
      <div className="tku-container tku-navbar">
        {/* Brand Logo */}
        <a href="#home" className="tku-brand">
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

        {/* Desktop Navigation Links */}
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

        {/* Right Action Buttons */}
        <div className="tku-nav-actions">
          <button
            type="button"
            className="tku-btn-icon"
            aria-label="Thông báo"
            title="Thông báo"
          >
            <Bell size={18} />
          </button>
          <a href="#login" className="tku-btn tku-btn--outline">
            Đăng nhập
          </a>
          <a href="#register" className="tku-btn tku-btn--primary">
            Đăng ký
          </a>

          {/* Mobile hamburger toggle */}
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

      {/* Mobile Drawer Menu */}
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
              <a
                href="#login"
                onClick={() => setMobileMenuOpen(false)}
                className="tku-btn tku-btn--outline w-full"
              >
                Đăng nhập
              </a>
              <a
                href="#register"
                onClick={() => setMobileMenuOpen(false)}
                className="tku-btn tku-btn--primary w-full"
              >
                Đăng ký
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
