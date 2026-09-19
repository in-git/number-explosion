import { GameState, UpgradeId } from '../types';

/**
 * 永劫/坍缩只清空功法的解锁与等级；
 * 在永劫商店中买下的等级上限属于永久境界，予以保留。
 */
export function resetUpgradeLevels(upgrades: GameState['upgrades']): GameState['upgrades'] {
  const next = { ...upgrades };
  (Object.keys(next) as UpgradeId[]).forEach((id) => {
    next[id] = { unlocked: false, level: 0, capBonus: next[id].capBonus || 0 };
  });
  return next;
}
