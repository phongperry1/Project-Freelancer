import { createContext } from 'react';
import type {
  User,
  LoginCredentials,
  GoogleAuthPayload,
  AuthResponse,
} from '../types/auth.types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<AuthResponse>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
