import { GameState } from '../types';
import { CHINESE_UNITS } from './bigNumber';

/**
 * 称号系统：按「历世最高数值」的量级自动达成，永不清零、无需购买。
 * - 每 3 位单位组成一个修仙境界（不细分上/中/下）：
 *   亿 = 炼气，垓 = 筑基，沟 = 金丹，载 = 元婴，阿 = 化神，无 = 炼虚，宇 = 合体，蒙 = 大乘
 * - 1 亿以下：凡人
 * - 登顶（超过「古」10^100，即最后一位单位）后，境界名仿数字格式化的组合单位延伸，
 *   每 10^4 一个新境界：万古、亿古、兆古……太古（最高单前缀），
 *   其后前缀翻倍循环：万万古、亿亿古、兆兆古……太太古、万万万古……无限叠加
 * - 每个境界一枚基础色相；登顶后的无限境界按序号做色相偏移
 */

const MORTAL_COLOR = '#6b6455';
/** 第一个境界「炼气」的起始指数：亿 = 10^8（CHINESE_UNITS 下标 2） */
const FIRST_REALM_EXP = 8;
/** 第一位单位的 CHINESE_UNITS 下标（亿） */
const FIRST_UNIT_INDEX = 2;
/** 最后一位单位的 CHINESE_UNITS 下标（古 = 10^100） */
const LAST_UNIT_INDEX = 25;

/** 修仙境界表：每 3 位单位一个境界（亿~古 共 24 位 → 8 个境界） */
const REALMS = [
  '炼气', // 亿 / 兆 / 京
  '筑基', // 垓 / 秭 / 穰
  '金丹', // 沟 / 涧 / 正
  '元婴', // 载 / 极 / 恒
  '化神', // 阿 / 那 / 议
  '炼虚', // 无 / 大 / 全
  '合体', // 宇 / 宙 / 洪
  '大乘', // 蒙 / 太 / 古（顶点，登顶后无限叠加）
];

/** 各境界基础色相（与 REALMS 一一对应） */
const REALM_HUES = [
  120, // 炼气：绿
  205, // 筑基：蓝
  45, // 金丹：金
  265, // 元婴：紫
  320, // 化神：粉
  170, // 炼虚：青
  30, // 合体：橙
  0, // 大乘：红
];

/** 每个境界占用的单位数（3 个单位，共 12 个数量级） */
const UNITS_PER_REALM = 3;
/** 每个境界跨越的数量级 */
const EXP_PER_REALM = UNITS_PER_REALM * 4;
/** 境界名的统一明度 */
const REALM_LIGHTNESS = 60;

export interface TitleInfo {
  /** 称号名（境界名，如「炼气」「万古」「凡人」） */
  name: string;
  /** 称号专属颜色（可直接用于 style.color） */
  color: string;
  /** 是否为登顶后的无限境界 */
  infinite: boolean;
  /** 无限境界的境数（infinite 时有意义） */
  stageNum: number;
}

/** 称号阶梯中的一档境界（用于时间线展示） */
export interface TitleRank {
  /** 境界名（如「炼气」「万古」「凡人」） */
  name: string;
  /** 该境界的专属颜色 */
  color: string;
  /** 达成该境界所需的最低指数（10 的幂）；凡人为 null */
  requiredExponent: number | null;
  /** 是否为当前所处境界 */
  current: boolean;
  /** 是否已达成（当前境界及更低的境界） */
  achieved: boolean;
}

/** 时间线最多展示的档位数（登顶后境界无限延伸时向前裁剪） */
const MAX_TIMELINE_ENTRIES = 14;
/** 时间线默认在当前境界之后额外展示的档位数 */
const DEFAULT_AHEAD = 4;

/** 登顶后的无限境界命名（每 10^4 一个新境界，前缀按组合单位循环叠加） */
function infiniteRealmName(seq: number): string {
  const base = LAST_UNIT_INDEX - 1; // 可用前缀单位数（万~太 共 24 个）
  const k = seq - 1;
  const char = CHINESE_UNITS[1 + (k % base)];
  const reps = Math.floor(k / base) + 1;
  const prefix = char.repeat(reps);
  return prefix.length <= 32 ? `${prefix}古` : `${'太'.repeat(12)}古`;
}

/**
 * 当前所处的境界档位序号：
 * 0 = 凡人；1 ~ 8 = 常规境界（炼气 → 大乘）；9 起为登顶后的无限境界（9 = 万古）
 */
export function getTitleStageIndex(state: GameState): number {
  const m = state.highestValue?.m ?? 0;
  const e = state.highestValue?.e ?? 0;

  // 1 亿以下：凡人
  if (!(m > 0) || e < FIRST_REALM_EXP) return 0;

  const unitIndex = Math.floor(e / 4);

  // 登顶：超过「古」(10^100) 后，每 10^4 一个新境界
  if (unitIndex > LAST_UNIT_INDEX) {
    const seq = Math.floor((e - LAST_UNIT_INDEX * 4) / 4); // 「古」的倍数序号（1 = 万古）
    return REALMS.length + seq;
  }

  const clamped = Math.min(LAST_UNIT_INDEX, Math.max(FIRST_UNIT_INDEX, unitIndex));
  return Math.floor((clamped - FIRST_UNIT_INDEX) / UNITS_PER_REALM) + 1;
}

/** 由档位序号取该档境界的名称 / 颜色 / 达成门槛 */
function getRankByStageIndex(index: number): Omit<TitleRank, 'current' | 'achieved'> {
  if (index <= 0) {
    return { name: '凡人', color: MORTAL_COLOR, requiredExponent: null };
  }

  // 常规境界：每 3 位单位一档，不细分上 / 中 / 下
  if (index <= REALMS.length) {
    const realmIndex = index - 1;
    return {
      name: REALMS[realmIndex],
      color: `hsl(${REALM_HUES[realmIndex]}, 75%, ${REALM_LIGHTNESS}%)`,
      requiredExponent: FIRST_REALM_EXP + realmIndex * EXP_PER_REALM,
    };
  }

  // 无限境界：每 10^4 一档
  const seq = index - REALMS.length; // 1 = 万古
  return {
    name: infiniteRealmName(seq),
    color: `hsl(${(seq * 47) % 360}, 85%, 68%)`,
    requiredExponent: LAST_UNIT_INDEX * 4 + seq * 4,
  };
}

/**
 * 称号时间线：自「凡人」起、逐档向上，直到当前境界之后 ahead 档更强的境界。
 * - 常规区间（凡人 ~ 大乘）始终完整展示，凡人必定在列
 * - 登顶后境界无限延伸，超出 MAX_TIMELINE_ENTRIES 时从前往后裁剪
 */
export function getNearbyTitleRanks(state: GameState, ahead: number = DEFAULT_AHEAD): TitleRank[] {
  const extra = Number.isFinite(ahead) && ahead > 0 ? Math.floor(ahead) : DEFAULT_AHEAD;
  const current = getTitleStageIndex(state);
  const last = current + extra;
  const first = last + 1 <= MAX_TIMELINE_ENTRIES ? 0 : last - MAX_TIMELINE_ENTRIES + 1;

  const ranks: TitleRank[] = [];
  for (let idx = first; idx <= last; idx++) {
    ranks.push({
      ...getRankByStageIndex(idx),
      current: idx === current,
      achieved: idx < current,
    });
  }
  return ranks;
}

/** 由存档推导当前称号（自动达成，无需存储） */
export function getTitle(state: GameState): TitleInfo {
  const index = getTitleStageIndex(state);
  const rank = getRankByStageIndex(index);
  const infinite = index > REALMS.length;

  return {
    name: rank.name,
    color: rank.color,
    infinite,
    stageNum: infinite ? index - REALMS.length : 0,
  };
}

/** 排行·登顶门槛：须达到第一个境界「炼气」（最高数值 ≥ 1 亿） */
export function canAscendRank(state: GameState): boolean {
  const m = state.highestValue?.m ?? 0;
  const e = state.highestValue?.e ?? 0;
  return m > 0 && e >= FIRST_REALM_EXP;
}
