import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'blue' | 'light';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'blue',
}) => {
  const variantClass =
    variant === 'light' ? 'tku-badge--light' : 'tku-badge--blue';

  return <span className={`tku-badge ${variantClass} ${className}`}>{children}</span>;
};
