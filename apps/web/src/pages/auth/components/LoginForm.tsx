import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { toast } from '../../../context/useToast';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { GoogleDevModal } from '../../../components/auth/GoogleDevModal';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const {
    signInWithGoogle,
    signInWithDemoAccount,
    isGoogleLoading,
    isDevModalOpen,
    setIsDevModalOpen,
  } = useGoogleAuth();

  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') ?? '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === '1') {
        toast.success(
          'Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.',
        );
        params.delete('registered');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${newQuery}`,
        );
      } else if (params.get('reset') === '1') {
        toast.success(
          'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
        );
        params.delete('reset');
        const newQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${newQuery}`,
        );
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({
        email: email.trim(),
        password,
      });

      toast.success(
        `Đăng nhập thành công! Chào mừng ${res.user.fullName} quay trở lại.`,
      );

      const redirectParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null;
      const targetUrl =
        redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

      timerRef.current = setTimeout(() => {
        window.location.href = targetUrl;
      }, 600);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(
          'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="tku-auth-form-wrapper">
      <div className="tku-auth-form__header">
        <h2 className="tku-auth-form__title">Chào mừng bạn trở lại</h2>
        <p className="tku-auth-form__subtitle">
          Đăng nhập để tiếp tục hành trình học tập tại TKU.
        </p>
      </div>

      <button
        type="button"
        className="tku-google-btn"
        onClick={signInWithGoogle}
        disabled={isLoading || isGoogleLoading}
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
        <span>
          {isGoogleLoading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}
        </span>
      </button>

      <div className="tku-auth-divider">
        <span className="tku-auth-divider__line" />
        <span className="tku-auth-divider__text">hoặc đăng nhập bằng tài khoản</span>
        <span className="tku-auth-divider__line" />
      </div>

      <form onSubmit={handleSubmit} className="tku-auth-form">
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
              required
              autoComplete="email"
              className="tku-form-input"
            />
          </div>
        </div>

        <div className="tku-form-group">
          <div className="tku-form-label-row">
            <label htmlFor="password" className="tku-form-label">
              Mật khẩu
            </label>
            <a
              href="/forgot-password"
              className="tku-forgot-link"
            >
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
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="tku-form-input tku-form-input--pwd"
            />
            <button
              type="button"
              className="tku-pwd-toggle-btn"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="tku-btn tku-btn--primary tku-auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="tku-auth-footer">
        <p className="tku-auth-switch">
          Chưa có tài khoản?{' '}
          <a href="/register" className="tku-auth-switch-link">
            Đăng ký ngay
          </a>
        </p>
        <p className="tku-auth-legal">
          Bằng việc đăng nhập, bạn đồng ý với{' '}
          <a href="#terms">Điều khoản sử dụng</a> và{' '}
          <a href="#privacy">Chính sách bảo mật</a> của TKU.
        </p>
      </div>

      <GoogleDevModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onSelectAccount={signInWithDemoAccount}
        isLoading={isGoogleLoading}
      />
    </div>
  );
};

export default LoginForm;
