import { useCallback, useSyncExternalStore } from 'react';
import type { UpgradeAmountMode } from '../utils/gameMath';

/**
 * 全局「升级量」模式（「一键升级 / 一键购买」开关）：1 → 一半 → max 循环，默认 1。
 *
 * 为什么是全局单例而不是每个商殿各持一份：
 * 开关只应有一个「本次买几次」的语义，若各殿各持一份，玩家在数值殿切到 max 后
 * 去别的殿仍显示 1，购买按钮上的「次数」就没跟着切换。
 * 现在任意一殿切换 → 所有殿的按钮次数一并联动；模块级保存，故关闭 / 重开商殿仍保持选择。
 */
let amountMode: UpgradeAmountMode = '1';
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): UpgradeAmountMode {
  return amountMode;
}

export function useUpgradeAmountMode(): { mode: UpgradeAmountMode; cycle: () => void } {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const cycle = useCallback(() => {
    amountMode = amountMode === '1' ? 'half' : amountMode === 'half' ? 'max' : '1';
    listeners.forEach((listener) => listener());
  }, []);

  return { mode, cycle };
}
