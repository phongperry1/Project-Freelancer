import React, { useState, useEffect } from 'react';
import { X, Sparkles, UserCheck, ArrowRight, Info, ShieldCheck } from 'lucide-react';

interface GoogleDevModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string) => void;
  isLoading?: boolean;
}

export const GoogleDevModal: React.FC<GoogleDevModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  isLoading = false,
}) => {
  const [customEmail, setCustomEmail] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customEmail.trim().toLowerCase();
    if (!trimmed) return;
    onSelectAccount(trimmed);
  };

  return (
    <div className="tku-gmodal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="tku-gmodal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="tku-gmodal-close"
          onClick={onClose}
          aria-label="Đóng modal"
        >
          <X size={18} />
        </button>

        <div className="tku-gmodal-header">
          <div className="tku-gmodal-icon-badge">
            <svg viewBox="0 0 24 24" width="26" height="26">
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
          </div>
          <h3 className="tku-gmodal-title">Đăng nhập bằng Google</h3>
          <p className="tku-gmodal-desc">
            Kiểm tra chức năng đồng bộ tài khoản đã đăng ký trước đó và hiển thị avatar Google tự động.
          </p>
        </div>

        <div className="tku-gmodal-section">
          <label className="tku-gmodal-label">Lựa chọn tài khoản kiểm thử:</label>
          <div className="tku-gmodal-presets">
            <button
              type="button"
              className="tku-gmodal-preset-btn"
              disabled={isLoading}
              onClick={() => onSelectAccount('admin@tku.edu.vn')}
            >
              <div className="tku-gmodal-preset-avatar" style={{ background: '#eff6ff', color: '#1d68f2' }}>
                <ShieldCheck size={18} color="#1d68f2" />
              </div>
              <div className="tku-gmodal-preset-text">
                <span className="tku-gmodal-preset-title">
                  Tài khoản Quản trị viên (Admin)
                </span>
                <span className="tku-gmodal-preset-email">
                  admin@tku.edu.vn
                </span>
              </div>
              <ArrowRight size={16} className="tku-gmodal-preset-arrow" />
            </button>

            <button
              type="button"
              className="tku-gmodal-preset-btn"
              disabled={isLoading}
              onClick={() => onSelectAccount('student@tku.edu.vn')}
            >
              <div className="tku-gmodal-preset-avatar">
                <UserCheck size={18} color="#2563eb" />
              </div>
              <div className="tku-gmodal-preset-text">
                <span className="tku-gmodal-preset-title">
                  Đồng bộ tài khoản đã có
                </span>
                <span className="tku-gmodal-preset-email">
                  student@tku.edu.vn
                </span>
              </div>
              <ArrowRight size={16} className="tku-gmodal-preset-arrow" />
            </button>

            <button
              type="button"
              className="tku-gmodal-preset-btn"
              disabled={isLoading}
              onClick={() => onSelectAccount('google.student@tku.edu.vn')}
            >
              <div className="tku-gmodal-preset-avatar tku-gmodal-preset-avatar--new">
                <Sparkles size={18} color="#059669" />
              </div>
              <div className="tku-gmodal-preset-text">
                <span className="tku-gmodal-preset-title">
                  Tài khoản Google mới (Tự động đăng ký)
                </span>
                <span className="tku-gmodal-preset-email">
                  google.student@tku.edu.vn
                </span>
              </div>
              <ArrowRight size={16} className="tku-gmodal-preset-arrow" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitCustom} className="tku-gmodal-form">
          <label htmlFor="tku-gmodal-email-input" className="tku-gmodal-label">
            Hoặc nhập email của tài khoản bạn vừa đăng ký:
          </label>
          <div className="tku-gmodal-input-row">
            <input
              id="tku-gmodal-email-input"
              type="email"
              placeholder="VD: email_da_dang_ky@gmail.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="tku-gmodal-input"
              disabled={isLoading}
              required
            />
            <button
              type="submit"
              disabled={isLoading || !customEmail.trim()}
              className="tku-gmodal-submit-btn"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </div>
        </form>

        <div className="tku-gmodal-footer-tip">
          <Info size={14} className="tku-gmodal-tip-icon" />
          <span>
            Để bật cửa sổ Google thực tế, điền <code>VITE_GOOGLE_CLIENT_ID</code> vào <code>apps/web/.env</code> và <code>GOOGLE_CLIENT_ID</code> vào <code>apps/api/.env</code>.
          </span>
        </div>
      </div>
    </div>
  );
};
