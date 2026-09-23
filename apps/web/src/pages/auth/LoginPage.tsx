import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthBanner } from './components/AuthBanner';
import { LoginForm } from './components/LoginForm';
import './auth.css';

export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Đăng nhập | TKU - Nền tảng học tập Hóa học';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-auth-page">
      {/* Background Ambient Glow */}
      <div className="tku-auth-page__ambient" />

      {/* Main Auth Card */}
      <div className="tku-auth-card">
        {/* Close Button back to Home - Native anchor triggers full reload */}
        <a
          href="/"
          className="tku-auth-close-btn"
          title="Quay về trang chủ"
          aria-label="Đóng"
        >
          <X size={20} />
        </a>

        {/* Left Column: Visual Brand Banner */}
        <AuthBanner />

        {/* Right Column: Interactive Login Form */}
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
