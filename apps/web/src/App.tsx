import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
