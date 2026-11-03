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
    if (isActuallyAuthenticated) {
      if (user?.role === 'ADMIN') {
        toast.error('Tài khoản Quản trị viên chỉ có quyền truy cập trang Quản trị.');
      } else if (user?.role !== 'TEACHER') {
        toast.error('Bạn không có quyền truy cập vào Không gian Giảng viên.');
      }
    }
  }, [isActuallyAuthenticated, user?.role]);

  if (!isActuallyAuthenticated && !isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role !== 'TEACHER') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default LecturerRoute;
