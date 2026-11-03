import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { AuthBanner } from './components/AuthBanner';
import { LoginForm } from './components/LoginForm';
import './auth.css';

export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Đăng nhập | TKU - Nền tảng học tập hiện đại';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="tku-auth-page">
      <div className="tku-auth-page__ambient" />

      <div className="tku-auth-card">
        <Link
          to="/"
          className="tku-auth-close-btn"
          title="Quay về trang chủ"
          aria-label="Đóng"
        >
          <X size={20} />
        </Link>

        <AuthBanner />
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
