import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { toast } from "../context/useToast";

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

import type { AuthResponse } from "../types/auth.types";

export function useGoogleAuth(
  onDeviceVerificationNeeded?: (res: AuthResponse) => void,
) {
  const { loginWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

  const onDeviceVerificationNeededRef = useRef(onDeviceVerificationNeeded);
  const isMountedRef = useRef(true);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    onDeviceVerificationNeededRef.current = onDeviceVerificationNeeded;
  }, [onDeviceVerificationNeeded]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const handleGoogleSuccess = useCallback(
    async (credential: string, demoEmail?: string) => {
      if (isMountedRef.current) {
        setIsGoogleLoading(true);
      }
      try {
        const res = await loginWithGoogle({
          credential,
          demoEmail,
        });

        if (res.requireDeviceVerification) {
          toast.info(
            res.message ||
              "Phát hiện đăng nhập thiết bị mới. Vui lòng xác thực mã OTP gửi về email.",
          );
          if (onDeviceVerificationNeededRef.current) {
            onDeviceVerificationNeededRef.current(res);
          }
          return;
        }

        toast.success(
          `Đăng nhập Google thành công! Chào mừng ${res.user?.fullName || ""}.`,
        );

        const redirectParam =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("redirect")
            : null;
        let targetUrl =
          redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

        if (!redirectParam && res.user?.role === "ADMIN") {
          targetUrl = "/admin";
        }

        redirectTimerRef.current = setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error("Đăng nhập bằng Google thất bại. Vui lòng thử lại.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsGoogleLoading(false);
        }
      }
    },
    [loginWithGoogle],
  );

  const initClient = useCallback(() => {
    if (!googleClientId || !window.google?.accounts?.oauth2) return;
    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "email profile openid",
        callback: (response: TokenResponse) => {
          if (response.error) {
            if (isMountedRef.current) {
              setIsGoogleLoading(false);
            }
            if (response.error !== "user_closed_popup") {
              toast.error("Đăng nhập Google bị hủy hoặc gặp sự cố.");
            }
            return;
          }
          if (response.access_token) {
            void handleGoogleSuccess(response.access_token);
          } else {
            if (isMountedRef.current) {
              setIsGoogleLoading(false);
            }
          }
        },
        error_callback: () => {
          if (isMountedRef.current) {
            setIsGoogleLoading(false);
          }
          toast.error("Không thể mở cửa sổ đăng nhập Google.");
        },
      });
    } catch (err) {
      void err;
    }
  }, [googleClientId, handleGoogleSuccess]);

  useEffect(() => {
    if (!googleClientId) return;

    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }

    const existing =
      (document.getElementById(
        "google-gsi-client",
      ) as HTMLScriptElement | null) ||
      (document.querySelector(
        'script[src*="accounts.google.com/gsi/client"]',
      ) as HTMLScriptElement | null);

    if (existing) {
      existing.addEventListener("load", initClient);
      return () => {
        existing.removeEventListener("load", initClient);
      };
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
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

  const signInWithGoogle = useCallback(async () => {
    if (!googleClientId) {
      setIsDevModalOpen(true);
      return;
    }

    clearPolling();

    setIsGoogleLoading(true);

    if (!tokenClientRef.current && window.google?.accounts?.oauth2) {
      initClient();
    }

    if (tokenClientRef.current) {
      try {
        tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      } catch {
        if (isMountedRef.current) {
          setIsGoogleLoading(false);
        }
        toast.error("Không thể kích hoạt cửa sổ đăng nhập Google.");
      }
      return;
    }

    let attempts = 0;
    const maxAttempts = 30;
    pollingIntervalRef.current = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.oauth2) {
        clearPolling();
        initClient();
        if (tokenClientRef.current) {
          try {
            tokenClientRef.current.requestAccessToken({
              prompt: "select_account",
            });
          } catch {
            if (isMountedRef.current) {
              setIsGoogleLoading(false);
            }
            toast.error("Không thể kích hoạt cửa sổ đăng nhập Google.");
          }
        } else {
          if (isMountedRef.current) {
            setIsGoogleLoading(false);
          }
        }
      } else if (attempts >= maxAttempts) {
        clearPolling();
        if (isMountedRef.current) {
          setIsGoogleLoading(false);
        }
        toast.error(
          "Không thể kết nối với dịch vụ Google. Vui lòng kiểm tra kết nối mạng hoặc thử lại.",
        );
      }
    }, 100);
  }, [googleClientId, initClient, clearPolling]);

  const signInWithDemoAccount = useCallback(
    (email?: string) => {
      setIsDevModalOpen(false);
      void handleGoogleSuccess("demo-google-credential", email);
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
