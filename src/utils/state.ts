import { GameState, UpgradeId } from '../types';
import { REBIRTH_MERGED_UPGRADES } from '../config';

/**
 * 重生/坍缩只清空功法等级；
 * 在重生商店中买下的等级上限属于永久境界，予以保留。
 * 若已购买「功法无需解锁」特权，则连解锁状态一并保留（重生后仍可直接升级）。
 */
export function resetUpgradeLevels(
  upgrades: GameState['upgrades'],
  keepUnlocked = false
): GameState['upgrades'] {
  const mergedIds = new Set<UpgradeId>(REBIRTH_MERGED_UPGRADES.map((u) => u.id));
  const next = { ...upgrades };
  (Object.keys(next) as UpgradeId[]).forEach((id) => {
    // 永劫基础属性已合并至数值店升级等级，作为永久道基，重生/坍缩后保留
    if (mergedIds.has(id)) return;
    next[id] = {
      unlocked: keepUnlocked ? true : false,
      level: 0,
      capBonus: next[id].capBonus || 0,
    };
  });
  return next;
}
