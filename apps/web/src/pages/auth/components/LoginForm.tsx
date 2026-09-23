import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setInfoMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({
        email: email.trim(),
        password,
      });

      setSuccessMessage(
        `Đăng nhập thành công! Chào mừng ${res.user.fullName} quay trở lại.`,
      );

      // Chuyển hướng về trang chủ sau 800ms
      timerRef.current = setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setInfoMessage('Tính năng đăng nhập với Google đang được hoàn thiện.');
  };

  return (
    <div className="tku-auth-form-wrapper">
      {/* Header */}
      <div className="tku-auth-form__header">
        <h2 className="tku-auth-form__title">Chào mừng bạn trở lại</h2>
        <p className="tku-auth-form__subtitle">
          Đăng nhập để tiếp tục hành trình học tập tại TKU.
        </p>
      </div>

      {/* Social Login: Google */}
      <button
        type="button"
        className="tku-google-btn"
        onClick={handleGoogleLogin}
      >
        <svg className="tku-google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Tiếp tục với Google</span>
      </button>

      {/* Divider */}
      <div className="tku-auth-divider">
        <span className="tku-auth-divider__line" />
        <span className="tku-auth-divider__text">hoặc đăng nhập bằng tài khoản</span>
        <span className="tku-auth-divider__line" />
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="tku-auth-error-alert">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="tku-auth-success-alert">{successMessage}</div>
      )}
      {infoMessage && (
        <div className="tku-auth-info-alert">{infoMessage}</div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="tku-auth-form">
        {/* Email Field */}
        <div className="tku-form-group">
          <label htmlFor="email" className="tku-form-label">
            Email
          </label>
          <div className="tku-input-wrapper">
            <Mail size={18} className="tku-input-icon" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@tku.edu.vn"
              className="tku-form-input"
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="tku-form-group">
          <div className="tku-form-label-row">
            <label htmlFor="password" className="tku-form-label">
              Mật khẩu
            </label>
            <a href="#forgot" className="tku-forgot-link">
              Quên mật khẩu?
            </a>
          </div>
          <div className="tku-input-wrapper">
            <Lock size={18} className="tku-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="tku-form-input tku-form-input--pwd"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="tku-pwd-toggle-btn"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="tku-btn tku-btn--primary tku-auth-submit-btn"
        >
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      {/* Footer Links */}
      <div className="tku-auth-footer">
        <p className="tku-auth-switch">
          Chưa có tài khoản?{' '}
          <a href="/register" className="tku-auth-switch-link">
            Đăng ký ngay
          </a>
        </p>

        <p className="tku-auth-legal">
          Bằng việc tiếp tục, bạn đồng ý với{' '}
          <a href="#terms">Điều khoản sử dụng</a> và{' '}
          <a href="#privacy">Chính sách bảo mật</a>.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
