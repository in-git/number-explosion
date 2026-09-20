import {
  BigNumData,
  GameState,
  LoginCredentials,
  UpgradeId,
  UserAccountData,
} from '../types';
import {
  ACHIEVEMENTS,
  DEFAULT_NICKNAME,
  GOODS_CATEGORIES,
  INITIAL_STATE,
  STORAGE_KEY,
} from '../config';
import { getServerNow } from './serverTime';

/** 清洗账号信息：非法则视为未登录 */
function sanitizeAccount(raw: unknown): UserAccountData | null {
  const src = raw as Partial<UserAccountData> | null | undefined;
  if (!src || typeof src.userId !== 'string' || typeof src.userName !== 'string') return null;
  return {
    userId: src.userId,
    userName: src.userName,
    nickname:
      typeof src.nickname === 'string' && src.nickname.trim() !== ''
        ? src.nickname
        : DEFAULT_NICKNAME,
    password: typeof src.password === 'string' ? src.password : '',
    token: typeof src.token === 'string' ? src.token : '',
    regionId: typeof src.regionId === 'string' ? src.regionId : null,
    regionName: typeof src.regionName === 'string' ? src.regionName : null,
  };
}

/** 清洗上次登录凭据 */
function sanitizeCredentials(raw: unknown): LoginCredentials | null {
  const src = raw as Partial<LoginCredentials> | null | undefined;
  if (!src || typeof src.userName !== 'string' || typeof src.password !== 'string') return null;
  return {
    userName: src.userName,
    password: src.password,
    nickname: typeof src.nickname === 'string' && src.nickname.trim() ? src.nickname : '',
  };
}

/** 清洗 BigNumData：非法则回退到兜底值 */
function sanitizeBigNumData(raw: unknown, fallback: BigNumData): BigNumData {
  const src = raw as Partial<BigNumData> | null | undefined;
  const m = src?.m;
  const e = src?.e;
  if (typeof m === 'number' && Number.isFinite(m) && m > 0 && typeof e === 'number' && Number.isFinite(e)) {
    return { m, e };
  }
  return fallback;
}

/** 清洗万物店已购记录：只保留仍在售的商品，数量取整且非负 */
function sanitizeGoodsPurchases(raw: unknown): Record<string, number> {
  const src = (raw || {}) as Record<string, unknown>;
  const validIds = new Set(GOODS_CATEGORIES.flatMap((c) => c.items.map((i) => i.id)));
  const next: Record<string, number> = {};
  Object.entries(src).forEach(([id, count]) => {
    if (!validIds.has(id)) return;
    const n = typeof count === 'number' && Number.isFinite(count) ? Math.floor(count) : 0;
    if (n > 0) next[id] = n;
  });
  return next;
}

/**
 * 读取存档：只保留当前仍存在的功法，清洗非法数值，
 * 并为旧存档补齐新增字段。
 */
/** 成就 id 白名单：过滤掉已删除/伪造的成就 */
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export function loadGameState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_STATE;

    const parsed = JSON.parse(saved);

    // 旧存档没有累计点击：用当时的点击次数回填
    const savedClickCount = Number.isFinite(parsed.clickCount)
      ? Math.max(0, Math.floor(parsed.clickCount))
      : 0;
    const totalClickCount =
      Number.isFinite(parsed.totalClickCount) && parsed.totalClickCount > 0
        ? Math.max(savedClickCount, Math.floor(parsed.totalClickCount))
        : savedClickCount;

    const upgrades = { ...INITIAL_STATE.upgrades };
    (Object.keys(INITIAL_STATE.upgrades) as UpgradeId[]).forEach((id) => {
      const savedUp = parsed.upgrades?.[id];
      if (savedUp) {
        upgrades[id] = {
          unlocked: !!savedUp.unlocked,
          level: Number.isFinite(savedUp.level) ? Math.max(0, Math.floor(savedUp.level)) : 0,
          capBonus: Number.isFinite(savedUp.capBonus)
            ? Math.max(0, Math.floor(savedUp.capBonus))
            : 0,
        };
      }
    });

    // 已提示过的解锁：旧存档没有该字段时，用现有进度回填，避免刷新后重复弹提示
    let notifiedUnlocks: string[] = Array.isArray(parsed.notifiedUnlocks)
      ? parsed.notifiedUnlocks.filter((k: unknown) => typeof k === 'string')
      : [];
    if (!Array.isArray(parsed.notifiedUnlocks)) {
      notifiedUnlocks = (Object.keys(upgrades) as UpgradeId[]).filter(
        (id) => upgrades[id].unlocked
      );
      if (parsed.rebirthUnlocked) notifiedUnlocks.push('rebirth');
      if (parsed.collapseUnlocked) notifiedUnlocks.push('collapse');
    }

    return {
      ...INITIAL_STATE,
      ...parsed,
      clickCount: savedClickCount,
      totalClickCount,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? [
            ...new Set(
              parsed.unlockedAchievements.filter(
                (k: unknown): k is string => typeof k === 'string' && ACHIEVEMENT_IDS.has(k)
              )
            ),
          ]
        : [],
      rebirthPoints: Number.isFinite(parsed.rebirthPoints) ? parsed.rebirthPoints : 0,
      playTimeMs: Number.isFinite(parsed.playTimeMs) ? Math.max(0, parsed.playTimeMs) : 0,
      collapsePoints: Number.isFinite(parsed.collapsePoints) ? parsed.collapsePoints : 0,
      afterlifePoints: Number.isFinite(parsed.afterlifePoints) ? parsed.afterlifePoints : 0,
      highestValue: sanitizeBigNumData(parsed.highestValue, {
        m: Number.isFinite(parsed.currentValue?.m) ? parsed.currentValue.m : 0,
        e: Number.isFinite(parsed.currentValue?.e) ? parsed.currentValue.e : 0,
      }),
      rankingUnlocked: !!parsed.rankingUnlocked,
      upgradesAutoUnlocked: !!parsed.upgradesAutoUnlocked,
      account: sanitizeAccount(parsed.account),
      lastCredentials: sanitizeCredentials(parsed.lastCredentials),
      valueCapLevel: Number.isFinite(parsed.valueCapLevel)
        ? Math.max(0, Math.floor(parsed.valueCapLevel))
        : 0,
      rebirthPointLevel: Number.isFinite(parsed.rebirthPointLevel)
        ? Math.max(0, Math.floor(parsed.rebirthPointLevel))
        : 0,
      rebirthToCollapseCount: Number.isFinite(parsed.rebirthToCollapseCount)
        ? Math.max(0, Math.floor(parsed.rebirthToCollapseCount))
        : 0,
      upgrades,
      // 旧存档迁移：无法区分永劫店/数值店购买来源，将当前等级整体保留为永久道基
      rebirthMergedLevels: (Object.keys(INITIAL_STATE.rebirthMergedLevels) as UpgradeId[]).reduce(
        (acc, id) => {
          const saved = parsed.rebirthMergedLevels?.[id];
          acc[id] =
            Number.isFinite(saved) && saved > 0
              ? Math.max(0, Math.floor(saved))
              : Number.isFinite(upgrades[id].level)
                ? Math.max(0, Math.floor(upgrades[id].level))
                : 0;
          return acc;
        },
        {} as Record<UpgradeId, number>
      ),
      notifiedUnlocks,
      lastActiveAt: Number.isFinite(parsed.lastActiveAt) ? parsed.lastActiveAt : 0,
    };
  } catch {
    return INITIAL_STATE;
  }
}

/** 存档：时间戳一律写服务器时间，避免本地改时间影响离线结算 */
export function saveGameState(state: GameState, currentValue: BigNumData): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, currentValue, lastActiveAt: getServerNow() })
    );
  } catch {
    // ignore
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
