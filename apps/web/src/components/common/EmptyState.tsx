import React from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu',
  description = 'Hiện tại chưa có dữ liệu nào được đăng tải trên hệ thống.',
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`tku-empty-state ${className}`}>
      <div className="tku-empty-state__icon-wrapper">
        {icon || <BookOpen size={40} className="tku-empty-state__default-icon" />}
      </div>
      <h3 className="tku-empty-state__title">{title}</h3>
      <p className="tku-empty-state__desc">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="tku-empty-state__btn"
        >
          <RefreshCw size={16} />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
