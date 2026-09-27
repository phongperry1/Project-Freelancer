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
import { SessionTerminatedModal } from '../components/auth/SessionTerminatedModal';

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
    // Chỉ khi người dùng bấm nút Đăng xuất trên pop-up thì mới thực hiện đăng xuất
    authService.logout();
    setToken(null);
    setUser(null);
    setIsSessionTerminated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // Giám sát phiên đăng nhập duy nhất (Single Active Session)
  useEffect(() => {
    if (!token || isSessionTerminated) return;

    let isMounted = true;

    const performSessionCheck = async () => {
      // Tối ưu: Chỉ gửi request khi tab đang được active/hiển thị
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      try {
        const res = await authService.checkSession();
        if (!isMounted) return;

        if (res && res.valid === false && res.code === 'SESSION_TERMINATED') {
          // Thiết bị khác đã đăng nhập -> Hiển thị pop-up, chưa tự động đăng xuất
          setSessionTerminatedReason(
            res.message ||
              'Tài khoản của bạn vừa đăng nhập ở một thiết bị hoặc trình duyệt khác. Vui lòng xác nhận đăng xuất khỏi thiết bị này.',
          );
          setIsSessionTerminated(true);
        }
      } catch (err) {
        // Bỏ qua lỗi kết nối mạng tạm thời khi kiểm tra phiên nền
        void err;
      }
    };

    // Kiểm tra định kỳ mỗi 8 giây
    const intervalId = setInterval(performSessionCheck, 8000);

    // Kiểm tra ngay lập tức khi người dùng quay lại tab trình duyệt
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSessionCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <SessionTerminatedModal
        isOpen={isSessionTerminated}
        message={sessionTerminatedReason}
        onConfirm={closeSessionTerminatedModal}
      />
    </AuthContext.Provider>
  );
};

export default AuthProvider;
