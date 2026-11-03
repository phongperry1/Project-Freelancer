import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import { useAuth } from './context/useAuth';

import { AdminRoute } from './components/auth/AdminRoute';
import { LecturerRoute } from './components/auth/LecturerRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StudentPublicRoute } from './components/auth/StudentPublicRoute';
import { RouteTransitionLoader } from './components/common/RouteTransitionLoader';
import { getRoleRedirectTarget } from './utils/authRedirect';

import { SessionTerminatedPage } from './pages/auth/SessionTerminatedPage';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const CoursesPage = lazy(() => import('./pages/course/CoursesPage'));
const LessonsPage = lazy(() => import('./pages/course/LessonsPage'));
const RoadmapPage = lazy(() => import('./pages/roadmap/RoadmapPage'));
const QAPage = lazy(() => import('./pages/qa/QAPage'));
const SupportPage = lazy(() => import('./pages/support/SupportPage'));
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
const StudentNotificationsPage = lazy(() => import('./pages/notification/StudentNotificationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const SecurityPage = lazy(() => import('./pages/profile/SecurityPage'));
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));

const HomeRoute: React.FC = () => {
  return (
    <StudentPublicRoute>
      <LandingPage />
    </StudentPublicRoute>
  );
};

const PublicAuthRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (token && user) {
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    const targetUrl = getRoleRedirectTarget(user.role, redirectParam);
    return <Navigate to={targetUrl} replace />;
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
              {/* Trang công khai học sinh (Khách và Học sinh truy cập, chặn Admin và Giảng viên) */}
              <Route path="/" element={<HomeRoute />} />
              <Route
                path="/courses"
                element={
                  <StudentPublicRoute>
                    <CoursesPage />
                  </StudentPublicRoute>
                }
              />
              <Route
                path="/lessons"
                element={
                  <StudentPublicRoute>
                    <LessonsPage />
                  </StudentPublicRoute>
                }
              />
              <Route path="/lectures" element={<Navigate to="/lessons" replace />} />
              <Route
                path="/roadmap"
                element={
                  <StudentPublicRoute>
                    <RoadmapPage />
                  </StudentPublicRoute>
                }
              />
              <Route path="/lo-trinh" element={<Navigate to="/roadmap" replace />} />
              <Route
                path="/qa"
                element={
                  <StudentPublicRoute>
                    <QAPage />
                  </StudentPublicRoute>
                }
              />
              <Route path="/hoi-dap" element={<Navigate to="/qa" replace />} />
              <Route
                path="/support"
                element={
                  <StudentPublicRoute>
                    <SupportPage />
                  </StudentPublicRoute>
                }
              />
              <Route path="/ho-tro" element={<Navigate to="/support" replace />} />
              <Route
                path="/courses/category/:categoryKey"
                element={
                  <StudentPublicRoute>
                    <CategoryCoursesPage />
                  </StudentPublicRoute>
                }
              />
              <Route
                path="/courses/:id"
                element={
                  <StudentPublicRoute>
                    <CourseDetailPage />
                  </StudentPublicRoute>
                }
              />

              {/* Trang học tập được bảo vệ (Bắt buộc đăng nhập với vai trò STUDENT, chặn ADMIN và TEACHER) */}
              <Route
                path="/my-courses"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CategoryCoursesPage defaultCategory="my-courses" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/learn"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CourseLearningRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/learn/:lessonId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CourseLearningRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/lessons/:lessonId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CourseLearningRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/exams/:assessmentId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CourseExamRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/exams/:assessmentId/results/:submissionId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <CourseExamResultPage />
                  </ProtectedRoute>
                }
              />

              {/* Trang xác thực */}
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

              {/* Hồ sơ cá nhân và thông báo (Chỉ dành cho STUDENT) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/security"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <SecurityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentNotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/thong-bao" element={<Navigate to="/notifications" replace />} />
              <Route path="/student/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/session-terminated" element={<SessionTerminatedPage />} />

              {/* Khu vực Quản trị viên (Chỉ dành cho ADMIN) */}
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

              {/* Khu vực Giảng viên (Chỉ dành cho TEACHER) */}
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
