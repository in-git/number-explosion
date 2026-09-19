import { useCallback, useState } from 'react';
import { ToastMessage } from '../types';
import { TOAST_LIFETIME_MS } from '../config';

export interface ToastsApi {
  toasts: ToastMessage[];
  addToast: (title: string, content: string) => void;
  dismissToast: (id: string) => void;
}

export function useToasts(): ToastsApi {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, content: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, content, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_LIFETIME_MS);
  }, []);

  return { toasts, addToast, dismissToast };
}
