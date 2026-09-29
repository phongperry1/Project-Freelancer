import React, { useCallback, useEffect, memo } from 'react';
import deviceDetectedIllustration from '../../assets/images/device-detected.png';
import { authService } from '../../services/auth.service';

export interface SessionTerminatedPageProps {
  onLogout?: () => void;
  onBack?: () => void;
}

export const SessionTerminatedPage: React.FC<SessionTerminatedPageProps> = memo(({
  onLogout,
  onBack,
}) => {
  useEffect(() => {
    document.title = 'Phát hiện thiết bị khác | TKU - Nền tảng học tập hiện đại';
  }, []);

  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [onLogout]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [onBack]);

  return (
    <div
      className="tku-device-detected-page"
      role="alert"
      aria-live="assertive"
      id="session-terminated-screen"
    >
      <div
        className="tku-device-detected-orb tku-device-detected-orb--bottom-left"
        aria-hidden="true"
      />
      <div
        className="tku-device-detected-orb tku-device-detected-orb--top-right"
        aria-hidden="true"
      />

      <main className="tku-device-detected-container">
        <div className="tku-device-detected-illustration-wrap">
          <img
            src={deviceDetectedIllustration}
            alt="Đã phát hiện thiết bị khác"
            className="tku-device-detected-illustration"
            loading="eager"
            decoding="async"
            width={677}
            height={468}
          />
        </div>

        <h1 className="tku-device-detected-title">
          Đã phát hiện thiết bị khác
        </h1>

        <p className="tku-device-detected-desc">
          Tài khoản của bạn hiện đang được truy cập từ một thiết bị khác. Để bảo vệ tài khoản và
          đảm bảo an toàn cho quá trình học tập,{' '}
          <strong>vui lòng đăng nhập bằng một tài khoản khác.</strong>
        </p>

        <div className="tku-device-detected-actions">
          <button
            type="button"
            className="tku-device-detected-btn tku-device-detected-btn--primary"
            onClick={handleLogout}
            id="btn-session-logout"
          >
            Đăng xuất
          </button>
          <button
            type="button"
            className="tku-device-detected-btn tku-device-detected-btn--secondary"
            onClick={handleBack}
            id="btn-session-back"
          >
            Quay lại
          </button>
        </div>
      </main>
    </div>
  );
});

SessionTerminatedPage.displayName = 'SessionTerminatedPage';

export default SessionTerminatedPage;

