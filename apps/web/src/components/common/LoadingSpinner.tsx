import React, { memo } from 'react';

export const LoadingSpinner: React.FC = memo(function LoadingSpinner() {
  return (
    <div
      className="tku-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang..."
    >
      <div className="tku-loading-backdrop" aria-hidden="true" />
      <div className="tku-spinner-wrapper" aria-hidden="true">
        <div className="tku-spinner" />
      </div>
      <span className="sr-only">Đang tải trang...</span>
    </div>
  );
});

export default LoadingSpinner;
