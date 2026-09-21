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
 * 「永劫爆炸」（永劫点数获取）升级
 * - 购买第 n 次（n 从 1 起）消耗 2^(n-1) 点坍缩点：1, 2, 4, 8, 16 ...（2 的幂）
 * - 每级使永劫时「每 100 万数值」额外 +0.2 点永劫点数（见 getExtraRebirthPoints）
 */
export function getRebirthPointUpgradeCost(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return pow2(lv);
}

/** 每 100 万数值折算 1 点永劫点数 */
export const REBIRTH_VALUE_PER_POINT = 1e6;

/** 永劫点数 = 数值 ÷ 100 万（向下取整）；300 万即 3 点 */
export function getRebirthPointsFromValue(value: BigNum): number {
  const ratio = value.div(BigNum.fromNumber(REBIRTH_VALUE_PER_POINT)).toNumber();
  if (!Number.isFinite(ratio)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor(ratio));
}

/** 「永劫爆炸」每级加成：永劫时每 100 万数值额外 +0.2 点永劫点数 */
export const REBIRTH_POINT_BONUS_PER_MILLION = 0.2;

/**
 * 「永劫爆炸」在永劫时额外获得的永劫点数：
 * 每级使每 100 万数值额外 +0.2 点，即 数值 ÷ 100 万 × 0.2 × 等级（保留 2 位小数）
 */
export function getExtraRebirthPoints(level: number, value: BigNum): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 0;
  const millions = value.div(BigNum.fromNumber(REBIRTH_VALUE_PER_POINT)).toNumber();
  if (!Number.isFinite(millions)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.round(millions * lv * REBIRTH_POINT_BONUS_PER_MILLION * 100) / 100);
}

/** 「永劫爆炸」每 100 万数值的额外永劫点数（= 0.2 × 等级），用于面板展示 */
export function getRebirthPointBonusPerMillion(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 0;
  return Math.round(lv * REBIRTH_POINT_BONUS_PER_MILLION * 100) / 100;
}

/** 永劫点数展示：整数不带小数，含 0.2 级小数时保留 1 位 */
export function formatRebirthPoints(points: number): string {
  return Number.isInteger(points) ? points.toString() : points.toFixed(1);
}

/** 兑换：每次消耗 3 点永劫点数换 1 点坍缩点数（恒定 3:1，不随次数加价） */
export const REBIRTH_TO_COLLAPSE_BASE_COST = 3;

/**
 * 「永劫点数 → 坍缩点数」第 (n+1) 次兑换所需的永劫点数：恒定 3 点
 */
export function getRebirthToCollapseCost(exchangedTimes: number): BigNum {
  return new BigNum(REBIRTH_TO_COLLAPSE_BASE_COST, 0);
}



/**
 * 「数值殿·数值升级」每级提升量（斐波那契数列，BigNum 防溢出）：
 * 1, 2, 3, 5, 8, 13, 21 ...（第 1、2 级为 1、2；第 n 级 = 前两级之和）
 * 注意：仅作用于数值殿等级，与永劫殿的「基础数值」完全独立。
 */
const BASE_VALUE_GAIN_SEQ: BigNum[] = [new BigNum(1, 0), new BigNum(2, 0)];
export function getBaseValueLevelGain(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(0, 0);
  while (BASE_VALUE_GAIN_SEQ.length < lv) {
    const len = BASE_VALUE_GAIN_SEQ.length;
    BASE_VALUE_GAIN_SEQ.push(BASE_VALUE_GAIN_SEQ[len - 1].add(BASE_VALUE_GAIN_SEQ[len - 2]));
  }
  return BASE_VALUE_GAIN_SEQ[lv - 1];
}

/** 「数值殿·数值升级」效果系数：累计加成整体 × 0.7（仅效果，升级消耗不变） */
export const BASE_VALUE_EFFECT_FACTOR = 0.7;

/** 「数值殿·数值升级」累计加成：Σ(每级提升量) × 0.7 = (a(level+2) − 2) × 0.7 */
export function getBaseValueBonus(level: number): BigNum {
  if (level <= 0) return new BigNum(0, 0);
  return getBaseValueLevelGain(level + 2)
    .sub(new BigNum(2, 0))
    .mulScalar(BASE_VALUE_EFFECT_FACTOR);
}

/**
 * 「数值升级」累计加成 —— 唯一计算入口。
 * = 数值殿累计加成 + 永劫殿「基础数值」累计加成 × 往生殿「数值升级」基础倍数
 * （数值殿未解锁时其部分按 0 计；往生殿未购买时倍数为 1）
 *
 * 往生殿的强化作用于永劫殿而非数值殿；新增任何加成来源只需改这里。
 */
export function getBaseValueUpgradeBonus(state: GameState): BigNum {
  const shopLevel = state.upgrades?.baseValue?.unlocked
    ? getEffectiveUpgradeLevel(state, 'baseValue')
    : 0;
  const afterlifeLevel = state.afterlifeUpgradeLevels?.baseValue || 0;
  // 永劫殿「基础数值」：当前等级 + 永劫重置丹保留的等级（等级为永久道基，转世不清零）
  const rebirthLevel =
    (state.rebirthBaseValueLevel || 0) + getRebirthResetKeptLevel(state, 'baseValue');
  return getBaseValueBonus(shopLevel).add(
    getRebirthBaseValueBonus(rebirthLevel, afterlifeLevel)
  );
}

/**
 * 数值重置丹账本：该功法被重置掉的等级（未使用过则为 0）。
 * 这部分等级不再参与「升级消耗」的计算，但效果照旧计入。
 */
export function getValueResetKeptLevel(state: GameState, id: UpgradeId): number {
  const lv = state.valueResetLevels?.[id];
  return Number.isFinite(lv) && lv > 0 ? Math.floor(lv) : 0;
}

/**
 * 永劫重置丹账本：该属性在永劫殿被重置掉的等级（效果照旧计入）。
 */
export function getRebirthResetKeptLevel(state: GameState, id: UpgradeId): number {
  const lv = state.rebirthResetLevels?.[id];
  return Number.isFinite(lv) && lv > 0 ? Math.floor(lv) : 0;
}

/**
 * 永劫殿某属性的「有效等级」 = 当前等级 + 永劫重置丹保留的等级。
 * 效果按有效等级计算（用丹后效果不丢），升级消耗与等级上限仍按当前等级计算。
 */
export function getEffectiveRebirthLevel(state: GameState, id: UpgradeId): number {
  return (state.rebirthMergedLevels?.[id] || 0) + getRebirthResetKeptLevel(state, id);
}

/**
 * 某功法在数值殿的「有效等级」= 当前等级 + 数值重置丹保留的等级。
 * - 效果按有效等级计算（用丹后效果不丢）
 * - 升级消耗与等级上限仍按当前等级计算（消耗从初始曲线重新开始）
 */
export function getEffectiveUpgradeLevel(state: GameState, id: UpgradeId): number {
  const current = state.upgrades?.[id]?.level || 0;
  return current + getValueResetKeptLevel(state, id);
}

/**
 * 「永劫殿·基础数值」每级提升量（线性 +2）：
 * 每级固定 +2，累计加成随等级线性增长（与数值殿加成累加）；
 * 受往生殿「数值升级」基础倍数放大（未购买时倍数为 1）
 */
export function getRebirthBaseValueGain(level: number, afterlifeLevel: number = 0): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(0, 0);
  const gain = new BigNum(2, 0);
  const mult = getAfterlifeBaseValueMultiplier(afterlifeLevel);
  return mult === 1 ? gain : gain.mulScalar(mult);
}

/**
 * 「永劫殿·基础数值」累计加成：每级 +2，共 2 × level（线性），
 * 再乘以往生殿「数值升级」基础倍数（未购买时倍数为 1）
 */
export function getRebirthBaseValueBonus(level: number, afterlifeLevel: number = 0): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return new BigNum(0, 0);
  const bonus = new BigNum(2 * lv, 0);
  const mult = getAfterlifeBaseValueMultiplier(afterlifeLevel);
  return mult === 1 ? bonus : bonus.mulScalar(mult);
}

/**
 * 「永劫殿·基础数值」升级消耗：前两级各 1，此后每级持续 +2（等差）
 * 即 1, 1, 3, 5, 7, 9 ...
 */
export function getRebirthBaseValueCost(currentLevel: number): BigNum {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  if (lv < 2) return new BigNum(1, 0);
  return new BigNum(2 * lv - 1, 0);
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
    requiredClicks: 50,
    baseUnlockCost: 100,
  },
  critChance: {
    name: '暴击概率',
    requiredClicks: 100,
    baseUnlockCost: 800,
  },
  comboMultiplier: {
    name: '连击倍数',
    requiredClicks: 100,
    baseUnlockCost: 400,
  },
  critMultiplier: {
    name: '暴击倍数',
    requiredClicks: 200,
    baseUnlockCost: 200,
  },
};

/** 坍缩所需消耗的永劫点数 */
export const COLLAPSE_COST = 5;

/**
 * 渡劫：于往生殿「天雷峰」每次渡劫消耗的往生点（正式值为 10000）。
 * ⚠️ 当前临时置 0，仅供测试；测试完成后请改回 10000。
 */
export const TRIBULATION_COST = 0;
/** 每颗渡劫丹所需的往生点 */
export const TRIBULATION_PILL_COST = 300;
/** 渡劫次数上限：无论成败均计一次，累计渡劫 9 次后不可再渡 */
export const TRIBULATION_MAX_COUNT = 9;
/**
 * 渡劫成功后：数值殿 / 永劫殿每升 1 级另需消耗的「渡劫点」数量。
 * 未渡劫成功时渡劫殿尚未开启，故不消耗。
 */
export const UPGRADE_TRIBULATION_POINT_COST = 1;
/** 一次渡劫需要承受的雷劫道数 */
export const TRIBULATION_STRIKE_COUNT = 9;
/** 每道雷劫之间的间隔（ms） */
export const TRIBULATION_STRIKE_INTERVAL_MS = 3000;
/** 无渡劫丹时，单道雷劫的通过率 */
export const TRIBULATION_STRIKE_CHANCE = 0.5;

/** 渡劫殿：炼制一炉「数值重置丹」的耗时基数（ms）—— 一分钟 */
export const VALUE_RESET_PILL_BASE_MS = 60 * 1000;
/** 渡劫殿：炼制一炉「永劫重置丹」的耗时基数（ms）—— 三分钟 */
export const REBIRTH_RESET_PILL_BASE_MS = 3 * 60 * 1000;
/** 渡劫殿：炼制进度推进节拍（ms），同时也是进度条的数据刷新间隔 */
export const RESET_PILL_TICK_MS = 1_000;
/** 渡劫殿：产出 1 点「渡劫点」的间隔（ms） */
export const TRIBULATION_POINT_INTERVAL_MS = 10_000;
/** 渡劫殿：自动结算「永劫点」的起始间隔（ms） */
export const AUTO_REBIRTH_BASE_INTERVAL_MS = 30_000;
/** 渡劫殿：每结算一次「永劫点」，下一次的间隔增量（ms） */
export const AUTO_REBIRTH_INTERVAL_STEP_MS = 5_000;
/** 渡劫殿：自动结算「永劫点」的间隔上限（ms）——最多三分钟产出一次 */
export const AUTO_REBIRTH_INTERVAL_MAX_MS = 180_000;

/**
 * 渡劫殿：自动结算「永劫点」的间隔。
 * 起始 30s，每产出一次 +5s，180s（3 分钟）封顶。
 * @param settledTimes 已自动结算的次数
 */
export function getAutoRebirthIntervalMs(settledTimes: number): number {
  const n = Number.isFinite(settledTimes) && settledTimes > 0 ? Math.floor(settledTimes) : 0;
  const ms = AUTO_REBIRTH_BASE_INTERVAL_MS + n * AUTO_REBIRTH_INTERVAL_STEP_MS;
  return Math.min(ms, AUTO_REBIRTH_INTERVAL_MAX_MS);
}

/**
 * 渡劫殿：炼制一炉重置丹的耗时（恒定，不随炼制次数累加）。
 * 数值重置丹 1 分钟；永劫重置丹 3 分钟。
 */
export function getResetPillDurationMs(pill: 'value' | 'rebirth'): number {
  return pill === 'rebirth' ? REBIRTH_RESET_PILL_BASE_MS : VALUE_RESET_PILL_BASE_MS;
}

/** 渡劫（渡劫次数 +1）所需的往生点：恒定 1 万 */
export function getTribulationCost(_currentLevel: number): number {
  return TRIBULATION_COST;
}

/**
 * 单道雷劫的通过率：持有渡劫丹则必定通过（100%），否则 50%
 */
export function getTribulationStrikeChance(hasPill: boolean): number {
  return hasPill ? 1 : TRIBULATION_STRIKE_CHANCE;
}

/**
 * 一次渡劫的整体通过率 = 9 道雷劫全部通过的概率。
 * 前 s 道由渡劫丹保过（s = 丹药数与 9 道的较小值），其余每道仅 50%，
 * 故整体通过率 = 0.5^(9 − s)。
 * 例：3 颗丹 → 前 3 道必过，后 6 道须各自赌一次 → 0.5^6 = 1.5625%
 */
export function getTribulationSuccessChance(pillStock: number): number {
  const stock = Number.isFinite(pillStock) && pillStock > 0 ? Math.floor(pillStock) : 0;
  const guaranteed = Math.min(stock, TRIBULATION_STRIKE_COUNT);
  return Math.pow(TRIBULATION_STRIKE_CHANCE, TRIBULATION_STRIKE_COUNT - guaranteed);
}

/** 一次渡劫的结算过程 */
export interface TribulationOutcome {
  /** 每道雷劫是否通过（失败即终止，长度 ≤ 9） */
  strikes: boolean[];
  /** 9 道雷劫是否全部通过 */
  success: boolean;
  /** 本次消耗的渡劫丹数量（每道雷劫可消耗 1 颗保过） */
  pillsUsed: number;
}

/**
 * 结算一次渡劫：连续降下 9 道雷劫，每道 3 秒一道（由展示层按节奏揭示）。
 * - 单道通过率：持有渡劫丹 → 100%（并消耗 1 颗）；否则 50%
 * - 任一道未通过 → 本次渡劫失败，直接终止（不再降后续雷劫）
 */
export function resolveTribulation(pillStock: number): TribulationOutcome {
  const stock = Number.isFinite(pillStock) && pillStock > 0 ? Math.floor(pillStock) : 0;
  const strikes: boolean[] = [];
  let pillsUsed = 0;
  let success = true;

  for (let i = 0; i < TRIBULATION_STRIKE_COUNT; i++) {
    const hasPill = pillsUsed < stock;
    const passed = Math.random() < getTribulationStrikeChance(hasPill);
    if (hasPill) pillsUsed += 1;
    strikes.push(passed);
    if (!passed) {
      success = false;
      break;
    }
  }

  return { strikes, success, pillsUsed };
}

/**
 * 渡劫作用：单次收益 = 原值 ^ 渡劫次数
 * - 渡劫次数为 0（尚未成功）或 1 时保持原值不变：绝不做 原值 ^ 0 = 1 这类会打崩数值的运算
 * 例：单次点击值 10、渡劫次数 3 → 10³ = 1000
 */
export function applyTribulation(value: BigNum, tribulationTimes: number): BigNum {
  const times =
    Number.isFinite(tribulationTimes) && tribulationTimes > 0 ? Math.floor(tribulationTimes) : 0;
  return times <= 1 ? value : value.pow(times);
}

/** 渡劫次数（0~9）对应的次方指数：未成功（0 次）时按 1 计，即不参与计算 */
export function getTribulationExponent(tribulationTimes: number): number {
  const times =
    Number.isFinite(tribulationTimes) && tribulationTimes > 0 ? Math.floor(tribulationTimes) : 0;
  return Math.min(TRIBULATION_MAX_COUNT, Math.max(1, times));
}

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

/** 每次永劫永久提升的数值上限（100 万，永久保留） */
export const REBIRTH_CAP_BONUS = 1e6;

/**
 * 永劫带来的上限加成：累计永劫次数 × 100 万（永久保留，永不清零）
 */
export function getRebirthCapBonus(rebirthCount: number): BigNum {
  const n = Number.isFinite(rebirthCount) && rebirthCount > 0 ? Math.floor(rebirthCount) : 0;
  return new BigNum(n * REBIRTH_CAP_BONUS, 0);
}

/**
 * 数值上限：默认 100 万 + 坍缩殿每级提升量（斐波那契式递增）+ 永劫加成（每次永劫 +100 万）
 * = 100万 + Σ(每级提升量) + 永劫次数 × 100万
 */
export function getValueCap(level: number, rebirthCount: number = 0): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  let total = new BigNum(VALUE_CAP_BASE, 0);
  for (let k = 1; k <= lv; k++) {
    total = total.add(getValueCapStep(k));
  }
  return total.add(getRebirthCapBonus(rebirthCount));
}

/**
 * 购买第 level 级（level 从 1 起）数值上限所需的坍缩点数：线性 +1
 *   即：1、2、3、4、5 ...
 */
export function getValueCapCost(level: number): BigNum {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  return new BigNum(lv, 0);
}

/**
 * 永劫商殿：单独升级某项永劫基础属性的消耗（永劫点数）
 * - 自动点击频率：消耗始终为 1 点
 * - 其余属性：等差数列递增（差值 1），第 n 次购买消耗 n 点（1, 2, 3, 4 ...）
 * 消耗依据当前升级等级（即已购买次数）计算。
 */
export function getRebirthMergedUpgradeCost(id: UpgradeId, level: number): BigNum {
  // 自动点击频率：永劫殿升级消耗始终为 1 点
  if (id === 'autoFrequency') return new BigNum(1, 0);
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return new BigNum(lv + 1, 0);
}

/** 连击概率: 每级 +5%（0.05），上限 100% */
export const COMBO_CHANCE_STEP = 0.05;
/** 暴击概率: 基础 5%，每级 +1%（0.01），上限 100%（两殿通用步长） */
export const CRIT_CHANCE_BASE = 0.05;
export const CRIT_CHANCE_STEP = 0.01;

/** 暴击倍数: 默认基数 5%（0.05），升级/成就/永劫殿加成在此之上累加 */
export const CRIT_MULT_BASE = 0.05;

/** 暴击倍数 / 连击倍数: 每次升级 +30% */
export const MULTIPLIER_STEP = 0.3;

/** 所有功法的默认等级上限 */
export const BASE_MAX_LEVEL = 20;
/** 每消耗 1 点永劫点数，可提升的等级上限 */
export const LEVEL_CAP_PER_POINT = 50;

/**
 * 永劫殿某属性是否已达「永劫殿自身」的效果上限（上限类属性：概率 / 频率）。
 * 仅用于永劫殿升级面板隐藏已满项；数值殿不再使用它——
 * 数值殿概率上限已改为按「100% − 永劫殿同属性概率」动态计算（见 getUpgradeMaxLevel）。
 * - 自动点击频率: 永劫殿独立 20 级满级，间隔已至下限 10ms
 * - 连击概率: 每级 +5%，20 级即 100%
 * - 暴击概率: 基础 5% + 每级 +1%，95 级即 100%
 * 其余属性无此类效果上限，恒返回 false。
 */
export function isRebirthEffectCapped(id: UpgradeId, rebirthLevel: number): boolean {
  const lv = Number.isFinite(rebirthLevel) && rebirthLevel > 0 ? Math.floor(rebirthLevel) : 0;
  if (id === 'autoFrequency') return lv >= AUTO_FREQ_MAX_LEVEL;
  if (id === 'comboChance') return lv * COMBO_CHANCE_STEP >= 1.0;
  if (id === 'critChance') return CRIT_CHANCE_BASE + lv * CRIT_CHANCE_STEP >= 1.0;
  return false;
}

/**
 * 某功法在「数值殿」当前的等级上限
 * - 自动点击: 不可升级，上限恒为 0
 * - 自动点击频率: 固定 20 级满级，不随等级上限特权扩展
 * - 连击概率: 上限 = 100% − 永劫殿连击概率（两殿合计不溢出 100%）
 * - 暴击概率: 上限 = 100% − 基础暴击率 − 永劫殿暴击概率
 * - 其余: 默认 20 级 + 坍缩殿购买的次数 × 50 级
 * @param rebirthLevel 永劫殿中该属性的独立等级（概率类必须传入，否则上限按永劫殿 0 级计）
 */
export function getUpgradeMaxLevel(
  id: UpgradeId,
  up: UpgradeState,
  rebirthLevel: number = 0
): number {
  if (id === 'autoClickUnlock') return 0; // 自动点击不可升级
  if (id === 'autoFrequency') return BASE_MAX_LEVEL; // 频率固定 20 级满级

  const rb = Number.isFinite(rebirthLevel) && rebirthLevel > 0 ? Math.floor(rebirthLevel) : 0;

  // 概率类：上限 = 补满至 100% 所需的剩余等级（永劫殿已提供的部分不计入数值殿）
  if (id === 'comboChance') {
    return Math.max(0, Math.round((1 - rb * COMBO_CHANCE_STEP) / COMBO_CHANCE_STEP));
  }
  if (id === 'critChance') {
    return Math.max(
      0,
      Math.round((1 - CRIT_CHANCE_BASE - rb * CRIT_CHANCE_STEP) / CRIT_CHANCE_STEP)
    );
  }
  return BASE_MAX_LEVEL + (up.capBonus || 0) * LEVEL_CAP_PER_POINT;
}

/**
 * 升级消耗值:
 * - 各项功法升级消耗为等差数列（差值 1），第 n 次升级消耗 n 点（1, 2, 3, 4 ...）
 * - 自动点击: 不可升级
 */
/** 该功法是否已臻圆满（达到等级上限，或功能性到顶） */
export function isUpgradeMaxed(
  id: UpgradeId,
  up: UpgradeState,
  rebirthLevel: number = 0
): boolean {
  if (!up.unlocked) return false;

  const maxLevel = getUpgradeMaxLevel(id, up, rebirthLevel);
  if (getUpgradeCost(id, up.level, maxLevel) === null) return true;

  // 功能性上限：即便还能买等级，效果也已达顶点
  if (id === 'autoFrequency') {
    // 已达最快间隔（10ms 一次），再快已无意义
    return getAutoClickRate(up.level).intervalMs <= AUTO_FREQ_INTERVAL_MIN;
  }
  return false;
}

/**
 * 自动点击频率：升级消耗为斐波那契数列 × 10（初始 10，提高升级代价）
 * 第 n 次（n 从 1 起）消耗 10 × F(n+1) 点，即 10, 20, 30, 50, 80 ...
 */
export function getAutoFrequencyUpgradeCost(currentLevel: number): BigNum {
  const n = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) + 1 : 1;
  return getFibonacciBig(n + 1).mulScalar(10);
}

/**
 * 往生殿：各属性的「强化」特权（仅作用于永劫殿，不再降低消耗）
 * - 直接放大永劫殿对应属性的基础倍数（即其累计加成）
 * - 每级消耗（往生点）为斐波那契数列：1、1、2、3、5、8 …（各属性一致）
 * - 未购买（Lv.0）时倍数为 1（无影响）
 */

/**
 * 「数值升级」的强化倍数（类斐波那契）：5、7、12、19、31 …（每级 = 前两级之和）
 */
const AFTERLIFE_BASE_VALUE_MULT_SEQ: number[] = [5, 7];
export function getAfterlifeBaseValueMultiplier(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 1;
  while (AFTERLIFE_BASE_VALUE_MULT_SEQ.length < lv) {
    const len = AFTERLIFE_BASE_VALUE_MULT_SEQ.length;
    AFTERLIFE_BASE_VALUE_MULT_SEQ.push(
      AFTERLIFE_BASE_VALUE_MULT_SEQ[len - 1] + AFTERLIFE_BASE_VALUE_MULT_SEQ[len - 2]
    );
  }
  return AFTERLIFE_BASE_VALUE_MULT_SEQ[lv - 1];
}

/**
 * 其余属性（连击倍数 / 暴击倍数）的强化倍数：线性递增
 * 即 2、3、4、5、6 …（等级 + 1；未购买时为 1，无影响）
 */
export function getAfterlifeAttributeMultiplier(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return lv + 1;
}

/** 按属性取往生殿强化倍数（统一入口）：数值升级走类斐波那契，其余走线性 */
export function getAfterlifeUpgradeMultiplier(id: UpgradeId, level: number): number {
  return id === 'baseValue'
    ? getAfterlifeBaseValueMultiplier(level)
    : getAfterlifeAttributeMultiplier(level);
}

/** 购买后等级（currentLevel + 1）的强化倍数 */
export function getAfterlifeNextUpgradeMultiplier(id: UpgradeId, currentLevel: number): number {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  return getAfterlifeUpgradeMultiplier(id, lv + 1);
}

/**
 * 往生殿购买第 (currentLevel+1) 级所需往生点：斐波那契数列（从 1 起）
 * 即 1、1、2、3、5、8 …（第 1、2 级各 1，此后每级 = 前两级之和）；各属性消耗一致
 */
export function getAfterlifeUpgradeCost(currentLevel: number): number {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  return getFibonacci(lv + 1);
}

/** 往生殿「永劫点上限」：未升级时的基础上限 */
export const REBIRTH_POINTS_BASE_CAP = 100;
/** 往生殿「永劫点上限」：第 1 级的提升量 */
export const REBIRTH_POINTS_CAP_STEP_BASE = 100;
/** 往生殿「永劫点上限」：每级提升量的线性增量（第 n 级 = 100 + (n−1) × 10） */
export const REBIRTH_POINTS_CAP_STEP_GROWTH = 10;

/**
 * 往生殿：「永劫点上限」特权
 * - 只限制「每次永劫所得」的点数上限；永劫点的持有量没有上限
 * - 每级提升量线性递增：100、110、120、130、140、150 …
 * - 每级消耗（往生点）为等差数列（差值 1）：1、2、3、4、5 …
 */
/** 购买第 (currentLevel+1) 级所需往生点：等差数列，即 1, 2, 3, 4, 5 … */
export function getRebirthCapUpgradeCost(currentLevel: number): number {
  const lv = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 0;
  return lv + 1;
}

/** 第 n 级的提升量（线性）：100、110、120、130 … */
export function getRebirthCapStep(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  if (lv <= 0) return 0;
  return REBIRTH_POINTS_CAP_STEP_BASE + (lv - 1) * REBIRTH_POINTS_CAP_STEP_GROWTH;
}

/**
 * 当前永劫点获取上限：基础 100 + Σ(每级提升量)
 * 即 100、200、310、430、560、700、850 …（每级增量分别为 100、110、120、130、140、150）
 */
export function getRebirthPointsCap(level: number): number {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  return (
    REBIRTH_POINTS_BASE_CAP +
    REBIRTH_POINTS_CAP_STEP_BASE * lv +
    (REBIRTH_POINTS_CAP_STEP_GROWTH * lv * (lv - 1)) / 2
  );
}

/**
 * 渡劫殿「自动永劫结算」本次可得的永劫点数：
 * 复用永劫结算公式（数值 ÷ 100 万 + 永劫爆炸加成，再按永劫点上限封顶），
 * 但只加算点数，不清除任何数据（数值 / 等级 / 点击量一律保留）。
 */
export function getAutoRebirthPoints(value: BigNum, state: GameState): number {
  const gain =
    getRebirthPointsFromValue(value) +
    getExtraRebirthPoints(state.rebirthPointLevel || 0, value);
  const cap = getRebirthPointsCap(state.rebirthCapLevel || 0);
  return Math.max(0, Math.min(gain, cap));
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

  // 初始消耗 10，之后倍增：10 × 2^currentLevel（10, 20, 40, 80, 160 ...）
  return pow2(currentLevel).mulScalar(10);
}

/**
 * 两殿频率效果累加（单一计算入口）：
 * 数值殿与永劫殿各自独立计级、互不影响（各 20 级满级，各存各的等级），
 * 总间隔 = 1000ms −（数值殿等级 + 永劫殿等级）× 49.5ms，下限 10ms（100次/s）
 */
export function getCombinedAutoIntervalMs(shopLevel: number, rebirthLevel: number): number {
  const shop = Number.isFinite(shopLevel) && shopLevel > 0 ? Math.floor(shopLevel) : 0;
  const rb = Number.isFinite(rebirthLevel) && rebirthLevel > 0 ? Math.floor(rebirthLevel) : 0;
  return Math.max(
    AUTO_FREQ_INTERVAL_MIN,
    AUTO_FREQ_INTERVAL_BASE - (shop + rb) * AUTO_FREQ_INTERVAL_STEP
  );
}

/**
 * 自动点击频率: 初始 1次/1000ms，每级缩短 49.5ms，20 级升满至 10ms 一次（100次/s）
 * - 数值殿与永劫殿各自独立计级（各 20 级满级），计算时两殿效果累加，见 getCombinedAutoIntervalMs
 */
export const AUTO_FREQ_INTERVAL_BASE = 1000;
/** 最快间隔：10ms 一次（100次/s） */
export const AUTO_FREQ_INTERVAL_MIN = 10;
/** 满级级数：20 级升满 */
export const AUTO_FREQ_MAX_LEVEL = 20;
/** 每级缩短的间隔：(1000 − 10) / 20 = 49.5ms */
export const AUTO_FREQ_INTERVAL_STEP =
  (AUTO_FREQ_INTERVAL_BASE - AUTO_FREQ_INTERVAL_MIN) / AUTO_FREQ_MAX_LEVEL;

export interface AutoClickRate {
  intervalMs: number; // 触发间隔（ms）
  /** 每毫秒点击次数：恒为 0（已取消每毫秒多次点击的极速态） */
  clicksPerMs: number;
  clicksPerSec: number;
}

export function getAutoClickRate(level: number): AutoClickRate {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
  const intervalMs = Math.max(
    AUTO_FREQ_INTERVAL_MIN,
    AUTO_FREQ_INTERVAL_BASE - lv * AUTO_FREQ_INTERVAL_STEP
  );
  return { intervalMs, clicksPerMs: 0, clicksPerSec: AUTO_FREQ_INTERVAL_BASE / intervalMs };
}



/**
 * Calculate all live attributes for display and math
 */
export function calculateGameAttributes(state: GameState) {
  const autoClickUp = state.upgrades.autoClickUnlock;
  const autoFreqUp = state.upgrades.autoFrequency;
  const comboChanceUp = state.upgrades.comboChance;
  const critMultUp = state.upgrades.critMultiplier;
  const comboMultUp = state.upgrades.comboMultiplier;
  const critChanceUp = state.upgrades.critChance;

  // 0. 数值殿与永劫殿的「数值升级」完全独立：
  //    数值殿等级（upgrades.baseValue.level）随转世清零；永劫殿等级（rebirthBaseValueLevel）永久保留

  // 1. 基础数值 = 默认值 + 「数值升级」累计加成
  //    （加成由 getBaseValueUpgradeBonus 统一计算：数值殿 + 永劫殿 × 往生殿倍数）
  const baseValueUpgradeBonus = getBaseValueUpgradeBonus(state);
  const baseValue = new BigNum(BASE_VALUE_INITIAL, 0).add(baseValueUpgradeBonus);

  // 2. 数值倍率
  const valueMultiplier = state.baseValueMultiplier;

  // 永劫殿各属性的独立等级（永久道基），与数值殿分开计级，效果在下方逐项累加
  // 含永劫重置丹保留的等级：用丹后消耗从初始曲线重算，但效果照旧计入

  // 3. 自动点击频率：数值殿与永劫殿独立计级、互不影响，效果累加（须已解锁自动点击）
  let autoClicksPerSec = 0;
  let autoIntervalMs = AUTO_FREQ_INTERVAL_BASE;
  let autoClicksPerMs = 0;

  if (autoClickUp.unlocked) {
    const autoFreqLevel = autoFreqUp.unlocked ? autoFreqUp.level : 0;
    const rbAutoFreqLevel = getEffectiveRebirthLevel(state, 'autoFrequency');
    autoIntervalMs = getCombinedAutoIntervalMs(autoFreqLevel, rbAutoFreqLevel);
    autoClicksPerSec = AUTO_FREQ_INTERVAL_BASE / autoIntervalMs;
  }

  // 4. 连击概率: 数值殿每级 +5% + 永劫殿每级 +5%，上限 100%
  const rbComboChanceLevel = getEffectiveRebirthLevel(state, 'comboChance');
  let comboChance = Math.min(
    1.0,
    (comboChanceUp.unlocked ? comboChanceUp.level * COMBO_CHANCE_STEP : 0) +
      rbComboChanceLevel * COMBO_CHANCE_STEP
  );

  // 5. 连击倍数: 基础 100% + 数值殿每级 +30% + 永劫殿每级 +30% × 往生殿强化倍数
  const rbComboMultLevel = getEffectiveRebirthLevel(state, 'comboMultiplier');
  const afterlifeComboMult = getAfterlifeUpgradeMultiplier(
    'comboMultiplier',
    state.afterlifeUpgradeLevels?.comboMultiplier || 0
  );
  let comboMultiplier =
    1.0 +
    (comboMultUp.unlocked ? comboMultUp.level * MULTIPLIER_STEP : 0) +
    rbComboMultLevel * MULTIPLIER_STEP * afterlifeComboMult;

  // 6. 暴击倍数: 默认 5% + 成就奖励 + 数值殿每级 +30% + 永劫殿每级 +30% × 往生殿强化倍数
  const achievementCritBonus = getAchievementCritBonus(state);
  const rbCritMultLevel = getEffectiveRebirthLevel(state, 'critMultiplier');
  const afterlifeCritMult = getAfterlifeUpgradeMultiplier(
    'critMultiplier',
    state.afterlifeUpgradeLevels?.critMultiplier || 0
  );
  let critMultiplier =
    CRIT_MULT_BASE +
    achievementCritBonus +
    (critMultUp.unlocked ? critMultUp.level * MULTIPLIER_STEP : 0) +
    rbCritMultLevel * MULTIPLIER_STEP * afterlifeCritMult;

  // 7. 暴击概率: 基础暴击率 + 数值殿每级 +1% + 永劫殿每级 +1%，上限 100%
  const rbCritChanceLevel = getEffectiveRebirthLevel(state, 'critChance');
  let critChance = Math.min(
    1.0,
    state.baseCritRate +
      (critChanceUp.unlocked ? critChanceUp.level * CRIT_CHANCE_STEP : 0) +
      rbCritChanceLevel * CRIT_CHANCE_STEP
  );

  // 8. 永劫点数
  const rebirthPoints = state.rebirthPoints;

  // 9. 坍缩
  const collapsePoints = state.collapsePoints;

  // 11. 点击次数：本世（用于解锁功法） / 累计（用于解锁成就）
  const clickCount = state.clickCount;
  const totalClickCount = state.totalClickCount || 0;

  // 12. 成就奖励累计出的永劫初始数值（与其他数值累加）
  const rebirthStartValue = getRebirthStartValue(state);

  // 13. 「永劫爆炸」带来的额外永劫点数（每 100 万数值 +0.2 × 等级）
  const rebirthPointBonus = getRebirthPointBonusPerMillion(state.rebirthPointLevel || 0);

  // 14. 渡劫次数（成败均计，上限 9）：单次收益取原值的 N 次方
  //     0 次（尚未成功）时指数按 1 计，即次方不参与计算，避免 原值 ^ 0 = 1 打崩数值
  const tribulationExponent = getTribulationExponent(state.tribulationCount || 0);

  return {
    baseValue,
    /** 「数值升级」累计加成（数值殿 × 往生殿倍数 + 永劫殿） */
    baseValueUpgradeBonus,
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
    /** 渡劫次方指数（0 次时为 1，即不参与计算） */
    tribulationExponent,
    achievementCritBonus,
    playTimeMs: state.playTimeMs || 0,
  };
}

/**
 * 概率类属性是否已封顶（隐藏条件）：以「数值殿 + 永劫殿」的合计概率为准。
 * 达到或超过 100% 即视为封顶——两殿再升任一处都已无效果，永劫殿该项直接隐藏。
 * 非概率类恒返回 false。
 */
export function isChanceCapped(
  attrs: ReturnType<typeof calculateGameAttributes>,
  id: UpgradeId
): boolean {
  if (id === 'critChance') return attrs.critChance >= 1.0;
  if (id === 'comboChance') return attrs.comboChance >= 1.0;
  return false;
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
  // 与 executeClickCalculation 保持一致：连击 / 暴击互斥，暴击优先
  const critChance = Math.min(1, attrs.critChance);
  const comboChance = Math.max(0, Math.min(attrs.comboChance, 1 - critChance));
  const factor =
    attrs.valueMultiplier +
    critChance * attrs.critMultiplier +
    comboChance * attrs.comboMultiplier;
  // 渡劫：单次收益整体取「渡劫次数」次方（0 次时为 1，保持原值）
  return applyTribulation(attrs.baseValue.mulScalar(factor), attrs.tribulationExponent);
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
 * 连击与暴击互斥：单次点击只会触发其一（暴击优先）
 * 与永劫点数、坍缩点数无关
 * 自动点击与用户点击共享一个算法
 */
export function executeClickCalculation(state: GameState): ClickResult {
  const attrs = calculateGameAttributes(state);

  // 1. 单次点击只会触发其一：连击与暴击互斥（暴击优先，连击占用剩余区间）
  const roll = Math.random();
  const isCrit = roll < attrs.critChance;
  const isCombo = !isCrit && roll < attrs.critChance + attrs.comboChance;

  // 2. 计算基础累加项
  // 基础数值*数值倍率 + 基础数值*连击倍数(判断触发) + 基础数值*暴击倍数(判断触发)
  let factor = attrs.valueMultiplier;

  if (isCombo) {
    factor += attrs.comboMultiplier;
  }
  if (isCrit) {
    factor += attrs.critMultiplier;
  }

  // 渡劫：单次收益整体取「渡劫次数」次方（0 次时为 1，保持原值）
  const gainedValue = applyTribulation(attrs.baseValue.mulScalar(factor), attrs.tribulationExponent);

  return {
    isCrit,
    isCombo,
    gainedValue,
  };
}
