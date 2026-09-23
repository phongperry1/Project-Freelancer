import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../../services/auth.service';

export const RegisterForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu và xác nhận mật khẩu không trùng khớp.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      setSuccessMessage(
        'Đăng ký tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...',
      );

      // Chuyển hướng sang trang đăng nhập sau 1s
      timerRef.current = setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đăng ký không thành công. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setInfoMessage('Tính năng đăng ký với Google đang được hoàn thiện.');
  };

  return (
    <div className="tku-auth-form-wrapper tku-auth-form-wrapper--register">
      {/* Header */}
      <div className="tku-auth-form__header">
        <h2 className="tku-auth-form__title">Tạo tài khoản TKU</h2>
        <p className="tku-auth-form__subtitle">
          Đăng ký để bắt đầu hành trình học tập tại TKU. Bạn sẽ xác thực email sau khi tạo tài khoản.
        </p>
      </div>

      {/* Social Register: Google */}
      <button
        type="button"
        className="tku-google-btn"
        onClick={handleGoogleRegister}
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
        <span>Đăng ký với Google</span>
      </button>

      {/* Divider */}
      <div className="tku-auth-divider">
        <span className="tku-auth-divider__line" />
        <span className="tku-auth-divider__text">hoặc đăng ký bằng tài khoản</span>
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

      {/* Main Register Form */}
      <form onSubmit={handleSubmit} className="tku-auth-form">
        {/* Full Name */}
        <div className="tku-form-group">
          <label htmlFor="fullName" className="tku-form-label">
            Họ và tên
          </label>
          <div className="tku-input-wrapper">
            <User size={18} className="tku-input-icon" />
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="tku-form-input"
              autoComplete="name"
              required
            />
          </div>
        </div>

        {/* Email */}
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
              placeholder="tenban@example.com"
              className="tku-form-input"
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="tku-form-group">
          <label htmlFor="password" className="tku-form-label">
            Mật khẩu
          </label>
          <div className="tku-input-wrapper">
            <Lock size={18} className="tku-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tạo mật khẩu"
              className="tku-form-input tku-form-input--pwd"
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div className="tku-form-group">
          <label htmlFor="confirmPassword" className="tku-form-label">
            Xác nhận mật khẩu
          </label>
          <div className="tku-input-wrapper">
            <Lock size={18} className="tku-input-icon" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="tku-form-input tku-form-input--pwd"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="tku-pwd-toggle-btn"
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="tku-btn tku-btn--primary tku-auth-submit-btn"
        >
          {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      {/* Footer Links */}
      <div className="tku-auth-footer">
        <p className="tku-auth-switch">
          Đã có tài khoản?{' '}
          <a href="/login" className="tku-auth-switch-link">
            Đăng nhập ngay
          </a>
        </p>

        <p className="tku-auth-legal">
          Bằng việc đăng ký, bạn đồng ý với{' '}
          <a href="#terms">Điều khoản sử dụng</a> và{' '}
          <a href="#privacy">Chính sách bảo mật</a>.
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
