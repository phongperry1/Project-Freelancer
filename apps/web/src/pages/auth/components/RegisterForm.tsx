import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../../../services/auth.service';
import { toast } from '../../../context/useToast';
import { useGoogleAuth } from '../../../hooks/useGoogleAuth';
import { GoogleDevModal } from '../../../components/auth/GoogleDevModal';

type RegisterStep = 'form' | 'otp';

export const RegisterForm: React.FC = () => {
  const [step, setStep] = useState<RegisterStep>('form');
  const {
    signInWithGoogle,
    signInWithDemoAccount,
    isGoogleLoading,
    isDevModalOpen,
    setIsDevModalOpen,
  } = useGoogleAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pendingEmail, setPendingEmail] = useState('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isCooldownActive = cooldown > 0;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isCooldownActive) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isCooldownActive]);

  useEffect(() => {
    if (step === 'otp') {
      window.scrollTo(0, 0);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanFullName) {
      toast.error('Vui lòng nhập họ và tên.');
      return;
    }

    if (cleanFullName.length < 2) {
      toast.error('Họ và tên phải có tối thiểu 2 ký tự.');
      return;
    }

    if (!cleanEmail) {
      toast.error('Vui lòng nhập email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    if (!password) {
      toast.error('Vui lòng nhập mật khẩu.');
      return;
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu và xác nhận mật khẩu không trùng khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.sendRegisterOtp({
        fullName: cleanFullName,
        email: cleanEmail,
        password,
      });

      setPendingEmail(cleanEmail);
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(res.resendCooldownSeconds ?? 60);
      setStep('otp');

      toast.success('Mã xác thực OTP đã được gửi đến email của bạn.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Đăng ký không thành công. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, '');
    if (!cleanDigit && value !== '') return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleanDigit.slice(-1);
    setOtpDigits(newDigits);

    if (cleanDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      void executeVerification(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const digits = pastedData.split('');
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = digits[i] || '';
    }
    setOtpDigits(newDigits);

    const focusIdx = Math.min(digits.length, 5);
    otpInputRefs.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      void executeVerification(pastedData);
    }
  };

  const executeVerification = async (code: string) => {
    if (isLoading || code.length !== 6) return;
    setIsLoading(true);

    try {
      await authService.verifyOtp({
        email: pendingEmail,
        otp: code,
      });

      toast.success('Xác thực email thành công! Đang chuyển hướng sang đăng nhập...');

      timerRef.current = setTimeout(() => {
        window.location.href = `/login?registered=1&email=${encodeURIComponent(
          pendingEmail,
        )}`;
      }, 700);
    } catch (err: unknown) {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);

      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length === 6) {
      void executeVerification(otpCode);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) {
      toast.warning(`Vui lòng đợi ${cooldown}s trước khi yêu cầu gửi lại mã.`);
      return;
    }

    if (isResending) return;
    setIsResending(true);

    try {
      const res = await authService.resendOtp(pendingEmail);
      setCooldown(res.resendCooldownSeconds ?? 60);
      setOtpDigits(['', '', '', '', '', '']);
      toast.success('Đã gửi lại mã OTP mới vào email của bạn.');
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  if (step === 'otp') {
    return (
      <div className="tku-auth-form-wrapper tku-auth-form-wrapper--register">
        <button
          type="button"
          onClick={handleBackToForm}
          className="tku-otp-back-btn"
          title="Quay lại thay đổi thông tin"
        >
          <ArrowLeft size={16} />
          <span>Quay lại chỉnh sửa</span>
        </button>

        <div className="tku-otp-header">
          <h2 className="tku-auth-form__title">Xác thực tài khoản</h2>
          <p className="tku-auth-form__subtitle">
            Mã xác thực gồm 6 chữ số đã được gửi đến email{' '}
            <span className="tku-otp-email-highlight">{pendingEmail}</span>. Vui
            lòng nhập mã để hoàn tất đăng ký.
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="tku-auth-form">
          <div className="tku-otp-inputs">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpInputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="one-time-code"
                value={digit}
                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onPaste={handleOtpPaste}
                className={`tku-otp-digit ${digit ? 'is-filled' : ''}`}
                aria-label={`Chữ số OTP thứ ${idx + 1}`}
                required
              />
            ))}
          </div>
          {isLoading && (
            <p className="tku-otp-verifying-text">Đang xác thực mã OTP...</p>
          )}

          <div className="tku-otp-resend-wrapper">
            <span>Chưa nhận được mã?</span>
            {cooldown > 0 ? (
              <span>
                Gửi lại mã sau <strong>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="tku-otp-resend-btn"
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
              </button>
            )}
          </div>
        </form>

        <div className="tku-auth-footer">
          <p className="tku-auth-switch">
            Đã có tài khoản?{' '}
            <a href="/login" className="tku-auth-switch-link">
              Đăng nhập ngay
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tku-auth-form-wrapper tku-auth-form-wrapper--register">
      <div className="tku-auth-form__header">
        <h2 className="tku-auth-form__title">Tạo tài khoản học tập</h2>
        <p className="tku-auth-form__subtitle">
          Trở thành học sinh TKU để khám phá lộ trình Hóa học bài bản.
        </p>
      </div>

      <button
        type="button"
        className="tku-google-btn"
        onClick={signInWithGoogle}
        disabled={isLoading || isGoogleLoading}
      >
        <svg
          className="tku-google-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
        >
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
          {isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng ký với Google'}
        </span>
      </button>

      <div className="tku-auth-divider">
        <span className="tku-auth-divider__line" />
        <span className="tku-auth-divider__text">hoặc đăng ký bằng tài khoản</span>
        <span className="tku-auth-divider__line" />
      </div>

      <form onSubmit={handleRegisterSubmit} className="tku-auth-form">
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
              placeholder="Tạo mật khẩu (tối thiểu 6 ký tự)"
              className="tku-form-input tku-form-input--pwd"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={togglePassword}
              className="tku-pwd-toggle-btn"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

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
              onClick={toggleConfirmPassword}
              className="tku-pwd-toggle-btn"
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="tku-btn tku-btn--primary tku-auth-submit-btn"
        >
          {isLoading ? 'Đang gửi mã xác thực...' : 'Đăng ký'}
        </button>
      </form>

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

      <GoogleDevModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onSelectAccount={signInWithDemoAccount}
        isLoading={isGoogleLoading}
      />
    </div>
  );
};

export default RegisterForm;
