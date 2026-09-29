import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthBanner } from './components/AuthBanner';
import { RegisterForm } from './components/RegisterForm';
import './auth.css';

export const RegisterPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Đăng ký | TKU - Nền tảng học tập hiện đại';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-auth-page">
      <div className="tku-auth-page__ambient" />

      <div className="tku-auth-card tku-auth-card--register">
        <a
          href="/"
          className="tku-auth-close-btn"
          title="Quay về trang chủ"
          aria-label="Đóng"
        >
          <X size={20} />
        </a>

        <AuthBanner />
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;
