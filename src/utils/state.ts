import { GameState, UpgradeId } from '../types';

/**
 * 重生/坍缩清空数值店功法等级（数值店与永劫店完全独立）；
 * 若已购买「功法无需解锁」特权，则连解锁状态一并保留（重生后仍可直接升级）。
 * 永劫店的独立等级（rebirthMergedLevels / rebirthBaseValueLevel）为永久道基，不在此重置。
 */
export function resetUpgradeLevels(
  upgrades: GameState['upgrades'],
  keepUnlocked = false
): GameState['upgrades'] {
  const next = { ...upgrades };
  (Object.keys(next) as UpgradeId[]).forEach((id) => {
    next[id] = {
      unlocked: keepUnlocked ? true : false,
      level: 0,
      capBonus: next[id].capBonus || 0,
    };
  });
  return next;
}
