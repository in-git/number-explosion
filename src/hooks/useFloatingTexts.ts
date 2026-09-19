import { useCallback, useRef, useState } from 'react';
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

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, FLOATING_TEXT_LIFETIME_MS);
  }, []);

  return { floatingTexts, addFloatingText };
}
