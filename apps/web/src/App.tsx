import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import { useAuth } from './context/useAuth';

import { AdminRoute } from './components/auth/AdminRoute';
import { LecturerRoute } from './components/auth/LecturerRoute';
import { RouteTransitionLoader } from './components/common/RouteTransitionLoader';

import { SessionTerminatedPage } from './pages/auth/SessionTerminatedPage';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const CoursesPage = lazy(() => import('./pages/course/CoursesPage'));
const CategoryCoursesPage = lazy(() => import('./pages/course/CategoryCoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/course/CourseDetailPage'));
const CourseLearningRoomPage = lazy(() => import('./pages/course/CourseLearningRoomPage'));
const CourseExamRoomPage = lazy(() => import('./pages/course/CourseExamRoomPage'));
const CourseExamResultPage = lazy(() => import('./pages/course/CourseExamResultPage'));
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
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage'));
const AdminActivationKeysPage = lazy(() => import('./pages/admin/AdminActivationKeysPage'));
const LecturerLayout = lazy(() => import('./pages/lecturer/LecturerLayout'));
const LecturerDashboardPage = lazy(() => import('./pages/lecturer/LecturerDashboardPage'));
const LecturerCoursesPage = lazy(() => import('./pages/lecturer/LecturerCoursesPage'));
const LecturerCourseCurriculumPage = lazy(() => import('./pages/lecturer/LecturerCourseCurriculumPage'));
const LecturerAssignmentsPage = lazy(() => import('./pages/lecturer/LecturerAssignmentsPage'));
const LecturerCreateAssignmentPage = lazy(() => import('./pages/lecturer/LecturerCreateAssignmentPage'));
const LecturerEditAssignmentPage = lazy(() => import('./pages/lecturer/LecturerEditAssignmentPage'));
const LecturerQuestionAuthoringPage = lazy(() => import('./pages/lecturer/LecturerQuestionAuthoringPage'));
const LecturerScoringPage = lazy(() => import('./pages/lecturer/LecturerScoringPage'));
const LecturerAssignPage = lazy(() => import('./pages/lecturer/LecturerAssignPage'));
const LecturerResultsPage = lazy(() => import('./pages/lecturer/LecturerResultsPage'));
const LecturerStudentsPage = lazy(() => import('./pages/lecturer/LecturerStudentsPage'));
const LecturerStudentProgressPage = lazy(() => import('./pages/lecturer/LecturerStudentProgressPage'));
const LecturerDiscussionsPage = lazy(() => import('./pages/lecturer/LecturerDiscussionsPage'));
const LecturerNotificationsPage = lazy(() => import('./pages/lecturer/LecturerNotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));

const HomeRoute: React.FC = () => {
  const { user, token } = useAuth();
  if (token && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (token && user?.role === 'TEACHER') {
    return <Navigate to="/lecturer/dashboard" replace />;
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
  if (token && user?.role === 'TEACHER') {
    return <Navigate to="/lecturer/dashboard" replace />;
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
          <RouteTransitionLoader />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/category/:categoryKey" element={<CategoryCoursesPage />} />
              <Route path="/my-courses" element={<CategoryCoursesPage defaultCategory="my-courses" />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/courses/:courseId/learn" element={<CourseLearningRoomPage />} />
              <Route path="/courses/:courseId/learn/:lessonId" element={<CourseLearningRoomPage />} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<CourseLearningRoomPage />} />
              <Route path="/courses/:courseId/exams/:assessmentId" element={<CourseExamRoomPage />} />
              <Route path="/courses/:courseId/exams/:assessmentId/results/:submissionId" element={<CourseExamResultPage />} />
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
                <Route path="content" element={<AdminContentPage />} />
                <Route path="activation-keys" element={<AdminActivationKeysPage />} />
              </Route>
              <Route
                path="/lecturer"
                element={
                  <LecturerRoute>
                    <LecturerLayout />
                  </LecturerRoute>
                }
              >
                <Route index element={<Navigate to="/lecturer/dashboard" replace />} />
                <Route path="dashboard" element={<LecturerDashboardPage />} />
                <Route path="courses" element={<LecturerCoursesPage />} />
                <Route path="courses/:id/curriculum" element={<LecturerCourseCurriculumPage />} />
                <Route path="assignments" element={<LecturerAssignmentsPage />} />
                <Route path="assignments/create" element={<LecturerCreateAssignmentPage />} />
                <Route path="assignments/:id/edit" element={<LecturerEditAssignmentPage />} />
                <Route path="assignments/:id/questions" element={<LecturerQuestionAuthoringPage />} />
                <Route path="assignments/:id/scoring" element={<LecturerScoringPage />} />
                <Route path="assignments/:id/assign" element={<LecturerAssignPage />} />
                <Route path="results" element={<LecturerResultsPage />} />
                <Route path="results/:id" element={<LecturerResultsPage />} />
                <Route path="grading" element={<Navigate to="/lecturer/results" replace />} />
                <Route path="students" element={<LecturerStudentsPage />} />
                <Route path="students/progress" element={<LecturerStudentProgressPage />} />
                <Route path="students/:id/progress" element={<LecturerStudentProgressPage />} />
                <Route path="students/:id" element={<LecturerStudentsPage />} />
                <Route path="discussions" element={<LecturerDiscussionsPage />} />
                <Route path="notifications" element={<LecturerNotificationsPage />} />
              </Route>
              <Route
                path="/teacher/*"
                element={<Navigate to="/lecturer/dashboard" replace />}
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;