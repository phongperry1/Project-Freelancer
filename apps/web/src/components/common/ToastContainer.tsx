import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastItem, ToastType } from '../../types/toast.types';
import './toast.css';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={20} />;
    case 'error':
      return <AlertCircle size={20} />;
    case 'warning':
      return <AlertTriangle size={20} />;
    case 'info':
    default:
      return <Info size={20} />;
  }
};

const getDefaultToastTitle = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'Thành công';
    case 'error':
      return 'Có lỗi xảy ra';
    case 'warning':
      return 'Lưu ý';
    case 'info':
    default:
      return 'Thông báo';
  }
};

const ToastCard = memo(function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(toast.duration);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isHoveredRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 260);
  }, [onRemove, toast.id]);

  const startTimer = useCallback(() => {
    if (toast.duration <= 0) return;

    startTimeRef.current = Date.now();
    const duration = remainingTimeRef.current;

    const updateProgress = () => {
      if (isHoveredRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, duration - elapsed);
      const pct = (newRemaining / toast.duration) * 100;
      setProgress(pct);

      if (newRemaining > 0) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);
  }, [handleDismiss, toast.duration]);

  const pauseTimer = useCallback(() => {
    isHoveredRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  }, []);

  const resumeTimer = useCallback(() => {
    isHoveredRef.current = false;
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [startTimer]);

  return (
    <div
      className={`tku-toast tku-toast--${toast.type} ${isLeaving ? 'tku-toast--leaving' : ''}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role="alert"
      aria-live="assertive"
    >
      <div className="tku-toast__icon-wrapper">{getToastIcon(toast.type)}</div>

      <div className="tku-toast__body">
        <h4 className="tku-toast__title">{toast.title || getDefaultToastTitle(toast.type)}</h4>
        <p className="tku-toast__message">{toast.message}</p>
      </div>

      <button
        type="button"
        className="tku-toast__close-btn"
        onClick={handleDismiss}
        title="Đóng thông báo"
        aria-label="Đóng"
      >
        <X size={15} />
      </button>

      {toast.duration > 0 && (
        <div
          className="tku-toast__progress-bar"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      )}
    </div>
  );
});

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="tku-toast-container" aria-label="Danh sách thông báo">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
