import { GameState, UpgradeId } from '../types';
import { INITIAL_STATE } from '../config';

/**
 * 重生/坍缩清空数值殿功法等级（数值殿与永劫殿完全独立）；
 * 若已购买「功法无需解锁」特权，则连解锁状态一并保留（重生后仍可直接升级）。
 * 永劫殿的独立等级（rebirthMergedLevels / rebirthBaseValueLevel）为永久道基，不在此重置。
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

/**
 * 存档属性：历世之迹，不随「数值属性」一起回退。
 * 渡劫失败 / 重修只重置数值属性（数值、各殿等级、货币、解锁开关等），
 * 这些字段一律保留。新增此类字段时只需在此登记一次。
 */
export const ARCHIVE_KEYS = [
  // 历世记录
  'highestValue', // 历世最高数值纪录（永不清零：渡劫失败 / 永劫 / 坍缩均保留）
  'gameCleared', // 是否通关（数值曾达 1ssr）：一经达成永久为真
  'playTimeMs', // 游玩时长
  'totalClickCount', // 总点击次数（历世累计）——当世点击 clickCount 属数值属性，会被重置
  'tribulationCount', // 渡劫次数（成败均计一次，同时是收益的次方指数）
  // 非数值进度：登录身份 / 服务器时间戳 / 已提示过的解锁记录
  'account',
  'lastCredentials',
  'lastActiveAt',
  'notifiedUnlocks',
] as const;

export type ArchiveState = Pick<GameState, (typeof ARCHIVE_KEYS)[number]>;

/** 取出「存档属性」 */
export function pickArchive(state: GameState): ArchiveState {
  const archive = {} as ArchiveState;
  ARCHIVE_KEYS.forEach((key) => {
    (archive as Record<string, unknown>)[key] = state[key];
  });
  return archive;
}

/**
 * 回到初始值：数值属性全部重置为 INITIAL_STATE，存档属性（见 ARCHIVE_KEYS）原样保留。
 * 用于渡劫失败——数值与诸殿修为尽数归零，唯历世之迹长存。
 */
export function resetToInitialState(state: GameState): GameState {
  return {
    ...INITIAL_STATE,
    // 映射 / 数组类字段各复制一份，避免与 INITIAL_STATE 共享引用
    upgrades: { ...INITIAL_STATE.upgrades },
    rebirthMergedLevels: { ...INITIAL_STATE.rebirthMergedLevels },
    afterlifeUpgradeLevels: { ...INITIAL_STATE.afterlifeUpgradeLevels },
    valueResetLevels: { ...INITIAL_STATE.valueResetLevels },
    rebirthResetLevels: { ...INITIAL_STATE.rebirthResetLevels },
    unlockedAchievements: [...INITIAL_STATE.unlockedAchievements],
    ...pickArchive(state),
  };
}
