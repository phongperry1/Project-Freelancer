import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="tku-loading-screen" aria-label="Đang tải trang...">
      <div className="tku-spinner" />
    </div>
  );
};

export default LoadingSpinner;
