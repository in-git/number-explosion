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
  INITIAL_STATE,
  STORAGE_KEY,
} from '../config';
import { getServerNow } from './serverTime';
import { TRIBULATION_MAX_COUNT } from './gameMath';

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

    // 往生殿「永劫点上限」等级：决定永劫点数上限（基础 100 + 等级 × 100）
    const rebirthCapLevel = Number.isFinite(parsed.rebirthCapLevel)
      ? Math.max(0, Math.floor(parsed.rebirthCapLevel as number))
      : 0;

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
      rebirthCapLevel,
      // 永劫点数持有量无上限：上限只作用于「每次永劫所得」
      rebirthPoints: Number.isFinite(parsed.rebirthPoints)
        ? Math.max(0, parsed.rebirthPoints)
        : 0,
      playTimeMs: Number.isFinite(parsed.playTimeMs) ? Math.max(0, parsed.playTimeMs) : 0,
      collapsePoints: Number.isFinite(parsed.collapsePoints) ? parsed.collapsePoints : 0,
      afterlifePoints: Number.isFinite(parsed.afterlifePoints) ? parsed.afterlifePoints : 0,
      highestValue: sanitizeBigNumData(parsed.highestValue, {
        m: Number.isFinite(parsed.currentValue?.m) ? parsed.currentValue.m : 0,
        e: Number.isFinite(parsed.currentValue?.e) ? parsed.currentValue.e : 0,
      }),
      rankingUnlocked: !!parsed.rankingUnlocked,
      upgradesAutoUnlocked: !!parsed.upgradesAutoUnlocked,
      oneKeyUpgradeUnlocked: !!parsed.oneKeyUpgradeUnlocked,
      achievementsUnlocked: !!parsed.achievementsUnlocked,
      titleUnlocked: !!parsed.titleUnlocked,
      account: sanitizeAccount(parsed.account),
      lastCredentials: sanitizeCredentials(parsed.lastCredentials),
      valueCapLevel: Number.isFinite(parsed.valueCapLevel)
        ? Math.max(0, Math.floor(parsed.valueCapLevel))
        : 0,
      rebirthPointLevel: Number.isFinite(parsed.rebirthPointLevel)
        ? Math.max(0, Math.floor(parsed.rebirthPointLevel))
        : 0,
      // 持有的渡劫丹：默认 0
      tribulationPills: Number.isFinite(parsed.tribulationPills)
        ? Math.max(0, Math.floor(parsed.tribulationPills))
        : 0,
      // 是否已渡劫成功：默认否
      tribulationSuccess: !!parsed.tribulationSuccess,
      // 渡劫次数（= 成功次数，上限 9）：旧存档由「渡劫点 − 1」迁移而来
      tribulationCount: (() => {
        const migrated = Number.isFinite(parsed.tribulationLevel) ? parsed.tribulationLevel - 1 : NaN;
        const raw = Number.isFinite(migrated)
          ? migrated
          : Number.isFinite(parsed.tribulationCount)
            ? parsed.tribulationCount
            : 0;
        return Math.min(TRIBULATION_MAX_COUNT, Math.max(0, Math.floor(raw)));
      })(),
      // 往生殿「渡劫」特权：默认未解锁
      tribulationUnlocked: !!parsed.tribulationUnlocked,
      // 渡劫殿：数值重置丹存量 / 已炼炉数 / 当前炉进度（旧存档的「破风丹」字段迁移至此）
      valueResetPills: Number.isFinite(parsed.valueResetPills)
        ? Math.max(0, Math.floor(parsed.valueResetPills))
        : Number.isFinite(parsed.breakingWindPills)
          ? Math.max(0, Math.floor(parsed.breakingWindPills))
          : 0,
      valueResetCraftCount: Number.isFinite(parsed.valueResetCraftCount)
        ? Math.max(0, Math.floor(parsed.valueResetCraftCount))
        : Number.isFinite(parsed.breakingWindCraftCount)
          ? Math.max(0, Math.floor(parsed.breakingWindCraftCount))
          : 0,
      valueResetProgressMs: Number.isFinite(parsed.valueResetProgressMs)
        ? Math.max(0, parsed.valueResetProgressMs)
        : Number.isFinite(parsed.breakingWindProgressMs)
          ? Math.max(0, parsed.breakingWindProgressMs)
          : 0,
      valueResetCrafting: !!(parsed.valueResetCrafting ?? parsed.breakingWindCrafting),
      // 渡劫殿：永劫重置丹存量 / 已炼炉数 / 当前炉进度（默认 0）
      rebirthResetPills: Number.isFinite(parsed.rebirthResetPills)
        ? Math.max(0, Math.floor(parsed.rebirthResetPills))
        : 0,
      rebirthResetCraftCount: Number.isFinite(parsed.rebirthResetCraftCount)
        ? Math.max(0, Math.floor(parsed.rebirthResetCraftCount))
        : 0,
      rebirthResetProgressMs: Number.isFinite(parsed.rebirthResetProgressMs)
        ? Math.max(0, parsed.rebirthResetProgressMs)
        : 0,
      rebirthResetCrafting: !!parsed.rebirthResetCrafting,
      // 渡劫殿：渡劫点存量 / 产出进度 / 自动永劫结算进度（默认 0）
      tribulationPoints: Number.isFinite(parsed.tribulationPoints)
        ? Math.max(0, Math.floor(parsed.tribulationPoints))
        : 0,
      tribulationPointProgressMs: Number.isFinite(parsed.tribulationPointProgressMs)
        ? Math.max(0, parsed.tribulationPointProgressMs)
        : 0,
      autoRebirthProgressMs: Number.isFinite(parsed.autoRebirthProgressMs)
        ? Math.max(0, parsed.autoRebirthProgressMs)
        : 0,
      autoRebirthCount: Number.isFinite(parsed.autoRebirthCount)
        ? Math.max(0, Math.floor(parsed.autoRebirthCount))
        : 0,
      rebirthToCollapseCount: Number.isFinite(parsed.rebirthToCollapseCount)
        ? Math.max(0, Math.floor(parsed.rebirthToCollapseCount))
        : 0,
      upgrades,
      // 重置丹账本：记录被重置掉的等级（效果保留）
      valueResetLevels: (Object.keys(INITIAL_STATE.valueResetLevels) as UpgradeId[]).reduce(
        (acc, id) => {
          const saved = parsed.valueResetLevels?.[id] ?? parsed.breakingWindLevels?.[id];
          acc[id] = Number.isFinite(saved) && saved > 0 ? Math.max(0, Math.floor(saved)) : 0;
          return acc;
        },
        {} as Record<UpgradeId, number>
      ),
      // 永劫重置丹账本：按功法记录（旧存档的单字段 rebirthResetLevel 迁移到 baseValue）
      rebirthResetLevels: (Object.keys(INITIAL_STATE.rebirthResetLevels) as UpgradeId[]).reduce(
        (acc, id) => {
          const saved =
            parsed.rebirthResetLevels?.[id] ??
            (id === 'baseValue' ? parsed.rebirthResetLevel : undefined);
          acc[id] = Number.isFinite(saved) && saved > 0 ? Math.max(0, Math.floor(saved)) : 0;
          return acc;
        },
        {} as Record<UpgradeId, number>
      ),
      // 旧存档迁移：无明确来源记录时，将当前等级保留为永劫殿独立等级（永久道基）
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
      // 永劫殿「基础数值」独立等级：优先读新字段；旧存档自合并道基 / 数值殿等级迁移
      rebirthBaseValueLevel: (() => {
        const direct = parsed.rebirthBaseValueLevel;
        if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
        const merged = parsed.rebirthMergedLevels?.baseValue;
        if (Number.isFinite(merged) && merged > 0) return Math.max(0, Math.floor(merged));
        return Number.isFinite(upgrades.baseValue?.level)
          ? Math.max(0, Math.floor(upgrades.baseValue.level))
          : 0;
      })(),
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
