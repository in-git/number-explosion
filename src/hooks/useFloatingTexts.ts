import { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingText } from '../types';
import {
  FLOATING_TEXT_INTERVAL_MS,
  FLOATING_TEXT_LIFETIME_MS,
  MAX_FLOATING_TEXTS,
} from '../config';

export type FloatingTextType = FloatingText['type'];

export interface FloatingTextsApi {
  floatingTexts: FloatingText[];
  addFloatingText: (text: string, type: FloatingTextType) => void;
}

export function useFloatingTexts(): FloatingTextsApi {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const lastSpawnAt = useRef(0);
  /** 存活中的销毁定时器：卸载时统一清理，避免定时器泄漏与卸载后的 setState */
  const timersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  const addFloatingText = useCallback((text: string, type: FloatingTextType) => {
    // 节流：疯狂连点/高速自动点击时不会瞬间堆积成千上万条特效
    const now = Date.now();
    if (now - lastSpawnAt.current < FLOATING_TEXT_INTERVAL_MS) return;
    lastSpawnAt.current = now;

    const id = `${Date.now()}_${Math.random()}`;
    const offsetAngle = Math.floor(Math.random() * 360);
    const distance = Math.floor(Math.random() * 45) + 20;

    setFloatingTexts((prev) => [
      ...prev.slice(-(MAX_FLOATING_TEXTS - 1)), // 始终只保留最后 10 条
      { id, text, type, createdAt: Date.now(), offsetAngle, distance },
    ]);

    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, FLOATING_TEXT_LIFETIME_MS);
    timersRef.current.add(timer);
  }, []);

  return { floatingTexts, addFloatingText };
}
