import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isActuallyAuthenticated = Boolean(token && user);
  const userRole = user?.role;
  const userStatus = user?.status;
  const allowedRolesKey = useMemo(
    () => (allowedRoles ? allowedRoles.slice().sort().join(',') : ''),
    [allowedRoles],
  );

  useEffect(() => {
    if (isActuallyAuthenticated && userStatus === 'SUSPENDED') {
      toast.error('Tài khoản của bạn đã bị khóa bởi Quản trị viên.');
      logout();
      return;
    }

    if (
      isActuallyAuthenticated &&
      allowedRolesKey &&
      userRole &&
      allowedRoles &&
      !allowedRoles.includes(userRole)
    ) {
      toast.error('Bạn không có quyền truy cập vào nội dung này.');
    }
  }, [isActuallyAuthenticated, userStatus, userRole, allowedRolesKey, allowedRoles, logout]);

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

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
