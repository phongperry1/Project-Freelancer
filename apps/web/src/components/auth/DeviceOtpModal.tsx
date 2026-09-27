import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Mail, ArrowRight, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { toast } from '../../context/useToast';
import { authService } from '../../services/auth.service';
import type { AuthResponse } from '../../types/auth.types';

interface DeviceOtpModalProps {
  isOpen: boolean;
  email: string;
  deviceId: string;
  deviceName: string;
  onSuccess: (res: AuthResponse) => void;
  onClose: () => void;
}

export const DeviceOtpModal: React.FC<DeviceOtpModalProps> = ({
  isOpen,
  email,
  deviceId,
  deviceName,
  onSuccess,
  onClose,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setOtp(['', '', '', '', '', '']);
    setCooldown(60);
    onClose();
  };

  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

  if (!isOpen) return null;

  const executeVerification = async (code: string) => {
    if (isSubmitting || code.length !== 6) return;

    setIsSubmitting(true);
    try {
      const result = await authService.verifyDeviceOtp({
        email,
        deviceId,
        otp: code,
        deviceName,
      });

      toast.success(result.message || 'Xác thực thiết bị mới thành công!');
      onSuccess(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Mã xác thực không hợp lệ hoặc đã hết hạn.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text/plain')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!pastedData) return;

    const digits = pastedData.split('');
    const nextOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = digits[i] || '';
    }
    setOtp(nextOtp);

    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pastedData.length === 6) {
      void executeVerification(pastedData);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '');
    if (!sanitized) {
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split('');
      const nextOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        nextOtp[i] = digits[i] || '';
      }
      setOtp(nextOtp);
      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();

      if (digits.length === 6) {
        void executeVerification(digits.join(''));
      }
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = sanitized;
    setOtp(nextOtp);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }
    void executeVerification(fullOtp);
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await authService.resendDeviceOtp({
        email,
        deviceId,
        deviceName,
      });
      toast.success(res.message || 'Đã gửi lại mã OTP mới về email của bạn.');
      setCooldown(res.resendCooldownSeconds || 60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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

  return (
    <div className="tku-modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="tku-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="tku-modal-close-btn"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Icon Badge */}
        <div className="tku-modal-icon-badge">
          <Smartphone size={32} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3 className="tku-modal-title">
          Xác thực thiết bị mới
        </h3>

        {/* Description */}
        <p className="tku-modal-desc">
          Phát hiện đăng nhập trên thiết bị chưa được tin cậy. Để bảo mật tài khoản, mã OTP gồm 6 chữ số đã được gửi tới:
        </p>

        {/* Target Email Badge */}
        <div>
          <div className="tku-modal-email-pill">
            <Mail size={14} />
            <span>{email}</span>
          </div>
        </div>

        {/* Device Info */}
        <div className="tku-modal-device-info">
          <span className="tku-modal-device-label">Thiết bị:</span>
          <span className="tku-modal-device-val" title={deviceName}>
            {deviceName}
          </span>
        </div>

        {/* OTP Input 6 digits */}
        <form onSubmit={handleSubmit}>
          <div className="tku-otp-inputs-row">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="tku-otp-box"
              />
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || otp.join('').length !== 6}
            className="tku-modal-submit-btn"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="tku-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Xác thực & Đăng nhập</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="tku-modal-resend-row">
          Chưa nhận được mã?{' '}
          {cooldown > 0 ? (
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Gửi lại sau ({cooldown}s)</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="tku-modal-resend-btn"
            >
              {isResending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
