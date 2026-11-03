import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActuallyAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (isActuallyAuthenticated && user?.role !== 'ADMIN') {
      toast.error('Bạn không có quyền truy cập vào trang quản trị.');
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

  if (user?.role === 'TEACHER') {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
