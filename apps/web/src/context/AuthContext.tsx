import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  LoginCredentials,
  GoogleAuthPayload,
  AuthResponse,
  User,
} from '../types/auth.types';
import { authService } from '../services/auth.service';
import { AuthContext, type AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading] = useState<boolean>(false);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const result = await authService.login(credentials);
      setToken(result.accessToken);
      setUser(result.user);
      return result;
    },
    [],
  );

  const loginWithGoogle = useCallback(
    async (payload: GoogleAuthPayload): Promise<AuthResponse> => {
      const result = await authService.loginWithGoogle(payload);
      setToken(result.accessToken);
      setUser(result.user);
      return result;
    },
    [],
  );

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      loginWithGoogle,
      logout,
    }),
    [user, token, isLoading, login, loginWithGoogle, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
