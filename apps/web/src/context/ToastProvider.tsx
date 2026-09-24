import React, { useState, useEffect, useCallback } from 'react';
import type { ToastItem } from '../types/toast.types';
import { toastEmitter } from './toastService';
import { ToastContainer } from '../components/common/ToastContainer';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = toastEmitter.subscribe((item) => {
      setToasts((prev) => [...prev.slice(-4), item]);
    });
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default ToastProvider;
