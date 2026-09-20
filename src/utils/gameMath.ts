import { BigNum } from './bigNumber';
import { GameState, UpgradeId, UpgradeState } from '../types';
import { ACHIEVEMENTS } from '../config';

/**
 * 成就奖励累加出的「永劫初始数值」：所有已达成成就的奖励之和
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

/**
 * 成就奖励累加出的「暴击效果」（暴击倍数基数加成）：
 * 游玩时长成就达成后永久累加，与永劫基础属性、功法等级叠加计算
 */
export function getAchievementCritBonus(state: GameState): number {
  const unlocked = new Set(state.unlockedAchievements || []);
  let sum = 0;
  ACHIEVEMENTS.forEach((a) => {
    if (a.critMultiplier && unlocked.has(a.id)) sum += a.critMultiplier;
  });
  return sum;
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
 * 「永劫点数获取」升级
 * - 购买下一级（当前等级 L）消耗 F(L+1) 点坍缩点：1, 1, 2, 3, 5, 8 ...（斐波拉契数列）
 * - 每级在永劫时额外 +1 点永劫点数
 */
export function getRebirthPointUpgradeCost(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return getFibonacciBig(lv + 1);
}

/** 每 100 万数值折算 1 点永劫点数 */
export const REBIRTH_VALUE_PER_POINT = 1e6;

/** 永劫点数 = 数值 ÷ 100 万（向下取整）；300 万即 3 点 */
export function getRebirthPointsFromValue(value: BigNum): number {
  const ratio = value.div(BigNum.fromNumber(REBIRTH_VALUE_PER_POINT)).toNumber();
  if (!Number.isFinite(ratio)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor(ratio));
}

/** 该升级带来的额外永劫点数（每级 +1） */
export function getExtraRebirthPoints(level: number): number {
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
}

/** 兑换：每次消耗 3 点永劫点数换 1 点坍缩点数 */
export const REBIRTH_TO_COLLAPSE_BASE_COST = 3;
/** 兑换：前 50 次维持基础消耗，不加价 */
export const REBIRTH_TO_COLLAPSE_FREE_TIMES = 50;
/** 兑换：50 次之后的消耗基数（50 + 斐波拉契） */
export const REBIRTH_TO_COLLAPSE_RAISE_BASE = 50;

/**
 * 「永劫点数 → 坍缩点数」第 (n+1) 次兑换所需的永劫点数（n = 已兑换次数）
 * - 前 50 次：恒定 3 点
 * - 第 51 次起：50 + F(n - 50)，即 50, 51, 51, 52, 53, 55, 58 ...
 */
export function getRebirthToCollapseCost(exchangedTimes: number): BigNum {
  const n = Number.isFinite(exchangedTimes) && exchangedTimes > 0 ? Math.floor(exchangedTimes) : 0;
  if (n < REBIRTH_TO_COLLAPSE_FREE_TIMES) {
    return new BigNum(REBIRTH_TO_COLLAPSE_BASE_COST, 0);
  }
  return getFibonacciBig(n - REBIRTH_TO_COLLAPSE_FREE_TIMES).add(REBIRTH_TO_COLLAPSE_RAISE_BASE);
}

/** 背包回收价：原价 × 10% */
export const GOODS_SELL_RATE = 0.1;
export function getGoodsSellPrice(baseCost: number): BigNum {
  return BigNum.fromNumber(baseCost).mulScalar(GOODS_SELL_RATE);
}

/**
 * 永劫店「基础数值」每级提升量（自定义斐波那契数列，BigNum 防溢出）：
 * 50, 70, 120, 190, 310, 500, 810 ...（第 1、2 级为 50、70；第 n 级 = 前两级之和）
 */
const REBIRTH_BASE_VALUE_GAIN_SEQ: BigNum[] = [new BigNum(50, 0), new BigNum(70, 0)];
export function getRebirthBaseValueGain(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(0, 0);
  while (REBIRTH_BASE_VALUE_GAIN_SEQ.length < lv) {
    const len = REBIRTH_BASE_VALUE_GAIN_SEQ.length;
    REBIRTH_BASE_VALUE_GAIN_SEQ.push(
      REBIRTH_BASE_VALUE_GAIN_SEQ[len - 1].add(REBIRTH_BASE_VALUE_GAIN_SEQ[len - 2])
    );
  }
  return REBIRTH_BASE_VALUE_GAIN_SEQ[lv - 1];
}

/** 数值升级累计加成：Σ(每级提升量) = a(level+2) − a(2)，即 a(level+2) − 70 */
export function getBaseValueBonus(level: number): BigNum {
  if (level <= 0) return new BigNum(0, 0);
  return getRebirthBaseValueGain(level + 2).sub(new BigNum(70, 0));
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

/** 坍缩所需消耗的永劫点数 */
export const COLLAPSE_COST = 5;

/** 数值上限基数：默认 100 万 */
export const VALUE_CAP_BASE = 1e6;

/**
 * 数值上限每级提升量系数（单位：万）
 * 序列：0, 1, 2, 3, 5, 8, 13 ...（第 1、2 级为 0、1；第 3 级起 = 前两级之和，呈斐波那契增长）
 * 第 n 级的提升量 = (100 + 50 × 系数) 万
 */
function getValueCapStepCoeff(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 0;
  const seq = [0, 1, 2]; // 第 1、2、3 级系数
  while (seq.length < lv) {
    const len = seq.length;
    seq.push(seq[len - 1] + seq[len - 2]);
  }
  return seq[lv - 1];
}

/**
 * 数值上限每级提升量（实际数值）：
 *   第 n 级 = (100 + 50 × 系数_n) 万
 *   即：100 万、150 万、200 万、250 万、350 万、550 万 ...
 */
export function getValueCapStep(level: number): BigNum {
  const coeff = getValueCapStepCoeff(level);
  return new BigNum(VALUE_CAP_BASE).add(new BigNum(5e5 * coeff, 0));
}

/**
 * 数值上限：默认 100 万，每级提升量按斐波那契式递增
 * = 100万 + Σ(每级提升量)
 */
export function getValueCap(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  let total = new BigNum(VALUE_CAP_BASE, 0);
  for (let k = 1; k <= lv; k++) {
    total = total.add(getValueCapStep(k));
  }
  return total;
}

/**
 * 购买第 level 级（level 从 1 起）数值上限所需的坍缩点数：100 × F(level + 1)（斐波那契）
 *   即：100、200、300、500、800、1300 ...
 */
export function getValueCapCost(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(100, 0);
  return getFibonacciBig(lv + 1).mulScalar(100);
}

/**
 * 永劫商店：单独升级某项永劫基础属性的消耗（永劫点数）
 * - 基础数值：按斐波拉契数列递增（1, 1, 2, 3, 5, 8 ...），第 n 次购买消耗 F(n)
 * - 其余属性：线性递增，第 n 次购买消耗 n 点（1, 2, 3, 4 ...）
 * 消耗依据当前升级等级（即已购买次数）计算。
 */
export function getRebirthMergedUpgradeCost(id: UpgradeId, level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (id === 'baseValue') return getFibonacciBig(lv + 1);
  return new BigNum(lv + 1, 0);
}

/** 暴击概率: 基础 20%，每级 +5%，上限 100% */
export const CRIT_CHANCE_BASE = 0.2;
export const CRIT_CHANCE_STEP = 0.05;

/** 暴击倍数 / 连击倍数: 每次升级 +30% */
export const MULTIPLIER_STEP = 0.3;

/** 所有功法的默认等级上限 */
export const BASE_MAX_LEVEL = 20;
/** 每消耗 1 点永劫点数，可提升的等级上限 */
export const LEVEL_CAP_PER_POINT = 50;

/**
 * 某功法当前的等级上限 = 默认 20 级 + 永劫商店中购买的次数 × 50 级
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
    // 已达最快间隔（10ms 一次），再快已无意义
    return getAutoClickRate(up.level).intervalMs <= AUTO_FREQ_INTERVAL_MIN;
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
 * 自动点击频率：升级消耗按斐波拉契递增
 * 第 n 次（n 从 1 起）= 100 × n + F(n - 1)，即 100, 201, 301, 402, 503, 605 ...
 */
export const AUTO_FREQ_COST_STEP = 100;
export function getAutoFrequencyUpgradeCost(currentLevel: number): BigNum {
  const n = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) + 1 : 1;
  return new BigNum(AUTO_FREQ_COST_STEP * n, 0).add(getFibonacciBig(n - 1));
}

/**
 * 升级消耗折扣（仅作用于「升级」成本，不影响解锁成本）
 * 自动点击频率已改为斐波拉契消耗，不再享有折扣
 */
export const UPGRADE_COST_DISCOUNT: Partial<Record<UpgradeId, number>> = {};

/**
 * 往生店：「数值店升级消耗折扣」特权
 * - 于坍缩店消耗 20 点坍缩点数解锁（一次性），默认不显示
 * - 每级进一步提升数值店升级消耗的折扣：
 *     · 第 1 级：固定降低 5%
 *     · 第 L 级（L≥2）：5% + 斐波那契 F(L+4) × 20%
 *       即 5%、5+8×0.2、5+13×0.2、5+21×0.2 …（8/13/21 为斐波那契数列）
 * - 每级消耗（坍缩点）按斐波那契递增：F(当前等级+1)
 *     即第 1 级 1、第 2 级 2、第 3 级 3、第 4 级 5、第 5 级 8 …
 */
/** 达到指定等级时的折扣百分比（0 表示未购买） */
export function getAfterlifeDiscountPercent(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 0;
  if (lv === 1) return 5; // 首级固定 5%，不叠加斐波那契项
  // 第 L 级（L≥2）：5% + F(L+4) × 20%
  return 5 + 0.2 * getFibonacci(lv + 4);
}

/** 购买后等级（currentLevel + 1）的折扣百分比 */
export function getAfterlifeNextDiscount(currentLevel: number): number {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  return getAfterlifeDiscountPercent(lv + 1);
}

/** 购买第 (currentLevel+1) 级所需坍缩点数：F(currentLevel + 2)（即 1, 2, 3, 5, 8 …） */
export function getAfterlifeUpgradeCost(currentLevel: number): number {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  return getFibonacci(lv + 2);
}

/** 将往生店折扣应用到一次数值店升级消耗上（折扣封顶 100%，消耗不为负） */
export function applyAfterlifeDiscount(cost: BigNum | null, level: number): BigNum | null {
  if (cost === null) return null;
  const discount = getAfterlifeDiscountPercent(level);
  if (discount <= 0) return cost;
  const multiplier = Math.max(0, 1 - discount / 100);
  return cost.mulScalar(multiplier);
}

export function getUpgradeCost(
  id: UpgradeId,
  currentLevel: number,
  maxLevel: number
): BigNum | null {
  if (id === 'autoClickUnlock') return null; // 不可升级

  if (currentLevel >= maxLevel) return null; // 已臻圆满

  // 自动点击频率：已达最快间隔（10ms/次）后禁止继续升级
  if (id === 'autoFrequency') {
    if (getAutoClickRate(currentLevel).intervalMs <= AUTO_FREQ_INTERVAL_MIN) return null;
    return getAutoFrequencyUpgradeCost(currentLevel);
  }

  const base = UPGRADE_METADATA[id].baseUnlockCost;
  const discount = UPGRADE_COST_DISCOUNT[id] ?? 1;

  // 2^n次数的数值
  return pow2(currentLevel).mul(base * discount);
}

/**
 * 自动点击频率: 初始 1次/1000ms（默认 1 次/s），逐级缩短间隔，最快 10ms 一次（100次/s）
 * - Lv.0 ~ 19: 间隔 1000ms 每级 -50ms，递减至 50ms（1次/s → 20次/s）
 * - Lv.20 起: 间隔每级 -2ms，Lv.39 达最快 10ms（100次/s）
 *   等级上限默认 20，欲再提速须在坍缩商店购买等级上限
 */
export const AUTO_FREQ_INTERVAL_BASE = 1000;
export const AUTO_FREQ_INTERVAL_STEP = 50;
/** 常规态最短间隔（Lv.19） */
export const AUTO_FREQ_SLOW_MIN = 50;
/** 极速阶段每级缩短的间隔（ms） */
export const AUTO_FREQ_INTERVAL_STEP_FAST = 2;
/** 最快间隔：10ms 一次（100次/s），再快已无意义 */
export const AUTO_FREQ_INTERVAL_MIN = 10;
const AUTO_FREQ_MS_LEVEL = Math.floor(
  (AUTO_FREQ_INTERVAL_BASE - AUTO_FREQ_SLOW_MIN) / AUTO_FREQ_INTERVAL_STEP
); // 19

export interface AutoClickRate {
  intervalMs: number; // 触发间隔（ms）
  /** 每毫秒点击次数：恒为 0（已取消每毫秒多次点击的极速态） */
  clicksPerMs: number;
  clicksPerSec: number;
}

export function getAutoClickRate(level: number): AutoClickRate {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;

  const intervalMs =
    lv <= AUTO_FREQ_MS_LEVEL
      ? // 常规段：1000ms 起每级 -50ms，至 50ms
        Math.max(AUTO_FREQ_SLOW_MIN, AUTO_FREQ_INTERVAL_BASE - lv * AUTO_FREQ_INTERVAL_STEP)
      : // 极速段：50ms 起每级 -2ms，最快 10ms（100次/s）
        Math.max(
          AUTO_FREQ_INTERVAL_MIN,
          AUTO_FREQ_SLOW_MIN - (lv - AUTO_FREQ_MS_LEVEL) * AUTO_FREQ_INTERVAL_STEP_FAST
        );

  return { intervalMs, clicksPerMs: 0, clicksPerSec: AUTO_FREQ_INTERVAL_BASE / intervalMs };
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

  // 0. 永劫基础属性已合并至「数值店」升级等级（统一数据源，重生/坍缩后永久保留）

  // 1. 基础数值: 默认 BASE_VALUE_INITIAL + 永劫基础数值，数值升级提升值: 斐波拉契数列 × 0.9
  const baseBonus = baseValueUp.unlocked
    ? getBaseValueBonus(baseValueUp.level)
    : new BigNum(0, 0);
  const baseValue = new BigNum(BASE_VALUE_INITIAL, 0)
    .add(baseBonus);

  // 2. 数值倍率
  const valueMultiplier = state.baseValueMultiplier;

  // 3. 自动点击频率: 初始1次/1000ms, 每次减少间隔50ms, 最高50次/ms
  let autoClicksPerSec = 0;
  let autoIntervalMs = AUTO_FREQ_INTERVAL_BASE;
  let autoClicksPerMs = 0;

  if (autoClickUp.unlocked) {
    const autoFreqLevel = autoFreqUp.unlocked ? autoFreqUp.level : 0;
    const rate = getAutoClickRate(autoFreqLevel);
    autoIntervalMs = rate.intervalMs;
    autoClicksPerMs = rate.clicksPerMs;
    autoClicksPerSec = rate.clicksPerSec;
  }

  // 4. 连击概率: 每次升级 +0.05，最高 100%
  let comboChance = 0;
  if (comboChanceUp.unlocked) {
    comboChance = Math.min(1.0, comboChanceUp.level * 0.05);
  }

  // 5. 连击倍数: 基础 100% + 每次升级 +30%（即 1.0 + 0.3 × level）
  let comboMultiplier = 1.0;
  if (comboMultUp.unlocked) {
    comboMultiplier += comboMultUp.level * MULTIPLIER_STEP;
  }

  // 6. 暴击倍数: 基础 100% + 成就奖励 + 每次升级 +30%（即 1.0 + 成就加成 + 0.3 × level）
  const achievementCritBonus = getAchievementCritBonus(state);
  let critMultiplier = 1.0 + achievementCritBonus;
  if (critMultUp.unlocked) {
    critMultiplier += critMultUp.level * MULTIPLIER_STEP;
  }

  // 7. 暴击概率: 基础 20% + 暴击概率升级每级 +5%，上限 100%
  let critChance = Math.min(1.0, state.baseCritRate);
  if (critChanceUp.unlocked) {
    critChance = Math.min(1.0, state.baseCritRate + critChanceUp.level * CRIT_CHANCE_STEP);
  }

  // 8. 永劫点数
  const rebirthPoints = state.rebirthPoints;

  // 9. 坍缩
  const collapsePoints = state.collapsePoints;

  // 11. 点击次数：本世（用于解锁功法） / 累计（用于解锁成就）
  const clickCount = state.clickCount;
  const totalClickCount = state.totalClickCount || 0;

  // 12. 成就奖励累计出的永劫初始数值（与其他数值累加）
  const rebirthStartValue = getRebirthStartValue(state);

  // 13. 「永劫点数获取」升级带来的额外永劫点数
  const rebirthPointBonus = getExtraRebirthPoints(state.rebirthPointLevel || 0);

  return {
    baseValue,
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
    achievementCritBonus,
    playTimeMs: state.playTimeMs || 0,
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
 * 与永劫点数、坍缩点数无关
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
