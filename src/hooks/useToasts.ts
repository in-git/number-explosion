import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastMessage } from '../types';
import { TOAST_LIFETIME_MS } from '../config';

export interface ToastsApi {
  toasts: ToastMessage[];
  addToast: (title: string, content: string) => void;
  dismissToast: (id: string) => void;
}

/**
 * Toast：同屏始终仅显示一条
 * 连续触发时以最新一条替换当前显示，并重新计时，不做堆叠
 */
export function useToasts(): ToastsApi {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const dismissToast = useCallback((id: string) => {
    setToast((prev) => {
      if (!prev || prev.id !== id) return prev;
      clearTimer();
      return null;
    });
  }, []);

  const addToast = useCallback((title: string, content: string) => {
    const next: ToastMessage = {
      id: `${Date.now()}_${Math.random()}`,
      title,
      content,
      timestamp: Date.now(),
    };

    // 新提示直接顶替旧提示，保证只显示一条
    clearTimer();
    setToast(next);
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_LIFETIME_MS);
  }, []);

  return { toasts: toast ? [toast] : [], addToast, dismissToast };
}
