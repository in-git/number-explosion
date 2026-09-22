import { useCallback, useState } from 'react';
import type { UpgradeAmountMode } from '../utils/gameMath';

/**
 * 各商殿共用的「升级量」模式：在 1 → 一半 → max 之间循环，默认 1。
 * 与「一键升级」开关一一对应，仅影响本殿购买按钮的结算数量。
 */
export function useUpgradeAmountMode(): { mode: UpgradeAmountMode; cycle: () => void } {
  const [mode, setMode] = useState<UpgradeAmountMode>('1');

  const cycle = useCallback(() => {
    setMode((m) => (m === '1' ? 'half' : m === 'half' ? 'max' : '1'));
  }, []);

  return { mode, cycle };
}
