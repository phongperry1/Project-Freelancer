import { createContext } from 'react';
import type {
  User,
  LoginCredentials,
  GoogleAuthPayload,
  AuthResponse,
  VerifyDeviceOtpPayload,
  ResendDeviceOtpPayload,
  OtpResponse,
} from '../types/auth.types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<AuthResponse>;
  verifyDeviceOtp: (payload: VerifyDeviceOtpPayload) => Promise<AuthResponse>;
  resendDeviceOtp: (payload: ResendDeviceOtpPayload) => Promise<OtpResponse>;
  logout: () => void;
  isSessionTerminated: boolean;
  sessionTerminatedReason: string;
  closeSessionTerminatedModal: () => void;
  handleSessionTerminatedBack: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
