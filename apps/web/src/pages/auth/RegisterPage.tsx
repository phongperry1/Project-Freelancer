import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthBanner } from './components/AuthBanner';
import { RegisterForm } from './components/RegisterForm';
import './auth.css';

export const RegisterPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Đăng ký | TKU - Nền tảng học tập Hóa học';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-auth-page">
      {/* Background Ambient Glow */}
      <div className="tku-auth-page__ambient" />

      {/* Main Auth Card */}
      <div className="tku-auth-card tku-auth-card--register">
        {/* Close Button back to Home */}
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

        {/* Right Column: Interactive Register Form */}
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;
