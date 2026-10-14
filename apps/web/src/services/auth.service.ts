import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  OtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  VerifyResetOtpPayload,
  VerifyResetOtpResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  GoogleAuthPayload,
  VerifyDeviceOtpPayload,
  ResendDeviceOtpPayload,
  CheckSessionResponse,
  User,
  ApiErrorResponse,
} from '../types/auth.types';
import { getOrCreateDeviceId, getDeviceName } from '../utils/device';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'tku_access_token';
const REFRESH_TOKEN_KEY = 'tku_refresh_token';
const USER_KEY = 'tku_user';

const handleAuthSession = (data: AuthResponse): void => {
  if (typeof window !== 'undefined' && data.accessToken) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
  }
};

const isTechnicalError = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return (
    lower.includes('prisma') ||
    lower.includes('sql') ||
    lower.includes('database') ||
    lower.includes('jwt') ||
    lower.includes('stack') ||
    lower.includes('.env') ||
    lower.includes('exception') ||
    lower.includes('transporter') ||
    lower.includes('internal server')
  );
};

const extractErrorMessage = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  if (response.status >= 500) {
    return 'Hệ thống đang bận hoặc gián đoạn kết nối. Vui lòng thử lại sau.';
  }
  try {
    const errorData: ApiErrorResponse = await response.json();
    if (Array.isArray(errorData.message) && errorData.message.length > 0) {
      const msg = errorData.message[0];
      if (typeof msg === 'string' && msg.trim() && !isTechnicalError(msg)) {
        return msg;
      }
    }
    if (typeof errorData.message === 'string' && errorData.message.trim()) {
      if (!isTechnicalError(errorData.message)) {
        return errorData.message;
      }
    }
  } catch {
    return fallbackMessage;
  }
  return fallbackMessage;
};

let activeRefreshPromise: Promise<AuthResponse | null> | null = null;

export const authService = {
  async sendRegisterOtp(
    credentials: RegisterCredentials,
  ): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.',
        );
        throw new Error(message);
      }

      const data: OtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Mã xác thực không hợp lệ hoặc đã hết hạn.',
        );
        throw new Error(message);
      }

      const data: VerifyOtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async resendOtp(email: string): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Không thể gửi lại mã OTP. Vui lòng thử lại sau.',
        );
        throw new Error(message);
      }

      const data: OtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async forgotPassword(email: string): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Không thể xử lý yêu cầu khôi phục mật khẩu. Vui lòng kiểm tra lại email.',
        );
        throw new Error(message);
      }

      const data: OtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async verifyResetOtp(
    payload: VerifyResetOtpPayload,
  ): Promise<VerifyResetOtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Mã xác thực không chính xác hoặc đã hết hạn.',
        );
        throw new Error(message);
      }

      const data: VerifyResetOtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async resendResetOtp(email: string): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Không thể gửi lại mã OTP. Vui lòng thử lại sau.',
        );
        throw new Error(message);
      }

      const data: OtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async resetPassword(
    payload: ResetPasswordPayload,
  ): Promise<ResetPasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Đặt lại mật khẩu không thành công. Vui lòng thử lại.',
        );
        throw new Error(message);
      }

      const data: ResetPasswordResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const payload: LoginCredentials = {
        ...credentials,
        deviceId: credentials.deviceId || getOrCreateDeviceId(),
        deviceName: credentials.deviceName || getDeviceName(),
      };

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Đăng nhập không thành công. Vui lòng thử lại.',
        );
        throw new Error(message);
      }

      const data: AuthResponse = await response.json();
      if (data.accessToken && data.user) {
        handleAuthSession(data);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },


  async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthResponse> {
    try {
      const fullPayload: GoogleAuthPayload = {
        ...payload,
        deviceId: payload.deviceId || getOrCreateDeviceId(),
        deviceName: payload.deviceName || getDeviceName(),
      };

      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullPayload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Đăng nhập bằng Google không thành công. Vui lòng thử lại.',
        );
        throw new Error(message);
      }

      const data: AuthResponse = await response.json();
      if (data.accessToken && data.user) {
        handleAuthSession(data);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async verifyDeviceOtp(
    payload: VerifyDeviceOtpPayload,
  ): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-device-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Mã xác thực thiết bị không hợp lệ hoặc đã hết hạn.',
        );
        throw new Error(message);
      }

      const data: AuthResponse = await response.json();
      if (data.accessToken && data.user) {
        handleAuthSession(data);
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async resendDeviceOtp(
    payload: ResendDeviceOtpPayload,
  ): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-device-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Không thể gửi lại mã OTP thiết bị. Vui lòng thử lại sau.',
        );
        throw new Error(message);
      }

      const data: OtpResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  async checkSession(): Promise<CheckSessionResponse> {
    const token = this.getStoredToken();
    if (!token) {
      return { valid: false, code: 'UNAUTHORIZED' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-session`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, code: 'SESSION_TERMINATED' };
      }

      const data: CheckSessionResponse = await response.json();
      return data;
    } catch {
      return { valid: true };
    }
  },

  async refreshTokens(): Promise<AuthResponse | null> {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) {
        return null;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          this.logout();
          return null;
        }

        const data: AuthResponse = await response.json();
        if (data.accessToken && data.user) {
          handleAuthSession(data);
        }
        return data;
      } catch {
        return null;
      }
    })().finally(() => {
      activeRefreshPromise = null;
    });

    return activeRefreshPromise;
  },

  logout(): void {
    const token = this.getStoredToken();
    const refreshToken = this.getStoredRefreshToken();
    if (token || refreshToken) {
      try {
        void fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      } catch (err) {
        void err;
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('tku_token');
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('tku_token');
  },

  getStoredRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
};
