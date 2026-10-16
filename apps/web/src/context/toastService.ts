import type { ToastItem, ToastOptions, ToastType } from '../types/toast.types';

type ToastListener = (toast: ToastItem) => void;

class ToastEmitter {
  private listeners: Set<ToastListener> = new Set();
  private lastToastKey = '';
  private lastToastTime = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(message: string, type: ToastType, options?: ToastOptions): string {
    const now = Date.now();
    const key = `${type}:${message}`;
    // Deduplicate identical toast messages fired within 600ms (e.g., React StrictMode or rapid double clicks)
    if (key === this.lastToastKey && now - this.lastToastTime < 600) {
      return '';
    }
    this.lastToastKey = key;
    this.lastToastTime = now;

    const id = `${now}-${Math.random().toString(36).substring(2, 9)}`;
    const defaultDuration = type === 'error' ? 4500 : 3800;

    const item: ToastItem = {
      id,
      type,
      title: options?.title,
      message,
      duration: options?.duration ?? defaultDuration,
      createdAt: now,
    };

    this.listeners.forEach((listener) => {
      listener(item);
    });

    return id;
  }
}

export const toastEmitter = new ToastEmitter();

export const toast = {
  success: (message: string, options?: ToastOptions): string =>
    toastEmitter.emit(message, 'success', options),
  error: (message: string, options?: ToastOptions): string =>
    toastEmitter.emit(message, 'error', options),
  info: (message: string, options?: ToastOptions): string =>
    toastEmitter.emit(message, 'info', options),
  warning: (message: string, options?: ToastOptions): string =>
    toastEmitter.emit(message, 'warning', options),
};
