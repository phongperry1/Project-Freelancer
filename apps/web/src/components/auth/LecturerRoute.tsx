import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

interface LecturerRouteProps {
  children: React.ReactNode;
}

export const LecturerRoute: React.FC<LecturerRouteProps> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActuallyAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (isActuallyAuthenticated && user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
      toast.error('Bạn không có quyền truy cập vào Không gian Giảng viên.');
    }
  }, [isActuallyAuthenticated, user?.role]);

  if (!isActuallyAuthenticated && !isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default LecturerRoute;
