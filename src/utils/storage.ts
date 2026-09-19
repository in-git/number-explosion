import { BigNumData, GameState, RebirthBaseAttrs, UpgradeId } from '../types';
import { ACHIEVEMENTS, INITIAL_REBIRTH_BASE_ATTRS, INITIAL_STATE, STORAGE_KEY } from '../config';
import { getServerNow } from './serverTime';

/** 清洗重生基础属性：非法值归 0，缺失字段用初始值补齐 */
function sanitizeRebirthBaseAttrs(raw: unknown): RebirthBaseAttrs {
  const src = (raw || {}) as Partial<Record<keyof RebirthBaseAttrs, unknown>>;
  const pick = (key: keyof RebirthBaseAttrs) => {
    const v = src[key];
    return typeof v === 'number' && Number.isFinite(v) && v > 0
      ? v
      : INITIAL_REBIRTH_BASE_ATTRS[key];
  };
  return {
    baseValue: pick('baseValue'),
    autoFrequency: pick('autoFrequency'),
    critMultiplier: pick('critMultiplier'),
    critChance: pick('critChance'),
    comboChance: pick('comboChance'),
    comboMultiplier: pick('comboMultiplier'),
  };
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
      collapsePoints: Number.isFinite(parsed.collapsePoints) ? parsed.collapsePoints : 0,
      rebirthBaseAttrs: sanitizeRebirthBaseAttrs(parsed.rebirthBaseAttrs),
      valueCapLevel: Number.isFinite(parsed.valueCapLevel)
        ? Math.max(0, Math.floor(parsed.valueCapLevel))
        : 0,
      rebirthPointLevel: Number.isFinite(parsed.rebirthPointLevel)
        ? Math.max(0, Math.floor(parsed.rebirthPointLevel))
        : 0,
      upgrades,
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
