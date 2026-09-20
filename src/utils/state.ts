import { GameState, UpgradeId } from '../types';
import { REBIRTH_MERGED_UPGRADES } from '../config';

/**
 * 重生/坍缩清空功法等级；
 * 若已购买「功法无需解锁」特权，则连解锁状态一并保留（重生后仍可直接升级）。
 * 永劫店购买的等级（rebirthMergedLevels）作为永久道基保留；
 * 数值店用数值购买的等级（超出永劫店部分）随转世清零。
 */
export function resetUpgradeLevels(
  upgrades: GameState['upgrades'],
  keepUnlocked = false,
  mergedLevels?: Partial<Record<UpgradeId, number>>
): GameState['upgrades'] {
  const mergedIds = new Set<UpgradeId>(REBIRTH_MERGED_UPGRADES.map((u) => u.id));
  const next = { ...upgrades };
  (Object.keys(next) as UpgradeId[]).forEach((id) => {
    // 永劫基础属性已合并至数值店升级等级：仅保留永劫店购买的等级
    if (mergedIds.has(id)) {
      const keepLevel = mergedLevels?.[id] || 0;
      next[id] = {
        unlocked: keepUnlocked ? true : keepLevel > 0,
        level: keepLevel,
        capBonus: next[id].capBonus || 0,
      };
      return;
    }
    next[id] = {
      unlocked: keepUnlocked ? true : false,
      level: 0,
      capBonus: next[id].capBonus || 0,
    };
  });
  return next;
}
