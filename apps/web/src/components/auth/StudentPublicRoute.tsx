import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { toast } from '../../context/useToast';

interface StudentPublicRouteProps {
  children: React.ReactNode;
}

export const StudentPublicRoute: React.FC<StudentPublicRouteProps> = ({ children }) => {
  const { user, token } = useAuth();
  const isActuallyAuthenticated = Boolean(token && user);
  const userRole = user?.role;

  useEffect(() => {
    if (isActuallyAuthenticated) {
      if (userRole === 'ADMIN') {
        toast.info('Tài khoản Quản trị viên chỉ có quyền truy cập trang Quản trị.');
      } else if (userRole === 'TEACHER') {
        toast.info('Tài khoản Giảng viên không có quyền truy cập vào trang học tập của Sinh viên.');
      }
    }
  }, [isActuallyAuthenticated, userRole]);

  if (isActuallyAuthenticated && userRole === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (isActuallyAuthenticated && userRole === 'TEACHER') {
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  return <>{children}</>;
};

export default StudentPublicRoute;

