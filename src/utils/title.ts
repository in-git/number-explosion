import { GameState } from '../types';

/**
 * 称号系统：按「历世最高数值」的量级自动达成，永不清零、无需购买。
 * - 每 2 位单位组成一个修仙境界（不细分上/中/下）：
 *   亿 = 炼气，京 = 筑基，秭 = 金丹，沟 = 元婴，正 = 化神，极 = 炼虚，阿 = 合体，
 *   议 = 大乘，大 = 渡劫，宇 = 真仙，洪 = 金仙，太 = 大罗
 * - 1 亿以下：凡人
 * - 超出最后一位单位「古」(10^100) 即登顶（对应末位境界「大罗」），
 *   此后每 10^6 一个新境界：大罗1境、大罗2境、大罗3境……无上限
 * - 每个境界一枚基础色相；登顶后的无限境界按序号做色相偏移
 */

const MORTAL_COLOR = '#6b6455';
/** 第一个境界「炼气」的起始指数：亿 = 10^8（CHINESE_UNITS 下标 2） */
const FIRST_REALM_EXP = 8;
/** 第一位单位的 CHINESE_UNITS 下标（亿） */
const FIRST_UNIT_INDEX = 2;
/** 最后一位单位的 CHINESE_UNITS 下标（古 = 10^100） */
const LAST_UNIT_INDEX = 25;
/** 超出「大罗」后每 10^6 一个境界 */
const INFINITE_EXP_STEP = 6;
/** 第一个无限境界「大罗1境」的起始指数（越过「古」这一档，即 10^104） */
const INFINITE_BASE_EXP = LAST_UNIT_INDEX * 4 + 4;

/** 修仙境界表：每 2 位单位一个境界（亿~古 共 24 位 → 12 个境界） */
const REALMS = [
  '炼气', // 亿 / 兆
  '筑基', // 京 / 垓
  '金丹', // 秭 / 穰
  '元婴', // 沟 / 涧
  '化神', // 正 / 载
  '炼虚', // 极 / 恒
  '合体', // 阿 / 那
  '大乘', // 议 / 无
  '渡劫', // 大 / 全
  '真仙', // 宇 / 宙
  '金仙', // 洪 / 蒙
  '大罗', // 太 / 古（顶点，登顶后无限叠加）
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
  350, // 渡劫：赤
  90, // 真仙：黄绿
  240, // 金仙：靛蓝
  300, // 大罗：紫红
];

/** 每个境界占用的单位数（2 个单位，共 8 个数量级） */
const UNITS_PER_REALM = 2;
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
/** 需容纳「凡人 + 12 个常规境界 + ahead」，故取 18 以保证常规区间不被裁剪 */
const MAX_TIMELINE_ENTRIES = 18;
/** 时间线默认在当前境界之后额外展示的档位数 */
const DEFAULT_AHEAD = 4;

/** 超出「大罗」后的无限境界命名：大罗1境、大罗2境、大罗3境 ……（超出一境即 +1，无上限） */
function infiniteRealmName(seq: number): string {
  return `${REALMS[REALMS.length - 1]}${seq}境`;
}

/**
 * 当前所处的境界档位序号：
 * 0 = 凡人；1 ~ 12 = 常规境界（炼气 → 大罗）；13 起为超出「大罗」后的无限境界（13 = 大罗1境）
 */
export function getTitleStageIndex(state: GameState): number {
  const m = state.highestValue?.m ?? 0;
  const e = state.highestValue?.e ?? 0;

  // 1 亿以下：凡人
  if (!(m > 0) || e < FIRST_REALM_EXP) return 0;

  const unitIndex = Math.floor(e / 4);

  // 超出「大罗」（> 古 10^100）后，每 10^6 一个新境界：大罗1境、大罗2境、大罗3境 …
  if (e >= INFINITE_BASE_EXP) {
    const seq = Math.floor((e - INFINITE_BASE_EXP) / INFINITE_EXP_STEP) + 1;
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

  // 常规境界：每 UNITS_PER_REALM 位单位一档，不细分上 / 中 / 下
  if (index <= REALMS.length) {
    const realmIndex = index - 1;
    return {
      name: REALMS[realmIndex],
      color: `hsl(${REALM_HUES[realmIndex]}, 75%, ${REALM_LIGHTNESS}%)`,
      requiredExponent: FIRST_REALM_EXP + realmIndex * EXP_PER_REALM,
    };
  }

  // 无限境界：超出「大罗」后每 10^6 一档
  const seq = index - REALMS.length; // 1 = 大罗1境
  return {
    name: infiniteRealmName(seq),
    color: `hsl(${(seq * 47) % 360}, 85%, 68%)`,
    requiredExponent: INFINITE_BASE_EXP + (seq - 1) * INFINITE_EXP_STEP,
  };
}

/**
 * 称号时间线：自「凡人」起、逐档向上，直到当前境界之后 ahead 档更强的境界。
 * - 常规区间（凡人 ~ 大罗）始终完整展示，凡人必定在列
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
