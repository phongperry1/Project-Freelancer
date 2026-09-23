import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
  ApiErrorResponse,
} from '../types/auth.types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'tku_access_token';
const USER_KEY = 'tku_user';

export const authService = {
  async register(credentials: RegisterCredentials): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let errorMessage = 'Đăng ký không thành công. Vui lòng thử lại.';
        try {
          const errorData: ApiErrorResponse = await response.json();
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message[0];
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Dùng errorMessage mặc định nếu không parse được JSON
        }
        throw new Error(errorMessage);
      }

      const user: User = await response.json();
      return user;
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
        let errorMessage = 'Đăng nhập không thành công. Vui lòng thử lại.';
        try {
          const errorData: ApiErrorResponse = await response.json();
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message[0];
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Dùng errorMessage mặc định nếu không parse được JSON
        }
        throw new Error(errorMessage);
      }

      const data: AuthResponse = await response.json();

      // Lưu trữ phiên đăng nhập vào localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

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
