export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface OtpResponse {
  message: string;
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  message: string;
  email: string;
  fullName: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
