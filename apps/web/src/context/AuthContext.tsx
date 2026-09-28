import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type {
  LoginCredentials,
  GoogleAuthPayload,
  AuthResponse,
  VerifyDeviceOtpPayload,
  ResendDeviceOtpPayload,
  OtpResponse,
  User,
} from '../types/auth.types';
import { authService } from '../services/auth.service';
import { AuthContext, type AuthContextType } from './authContextDef';
import { SessionTerminatedPage } from '../pages/auth/SessionTerminatedPage';
import deviceDetectedIllustration from '../assets/images/device-detected.png';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() =>
    authService.getStoredUser(),
  );
  const [token, setToken] = useState<string | null>(() =>
    authService.getStoredToken(),
  );
  const [isLoading] = useState<boolean>(false);
  const [isSessionTerminated, setIsSessionTerminated] =
    useState<boolean>(false);
  const [sessionTerminatedReason, setSessionTerminatedReason] =
    useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = deviceDetectedIllustration;
    }
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const result = await authService.login(credentials);
      if (result.accessToken && result.user) {
        setToken(result.accessToken);
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const loginWithGoogle = useCallback(
    async (payload: GoogleAuthPayload): Promise<AuthResponse> => {
      const result = await authService.loginWithGoogle(payload);
      if (result.accessToken && result.user) {
        setToken(result.accessToken);
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const verifyDeviceOtp = useCallback(
    async (payload: VerifyDeviceOtpPayload): Promise<AuthResponse> => {
      const result = await authService.verifyDeviceOtp(payload);
      if (result.accessToken && result.user) {
        setToken(result.accessToken);
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const resendDeviceOtp = useCallback(
    async (payload: ResendDeviceOtpPayload): Promise<OtpResponse> => {
      return authService.resendDeviceOtp(payload);
    },
    [],
  );

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const closeSessionTerminatedModal = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
    setIsSessionTerminated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const handleSessionTerminatedBack = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
    setIsSessionTerminated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    if (!token || isSessionTerminated) return;

    let isMounted = true;
    let isChecking = false;
    let lastCheckTime = 0;

    const performSessionCheck = async (force = false) => {
      if (isChecking) return;

      const now = Date.now();
      if (!force && now - lastCheckTime < 2500) {
        return;
      }

      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      try {
        isChecking = true;
        lastCheckTime = now;
        const res = await authService.checkSession();
        if (!isMounted) return;

        if (res && res.valid === false && res.code === 'SESSION_TERMINATED') {
          setSessionTerminatedReason(
            res.message ||
              'Tài khoản của bạn vừa đăng nhập ở một thiết bị hoặc trình duyệt khác. Vui lòng xác nhận đăng xuất khỏi thiết bị này.',
          );
          setIsSessionTerminated(true);
        }
      } catch (err) {
        void err;
      } finally {
        isChecking = false;
      }
    };

    const intervalId = setInterval(() => {
      void performSessionCheck();
    }, 3500);

    const handleVisibilityOrFocus = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        void performSessionCheck(true);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tku_token') {
        const storedToken = localStorage.getItem('tku_token');
        if (!storedToken) {
          setToken(null);
          setUser(null);
        } else if (storedToken !== token) {
          setToken(storedToken);
          setUser(authService.getStoredUser());
        }
      } else if (e.key === 'tku_device_id') {
        void performSessionCheck(true);
      }
    };

    const handleUserInteraction = () => {
      void performSessionCheck();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, [token, isSessionTerminated]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      loginWithGoogle,
      verifyDeviceOtp,
      resendDeviceOtp,
      logout,
      isSessionTerminated,
      sessionTerminatedReason,
      closeSessionTerminatedModal,
      handleSessionTerminatedBack,
    }),
    [
      user,
      token,
      isLoading,
      login,
      loginWithGoogle,
      verifyDeviceOtp,
      resendDeviceOtp,
      logout,
      isSessionTerminated,
      sessionTerminatedReason,
      closeSessionTerminatedModal,
      handleSessionTerminatedBack,
    ],
  );

  if (isSessionTerminated) {
    return (
      <AuthContext.Provider value={contextValue}>
        <SessionTerminatedPage
          onLogout={closeSessionTerminatedModal}
          onBack={handleSessionTerminatedBack}
        />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
