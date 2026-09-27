import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';

interface SessionTerminatedModalProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
}

export const SessionTerminatedModal: React.FC<SessionTerminatedModalProps> = ({
  isOpen,
  message,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="tku-modal-overlay" role="dialog" aria-modal="true">
      <div className="tku-modal-card">
        {/* Danger Icon Badge */}
        <div className="tku-modal-icon-badge tku-modal-icon-badge--danger">
          <ShieldAlert size={36} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3 className="tku-modal-title">
          Phát hiện đăng nhập nơi khác
        </h3>

        {/* Description */}
        <p className="tku-modal-desc">
          {message ||
            'Tài khoản của bạn vừa đăng nhập ở một thiết bị hoặc trình duyệt khác. Để bảo mật tài khoản và tiến độ học tập, vui lòng xác nhận đăng xuất khỏi thiết bị này.'}
        </p>

        {/* Security Warning Box */}
        <div className="tku-modal-warning-box">
          <span style={{ fontSize: '16px', userSelect: 'none' }}>🔒</span>
          <span>
            Nếu bạn không phải là người vừa thực hiện đăng nhập, vui lòng đổi mật khẩu ngay lập tức để bảo vệ tài khoản.
          </span>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={onConfirm}
          className="tku-modal-submit-btn"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};
