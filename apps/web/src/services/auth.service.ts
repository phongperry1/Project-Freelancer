import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  OtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  User,
  ApiErrorResponse,
} from '../types/auth.types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'tku_access_token';
const USER_KEY = 'tku_user';

const handleAuthSession = (data: AuthResponse): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
};

const extractErrorMessage = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  try {
    const errorData: ApiErrorResponse = await response.json();
    if (Array.isArray(errorData.message) && errorData.message.length > 0) {
      return errorData.message[0];
    }
    if (typeof errorData.message === 'string' && errorData.message.trim()) {
      return errorData.message;
    }
  } catch {
    return fallbackMessage;
  }
  return fallbackMessage;
};

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

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(
          response,
          'Đăng nhập không thành công. Vui lòng thử lại.',
        );
        throw new Error(message);
      }

      const data: AuthResponse = await response.json();
      handleAuthSession(data);
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Không thể kết nối đến máy chủ API.', { cause: err });
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
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
