import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import { useAuth } from './context/useAuth';

import { AdminRoute } from './components/auth/AdminRoute';
import { SessionTerminatedPage } from './pages/auth/SessionTerminatedPage';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminCreateUserPage = lazy(() => import('./pages/admin/AdminCreateUserPage'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminCreateCoursePage = lazy(() => import('./pages/admin/AdminCreateCoursePage'));
const AdminCourseDetailPage = lazy(() => import('./pages/admin/AdminCourseDetailPage'));
const AdminEditCoursePage = lazy(() => import('./pages/admin/AdminEditCoursePage'));
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));

const HomeRoute: React.FC = () => {
  const { user, token } = useAuth();
  if (token && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <LandingPage />;
};

const PublicAuthRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token } = useAuth();
  if (token && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (token && user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route
                path="/login"
                element={
                  <PublicAuthRoute>
                    <LoginPage />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicAuthRoute>
                    <RegisterPage />
                  </PublicAuthRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/session-terminated" element={<SessionTerminatedPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/create" element={<AdminCreateUserPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="courses" element={<AdminCoursesPage />} />
                <Route path="courses/create" element={<AdminCreateCoursePage />} />
                <Route path="courses/:id" element={<AdminCourseDetailPage />} />
                <Route path="courses/:id/edit" element={<AdminEditCoursePage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;