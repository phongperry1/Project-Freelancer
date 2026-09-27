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
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface GoogleAuthPayload {
  credential: string;
  demoEmail?: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
}

export interface AuthResponse {
  accessToken?: string;
  user?: User;
  requireDeviceVerification?: boolean;
  deviceId?: string;
  deviceName?: string;
  email?: string;
  message?: string;
}

export interface VerifyDeviceOtpPayload {
  email: string;
  deviceId: string;
  otp: string;
  deviceName?: string;
  ipAddress?: string;
}

export interface ResendDeviceOtpPayload {
  email: string;
  deviceId: string;
  deviceName?: string;
  ipAddress?: string;
}

export interface CheckSessionResponse {
  valid: boolean;
  code?: string;
  message?: string;
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

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  message: string;
  email: string;
  resetToken: string;
}

export interface ResetPasswordPayload {
  email: string;
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  email: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
