import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthBanner } from './components/AuthBanner';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import './auth.css';

export const ForgotPasswordPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Quên mật khẩu | TKU - Nền tảng học tập hiện đại';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-auth-page">
      <div className="tku-auth-page__ambient" />

      <div className="tku-auth-card">
        <a
          href="/login"
          className="tku-auth-close-btn"
          title="Quay lại trang đăng nhập"
          aria-label="Đóng"
        >
          <X size={20} />
        </a>

        <AuthBanner />
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
