import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = ['STUDENT'],
}) => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isActuallyAuthenticated = Boolean(token && user);
  const userRole = user?.role;
  const userStatus = user?.status;

  useEffect(() => {
    if (isActuallyAuthenticated && userStatus === 'SUSPENDED') {
      toast.error('Tài khoản của bạn đã bị khóa bởi Quản trị viên.');
      logout();
      return;
    }

    if (isActuallyAuthenticated && userRole && !allowedRoles.includes(userRole)) {
      if (userRole === 'ADMIN') {
        toast.error('Tài khoản Quản trị viên chỉ có quyền truy cập trang Quản trị.');
      } else if (userRole === 'TEACHER') {
        toast.error('Tài khoản Giảng viên không có quyền truy cập vào trang học tập của Sinh viên.');
      } else {
        toast.error('Bạn không có quyền truy cập vào nội dung này.');
      }
    }
  }, [isActuallyAuthenticated, userStatus, userRole, allowedRoles, logout]);

  if (!isActuallyAuthenticated && !isAuthenticated) {
    const fullPath = location.pathname + location.search;
    const redirectParam =
      fullPath && !fullPath.startsWith('/login')
        ? `?redirect=${encodeURIComponent(fullPath)}`
        : '';
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  if (user?.status === 'SUSPENDED') {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (userRole === 'TEACHER') {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
