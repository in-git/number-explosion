import { BigNum } from './bigNumber';
import { GameState, RebirthBaseAttrs, UpgradeId, UpgradeState } from '../types';
import { ACHIEVEMENTS, INITIAL_REBIRTH_BASE_ATTRS } from '../config';

/**
 * 成就奖励累加出的「重生初始数值」：所有已达成成就的奖励之和
 * 与其他数值来源（点击收益、基础数值等）叠加，参与后续一切计算
 */
export function getRebirthStartValue(state: GameState): BigNum {
  const unlocked = new Set(state.unlockedAchievements || []);
  let sum = 0;
  ACHIEVEMENTS.forEach((a) => {
    if (unlocked.has(a.id)) sum += a.rebirthStartValue;
  });
  return new BigNum(sum, 0);
}

// Precomputed Fibonacci cache for quick lookup (仅用于小下标，大下标会溢出 double)
const FIB_CACHE: number[] = [0, 1, 1];
export function getFibonacci(n: number): number {
  if (n <= 0) return 0;
  while (FIB_CACHE.length <= n) {
    const len = FIB_CACHE.length;
    FIB_CACHE.push(FIB_CACHE[len - 1] + FIB_CACHE[len - 2]);
  }
  return FIB_CACHE[n];
}

/** F(78) 仍在 double 精确整数范围内，更大下标改用对数公式 */
const FIB_EXACT_MAX = 78;
const LOG10_PHI = Math.log10((1 + Math.sqrt(5)) / 2);
const LOG10_SQRT5 = Math.log10(Math.sqrt(5));

/**
 * 斐波那契数 F(n) 的大数版本：永不溢出。
 * 小下标用精确整数，大下标用 Binet 公式 F(n) ≈ φ^n / √5（相对误差 < 1e-33）。
 */
export function getFibonacciBig(n: number): BigNum {
  if (n <= 0) return new BigNum(0, 0);
  if (n <= FIB_EXACT_MAX) return new BigNum(getFibonacci(n), 0);
  const logVal = n * LOG10_PHI - LOG10_SQRT5;
  const e = Math.floor(logVal);
  return new BigNum(Math.pow(10, logVal - e), e);
}

/** 点击的默认基础数值：未习炼「数值升级」时的单次基础值 */
export const BASE_VALUE_INITIAL = 1;

// Calculate cumulative Fibonacci bonus for base value
export function getFibonacciBonus(level: number): BigNum {
  if (level <= 0) return new BigNum(0, 0);
  // Sum of F(1) to F(level) = F(level + 2) - 1
  return getFibonacciBig(level + 2).sub(1);
}

/**
 * 「重生点数获取」升级
 * - 购买下一级（当前等级 L）消耗 F(L+1) 点坍缩点：1, 1, 2, 3, 5, 8 ...（斐波拉契数列）
 * - 每级在重生时额外 +1 点重生点数
 */
export function getRebirthPointUpgradeCost(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return getFibonacciBig(lv + 1);
}

/** 该升级带来的额外重生点数（每级 +1） */
export function getExtraRebirthPoints(level: number): number {
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
}

/** 数值升级收益系数：斐波那契加成 ×0.9，即每次升级收益降低 10% */
export const BASE_VALUE_BONUS_FACTOR = 0.9;

/** 数值升级实际提升值 = 斐波那契累加值 × 0.9 */
export function getBaseValueBonus(level: number): BigNum {
  if (level <= 0) return new BigNum(0, 0);
  return getFibonacciBonus(level).mulScalar(BASE_VALUE_BONUS_FACTOR);
}

export interface UpgradeDetail {
  id: UpgradeId;
  name: string;
  requiredClicks: number;
  unlockCost: BigNum;
  canUpgrade: boolean;
  currentCost: BigNum | null;
  currentEffectText: string;
  nextEffectText: string | null;
  isMaxed: boolean;
}

export const UPGRADE_METADATA: Record<UpgradeId, { name: string; requiredClicks: number; baseUnlockCost: number }> = {
  baseValue: {
    name: '数值升级',
    requiredClicks: 10,
    baseUnlockCost: 10,
  },
  autoClickUnlock: {
    name: '自动点击',
    requiredClicks: 20,
    baseUnlockCost: 25,
  },
  autoFrequency: {
    name: '自动点击频率',
    requiredClicks: 40,
    baseUnlockCost: 50,
  },
  comboChance: {
    name: '连击概率',
    requiredClicks: 60,
    baseUnlockCost: 100,
  },
  critMultiplier: {
    name: '暴击倍数',
    requiredClicks: 80,
    baseUnlockCost: 200,
  },
  comboMultiplier: {
    name: '连击倍数',
    requiredClicks: 100,
    baseUnlockCost: 400,
  },
  critChance: {
    name: '暴击概率',
    requiredClicks: 120,
    baseUnlockCost: 800,
  },
};

/** 坍缩所需消耗的重生点数 */
export const COLLAPSE_COST = 5;

/** 数值上限：默认 500万，每消耗 1 点坍缩点数翻倍 */
const VALUE_CAP_MANTISSA = 5;
const VALUE_CAP_EXP = 6; // 5 × 10^6 = 500万
export function getValueCap(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(VALUE_CAP_MANTISSA, VALUE_CAP_EXP);
  // 500万 × 2^lv
  const exp = lv * Math.log10(2);
  const e = Math.floor(exp);
  const m = Math.pow(10, exp - e);
  return new BigNum(VALUE_CAP_MANTISSA * m, VALUE_CAP_EXP + e);
}

/** 暴击概率: 基础 20%，每级 +5%，上限 100% */
export const CRIT_CHANCE_BASE = 0.2;
export const CRIT_CHANCE_STEP = 0.05;

/** 所有功法的默认等级上限 */
export const BASE_MAX_LEVEL = 20;
/** 每消耗 1 点重生点数，可提升的等级上限 */
export const LEVEL_CAP_PER_POINT = 50;

/**
 * 某功法当前的等级上限 = 默认 20 级 + 重生商店中购买的次数 × 50 级
 * - 自动点击: 不可升级，上限恒为 0
 */
export function getUpgradeMaxLevel(id: UpgradeId, up: UpgradeState): number {
  if (id === 'autoClickUnlock') return 0; // 自动点击不可升级
  return BASE_MAX_LEVEL + (up.capBonus || 0) * LEVEL_CAP_PER_POINT;
}

/** 2^n，n 较大时转为科学计数法避免溢出 */
function pow2(n: number): BigNum {
  if (n < 60) {
    return new BigNum(Math.pow(2, n), 0);
  }
  // 2^n = 10^(n * log10(2))
  const totalExp = n * Math.log10(2);
  const e = Math.floor(totalExp);
  const m = Math.pow(10, totalExp - e);
  return new BigNum(m, e);
}

/**
 * 升级消耗值，严格遵循规格:
 * - 数值升级/自动点击频率/连击概率/暴击倍数/连击倍数: 解锁消耗值 × 2^n（n = 已升级次数）
 * - 自动点击: 不可升级
 */
/** 该功法是否已臻圆满（达到等级上限，或功能性到顶） */
export function isUpgradeMaxed(id: UpgradeId, up: UpgradeState): boolean {
  if (!up.unlocked) return false;

  const maxLevel = getUpgradeMaxLevel(id, up);
  if (getUpgradeCost(id, up.level, maxLevel) === null) return true;

  // 功能性上限：即便还能买等级，效果也已达顶点
  if (id === 'autoFrequency') {
    return getAutoClickRate(up.level).clicksPerMs >= AUTO_FREQ_MAX_CLICKS_PER_MS;
  }
  if (id === 'comboChance') {
    return Math.min(1.0, up.level * 0.05) >= 1.0;
  }
  if (id === 'critChance') {
    return Math.min(1.0, CRIT_CHANCE_BASE + up.level * CRIT_CHANCE_STEP) >= 1.0;
  }
  return false;
}

/**
 * 升级消耗折扣（仅作用于「升级」成本，不影响解锁成本）
 * - 自动点击频率: 打八折，即降低 20%
 */
export const UPGRADE_COST_DISCOUNT: Partial<Record<UpgradeId, number>> = {
  autoFrequency: 0.8,
};

export function getUpgradeCost(
  id: UpgradeId,
  currentLevel: number,
  maxLevel: number
): BigNum | null {
  if (id === 'autoClickUnlock') return null; // 不可升级

  if (currentLevel >= maxLevel) return null; // 已臻圆满

  const base = UPGRADE_METADATA[id].baseUnlockCost;
  const discount = UPGRADE_COST_DISCOUNT[id] ?? 1;

  // 2^n次数的数值
  return pow2(currentLevel).mul(base * discount);
}

/**
 * 自动点击频率: 初始 1次/1000ms，每级减少间隔 50ms，最高 50次/ms
 * - Lv.0 ~ 19: 间隔 1000ms 递减至 50ms（20次/s）
 * - Lv.20 起: 进入极速态，按次/ms 递增，Lv.20 即达 50次/ms（天道极速）
 */
export const AUTO_FREQ_INTERVAL_BASE = 1000;
export const AUTO_FREQ_INTERVAL_STEP = 50;
export const AUTO_FREQ_INTERVAL_MIN = 50;
export const AUTO_FREQ_MAX_CLICKS_PER_MS = 50;
const AUTO_FREQ_MS_LEVEL = Math.floor(
  (AUTO_FREQ_INTERVAL_BASE - AUTO_FREQ_INTERVAL_MIN) / AUTO_FREQ_INTERVAL_STEP
); // 19

export interface AutoClickRate {
  intervalMs: number; // 常规态触发间隔
  clicksPerMs: number; // 极速态：每毫秒点击次数（0 表示仍在常规态）
  clicksPerSec: number;
}

export function getAutoClickRate(level: number): AutoClickRate {
  if (level <= AUTO_FREQ_MS_LEVEL) {
    const intervalMs = Math.max(
      AUTO_FREQ_INTERVAL_MIN,
      AUTO_FREQ_INTERVAL_BASE - level * AUTO_FREQ_INTERVAL_STEP
    );
    return { intervalMs, clicksPerMs: 0, clicksPerSec: AUTO_FREQ_INTERVAL_BASE / intervalMs };
  }
  // 极速态：自 0.05次/ms 起线性提升，Lv.20 恰为 50次/ms
  const startRate = AUTO_FREQ_INTERVAL_MIN / AUTO_FREQ_INTERVAL_BASE;
  const step = AUTO_FREQ_MAX_CLICKS_PER_MS - startRate;
  const clicksPerMs = Math.min(
    AUTO_FREQ_MAX_CLICKS_PER_MS,
    AUTO_FREQ_INTERVAL_MIN / AUTO_FREQ_INTERVAL_BASE + (level - AUTO_FREQ_MS_LEVEL) * step
  );
  return { intervalMs: 20, clicksPerMs, clicksPerSec: clicksPerMs * AUTO_FREQ_INTERVAL_BASE };
}

/** 累加两套重生基础属性 */
export function addRebirthBaseAttrs(
  base: RebirthBaseAttrs,
  gain: RebirthBaseAttrs
): RebirthBaseAttrs {
  return {
    baseValue: base.baseValue + gain.baseValue,
    autoFrequency: base.autoFrequency + gain.autoFrequency,
    critMultiplier: base.critMultiplier + gain.critMultiplier,
    critChance: base.critChance + gain.critChance,
    comboChance: base.comboChance + gain.comboChance,
    comboMultiplier: base.comboMultiplier + gain.comboMultiplier,
  };
}

/**
 * Calculate all live attributes for display and math
 */
export function calculateGameAttributes(state: GameState) {
  const baseValueUp = state.upgrades.baseValue;
  const autoClickUp = state.upgrades.autoClickUnlock;
  const autoFreqUp = state.upgrades.autoFrequency;
  const comboChanceUp = state.upgrades.comboChance;
  const critMultUp = state.upgrades.critMultiplier;
  const comboMultUp = state.upgrades.comboMultiplier;
  const critChanceUp = state.upgrades.critChance;

  // 0. 重生基础属性：永久累加，功法未解锁时同样生效
  const rebirthBase = state.rebirthBaseAttrs || INITIAL_REBIRTH_BASE_ATTRS;

  // 1. 基础数值: 默认 BASE_VALUE_INITIAL + 重生基础数值，数值升级提升值: 斐波拉契数列 × 0.9
  const baseBonus = baseValueUp.unlocked
    ? getBaseValueBonus(baseValueUp.level)
    : new BigNum(0, 0);
  const baseValue = new BigNum(BASE_VALUE_INITIAL, 0)
    .add(baseBonus)
    .add(rebirthBase.baseValue);

  // 2. 数值倍率
  const valueMultiplier = state.baseValueMultiplier;

  // 3. 自动点击频率: 初始1次/1000ms, 每次减少间隔50ms, 最高50次/ms
  let autoClicksPerSec = 0;
  let autoIntervalMs = AUTO_FREQ_INTERVAL_BASE;
  let autoClicksPerMs = 0;

  if (autoClickUp.unlocked) {
    // 自动点击频率等级 + 重生商店购买的永久等级加成
    const autoFreqLevel =
      (autoFreqUp.unlocked ? autoFreqUp.level : 0) + (rebirthBase.autoFrequency || 0);
    const rate = getAutoClickRate(autoFreqLevel);
    autoIntervalMs = rate.intervalMs;
    autoClicksPerMs = rate.clicksPerMs;
    autoClicksPerSec = rate.clicksPerSec;
  }

  // 4. 连击概率: 重生基础 + 每次+0.05，最高100%
  let comboChance = Math.min(1.0, rebirthBase.comboChance);
  if (comboChanceUp.unlocked) {
    comboChance = Math.min(1.0, rebirthBase.comboChance + comboChanceUp.level * 0.05);
  }

  // 5. 连击倍数: 基础100% + 重生基础，等差数列+0.5 (即 1.0 + 0.5 * level)
  let comboMultiplier = 1.0 + rebirthBase.comboMultiplier;
  if (comboMultUp.unlocked) {
    comboMultiplier += comboMultUp.level * 0.5;
  }

  // 6. 暴击倍数: 基础100% + 重生基础，等差数列+0.5 (即 1.0 + 0.5 * level)
  let critMultiplier = 1.0 + rebirthBase.critMultiplier;
  if (critMultUp.unlocked) {
    critMultiplier += critMultUp.level * 0.5;
  }

  // 7. 暴击概率: 基础20% + 重生基础，暴击概率升级每级 +5%，上限100%
  let critChance = Math.min(1.0, state.baseCritRate + rebirthBase.critChance);
  if (critChanceUp.unlocked) {
    critChance = Math.min(
      1.0,
      state.baseCritRate + rebirthBase.critChance + critChanceUp.level * CRIT_CHANCE_STEP
    );
  }

  // 8. 重生点数
  const rebirthPoints = state.rebirthPoints;

  // 9. 坍缩
  const collapsePoints = state.collapsePoints;

  // 11. 点击次数：本世（用于解锁功法） / 累计（用于解锁成就）
  const clickCount = state.clickCount;
  const totalClickCount = state.totalClickCount || 0;

  // 12. 成就奖励累计出的重生初始数值（与其他数值累加）
  const rebirthStartValue = getRebirthStartValue(state);

  // 13. 「重生点数获取」升级带来的额外重生点数
  const rebirthPointBonus = getExtraRebirthPoints(state.rebirthPointLevel || 0);

  return {
    baseValue,
    rebirthBase,
    valueMultiplier,
    autoClicksPerSec,
    autoClicksPerMs,
    autoIntervalMs,
    comboChance,
    comboMultiplier,
    critMultiplier,
    critChance,
    rebirthPoints,
    collapsePoints,
    clickCount,
    totalClickCount,
    rebirthStartValue,
    rebirthPointBonus,
  };
}

export interface ClickResult {
  isCrit: boolean;
  isCombo: boolean;
  gainedValue: BigNum;
}

/**
 * 单次点击的期望收益：连击/暴击按概率折算，不走随机判定
 * = 基础数值 ×（数值倍率 + 连击概率×连击倍数 + 暴击概率×暴击倍数）
 */
export function getExpectedClickValue(state: GameState): BigNum {
  const attrs = calculateGameAttributes(state);
  const factor =
    attrs.valueMultiplier +
    attrs.comboChance * attrs.comboMultiplier +
    attrs.critChance * attrs.critMultiplier;
  return attrs.baseValue.mulScalar(factor);
}

/**
 * 离线收益：仅在已解锁自动点击时生效
 * = 单次点击期望 × 每秒自动点击次数 × 离线秒数
 * 调用方负责把离线时长裁剪到 [0, 1天]
 */
export function getOfflineGain(state: GameState, seconds: number): BigNum {
  if (!state.upgrades?.autoClickUnlock?.unlocked) return new BigNum(0, 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return new BigNum(0, 0);

  const clicks = calculateGameAttributes(state).autoClicksPerSec * seconds;
  if (!(clicks > 0)) return new BigNum(0, 0);

  return getExpectedClickValue(state).mulScalar(clicks);
}

/**
 * 每次点击数值=基础数值*数值倍率+基础数值*连击倍数(判断触发)+基础数值*暴击倍数(判断触发)
 * 与重生点数、坍缩点数无关
 * 自动点击与用户点击共享一个算法
 */
export function executeClickCalculation(state: GameState): ClickResult {
  const attrs = calculateGameAttributes(state);

  // 1. 连击判定
  const rollCombo = Math.random();
  const isCombo = attrs.comboChance > 0 && rollCombo < attrs.comboChance;

  // 2. 暴击判定
  const rollCrit = Math.random();
  const isCrit = rollCrit < attrs.critChance;

  // 3. 计算基础累加项
  // 基础数值*数值倍率 + 基础数值*连击倍数(判断触发) + 基础数值*暴击倍数(判断触发)
  let factor = attrs.valueMultiplier;

  if (isCombo) {
    factor += attrs.comboMultiplier;
  }
  if (isCrit) {
    factor += attrs.critMultiplier;
  }

  const gainedValue = attrs.baseValue.mulScalar(factor);

  return {
    isCrit,
    isCombo,
    gainedValue,
  };
}
