import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../../services/auth.service';
import { toast } from '../../../context/useToast';

type ForgotStep = 1 | 2 | 3;

export const ForgotPasswordForm: React.FC = () => {
  const [step, setStep] = useState<ForgotStep>(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Submit email to request OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.forgotPassword(cleanEmail);
      setCooldown(res.resendCooldownSeconds ?? 60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep(2);
      toast.success('Mã xác thực OTP đã được gửi đến email của bạn.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể gửi mã xác thực. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP inputs
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
      void executeVerifyResetOtp(fullCode);
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
      void executeVerifyResetOtp(pastedData);
    }
  };

  const executeVerifyResetOtp = async (code: string) => {
    if (isLoading || code.length !== 6) return;
    setIsLoading(true);

    try {
      const res = await authService.verifyResetOtp({
        email: email.trim(),
        otp: code,
      });

      setResetToken(res.resetToken);
      setStep(3);
      toast.success('Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.');
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
    const code = otpDigits.join('');
    if (code.length === 6) {
      void executeVerifyResetOtp(code);
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
      const res = await authService.resendResetOtp(email.trim());
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

  // Step 3: Set new password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!newPassword) {
      toast.error('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({
        email: email.trim(),
        resetToken,
        newPassword,
      });

      toast.success('Đặt lại mật khẩu thành công! Đang chuyển hướng sang đăng nhập...');

      timerRef.current = setTimeout(() => {
        window.location.href = `/login?reset=1&email=${encodeURIComponent(
          email.trim(),
        )}`;
      }, 700);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render Step 1
  if (step === 1) {
    return (
      <div className="tku-auth-form-wrapper">
        <div className="tku-auth-form__header">
          <span className="tku-auth-step-badge">BƯỚC 1 / 3</span>
          <h2 className="tku-auth-form__title">Quên mật khẩu?</h2>
          <p className="tku-auth-form__subtitle">
            Nhập email đã đăng ký với TKU. Chúng tôi sẽ gửi mã OTP để xác minh tài khoản của bạn.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="tku-auth-form">
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
                required
                autoComplete="email"
                className="tku-form-input"
              />
            </div>
          </div>

          <button
            type="submit"
            className="tku-btn tku-btn--primary tku-auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Đang gửi mã...' : 'Gửi mã OTP'}
          </button>
        </form>

        <div className="tku-auth-footer">
          <p className="tku-auth-switch">
            Nhớ lại mật khẩu?{' '}
            <a href="/login" className="tku-auth-switch-link">
              Đăng nhập ngay
            </a>
          </p>
          <p className="tku-auth-note-bottom">
            Mã OTP sẽ được gửi tới email của bạn và chỉ có hiệu lực trong thời gian ngắn.
          </p>
        </div>
      </div>
    );
  }

  // Render Step 2
  if (step === 2) {
    return (
      <div className="tku-auth-form-wrapper">
        <div className="tku-auth-form__header">
          <span className="tku-auth-step-badge">BƯỚC 2 / 3</span>
          <h2 className="tku-auth-form__title">Xác minh mã OTP</h2>
          <p className="tku-auth-form__subtitle">
            Nhập mã gồm 6 chữ số được gửi tới{' '}
            <span className="tku-otp-email-highlight">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="tku-auth-form">
          <div className="tku-form-group">
            <label className="tku-form-label">Mã OTP</label>
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
          </div>
        </form>

        <div className="tku-auth-footer">
          <div className="tku-otp-resend-wrapper">
            <span>Chưa nhận được mã?</span>
            {cooldown > 0 ? (
              <span>
                Gửi lại sau <strong>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="tku-otp-resend-btn"
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại OTP'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="tku-auth-change-email-btn"
          >
            Thay đổi email
          </button>
        </div>
      </div>
    );
  }

  // Render Step 3
  return (
    <div className="tku-auth-form-wrapper">
      <div className="tku-auth-form__header">
        <span className="tku-auth-step-badge">BƯỚC 3 / 3</span>
        <h2 className="tku-auth-form__title">Tạo mật khẩu mới</h2>
        <p className="tku-auth-form__subtitle">
          Đặt mật khẩu mới cho tài khoản TKU của bạn để hoàn tất quá trình khôi phục.
        </p>
      </div>

      <form onSubmit={handleResetPasswordSubmit} className="tku-auth-form">
        <div className="tku-form-group">
          <label htmlFor="newPassword" className="tku-form-label">
            Mật khẩu mới
          </label>
          <div className="tku-input-wrapper">
            <Lock size={18} className="tku-input-icon" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              required
              minLength={6}
              autoComplete="new-password"
              className="tku-form-input tku-form-input--pwd"
            />
            <button
              type="button"
              className="tku-pwd-toggle-btn"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              placeholder="Nhập lại mật khẩu mới"
              required
              minLength={6}
              autoComplete="new-password"
              className="tku-form-input tku-form-input--pwd"
            />
            <button
              type="button"
              className="tku-pwd-toggle-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="tku-btn tku-btn--primary tku-auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </button>
      </form>

      <div className="tku-auth-back-link-wrapper">
        <a href="/login" className="tku-auth-back-link">
          Quay lại đăng nhập
        </a>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
