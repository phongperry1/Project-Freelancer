import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { toast } from '../context/useToast';

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (err: unknown) => void;
          }) => TokenClient;
        };
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function useGoogleAuth() {
  const { loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);

  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
  ).trim();

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleGoogleSuccess = useCallback(
    async (credential: string, demoEmail?: string) => {
      setIsGoogleLoading(true);
      try {
        const res = await loginWithGoogle({
          credential,
          demoEmail,
        });

        toast.success(
          `Đăng nhập Google thành công! Chào mừng ${res.user.fullName}.`,
        );

        const redirectParam =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('redirect')
            : null;
        const targetUrl =
          redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

        redirectTimerRef.current = setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [loginWithGoogle],
  );

  const initClient = useCallback(() => {
    if (!googleClientId || !window.google?.accounts?.oauth2) return;
    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: (response: TokenResponse) => {
          if (response.error) {
            setIsGoogleLoading(false);
            if (response.error !== 'user_closed_popup') {
              toast.error('Đăng nhập Google bị hủy hoặc gặp sự cố.');
            }
            return;
          }
          if (response.access_token) {
            void handleGoogleSuccess(response.access_token);
          } else {
            setIsGoogleLoading(false);
          }
        },
        error_callback: (err: unknown) => {
          setIsGoogleLoading(false);
          console.error('Google OAuth error:', err);
          toast.error('Không thể mở cửa sổ đăng nhập Google.');
        },
      });
    } catch (err) {
      console.warn('Lỗi khởi tạo Google Client:', err);
    }
  }, [googleClientId, handleGoogleSuccess]);

  useEffect(() => {
    if (!googleClientId) return;

    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }

    if (document.getElementById('google-gsi-client')) {
      const existing = document.getElementById('google-gsi-client') as HTMLScriptElement;
      existing.addEventListener('load', initClient);
      return () => {
        existing.removeEventListener('load', initClient);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initClient();
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleClientId, initClient]);

  const signInWithGoogle = useCallback(() => {
    if (!googleClientId) {
      setIsDevModalOpen(true);
      return;
    }

    if (!tokenClientRef.current && window.google?.accounts?.oauth2) {
      initClient();
    }

    if (tokenClientRef.current) {
      setIsGoogleLoading(true);
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        setIsGoogleLoading(false);
        console.error('Error requesting token:', err);
        toast.error('Không thể kích hoạt cửa sổ đăng nhập Google.');
      }
    } else {
      toast.info('Đang kết nối dịch vụ Google, vui lòng thử lại sau 1-2 giây...');
    }
  }, [googleClientId, initClient]);

  const signInWithDemoAccount = useCallback(
    (email?: string) => {
      setIsDevModalOpen(false);
      void handleGoogleSuccess('demo-google-credential', email);
    },
    [handleGoogleSuccess],
  );

  return {
    signInWithGoogle,
    signInWithDemoAccount,
    isGoogleLoading,
    isDevModalOpen,
    setIsDevModalOpen,
    hasConfiguredClientId: Boolean(googleClientId),
  };
}

