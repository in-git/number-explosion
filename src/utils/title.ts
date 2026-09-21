import { GameState } from '../types';
import { CHINESE_UNITS } from './bigNumber';

/**
 * 称号系统：按「历世最高数值」的量级自动达成，永不清零、无需购买。
 * - 每 3 位单位组成一个修仙境界，3 段依次为 上 / 中 / 下：
 *   亿 = 炼气·上，兆 = 炼气·中，京 = 炼气·下；垓 = 筑基·上……以此类推
 * - 1 亿以下：凡人
 * - 登顶（超过「古」10^100，即最后一位单位）后，境界名仿数字格式化的组合单位延伸，
 *   每 10^4 一个新境界：万古、亿古、兆古……太古（最高单前缀），
 *   其后前缀翻倍循环：万万古、亿亿古、兆兆古……太太古、万万万古……无限叠加
 * - 每个境界一枚基础色相，段位调整明度；登顶后的无限境界按序号做色相偏移
 */

const MORTAL_COLOR = '#6b6455';
/** 第一个境界「炼气·上」的起始指数：亿 = 10^8（CHINESE_UNITS 下标 2） */
const FIRST_REALM_EXP = 8;
/** 第一位单位的 CHINESE_UNITS 下标（亿） */
const FIRST_UNIT_INDEX = 2;
/** 最后一位单位的 CHINESE_UNITS 下标（古 = 10^100） */
const LAST_UNIT_INDEX = 25;

/** 修仙境界表：每 3 位单位一个境界（亿~古 共 24 位 → 8 个境界） */
const REALMS = [
  '炼气', // 亿 上 / 兆 中 / 京 下
  '筑基', // 垓 上 / 秭 中 / 穰 下
  '金丹', // 沟 上 / 涧 中 / 正 下
  '元婴', // 载 上 / 极 中 / 恒 下
  '化神', // 阿 上 / 那 中 / 议 下
  '炼虚', // 无 上 / 大 中 / 全 下
  '合体', // 宇 上 / 宙 中 / 洪 下
  '大乘', // 蒙 上 / 太 中 / 古 下（顶点，登顶后无限叠加）
];

/** 各境界基础色相（与 REALMS 一一对应） */
const REALM_HUES = [
  120, // 炼气：绿
  205, // 筑基：蓝
  45, // 金丹：金
  265, // 元婴：紫
  320, // 化神：粉
  170, // 炼虚：青
  30, // 炼虚→合体：橙
  0, // 大乘：红
];

/** 段位明度：上最亮、下最暗 */
const STAGE_LIGHTNESS = [68, 58, 48];
const STAGE_NAMES = ['上', '中', '下'];

export interface TitleInfo {
  /** 称号全文（含境界段位 / 境数） */
  name: string;
  /** 称号专属颜色（可直接用于 style.color） */
  color: string;
  /** 是否为登顶后的无限境界 */
  infinite: boolean;
  /** 无限境界的境数（infinite 时有意义） */
  stageNum: number;
}

/** 由存档推导当前称号（自动达成，无需存储） */
export function getTitle(state: GameState): TitleInfo {
  const m = state.highestValue?.m ?? 0;
  const e = state.highestValue?.e ?? 0;

  // 1 亿以下：凡人
  if (!(m > 0) || e < FIRST_REALM_EXP) {
    return { name: '凡人', color: MORTAL_COLOR, infinite: false, stageNum: 0 };
  }

  const unitIndex = Math.floor(e / 4);

  // 登顶：超过「古」(10^100) 后，每 10^4 一个新境界，命名仿组合单位：
  // 万古、亿古、兆古……太古（最高单前缀），其后万万古、亿亿古……无限循环
  if (unitIndex > LAST_UNIT_INDEX) {
    const j = Math.floor((e - LAST_UNIT_INDEX * 4) / 4); // 「古」的倍数序号（1 = 万古）
    const base = LAST_UNIT_INDEX - 1; // 可用前缀单位数（万~太 共 24 个）
    const k = j - 1;
    const char = CHINESE_UNITS[1 + (k % base)];
    const reps = Math.floor(k / base) + 1;
    const prefix = char.repeat(reps);
    return {
      name: prefix.length <= 32 ? `${prefix}古` : `${'太'.repeat(12)}古`,
      color: `hsl(${(j * 47) % 360}, 85%, 68%)`,
      infinite: true,
      stageNum: j,
    };
  }

  // 常规：每 3 位单位一个境界，段位依次 上 / 中 / 下
  const clamped = Math.min(LAST_UNIT_INDEX, Math.max(FIRST_UNIT_INDEX, unitIndex));
  const offset = clamped - FIRST_UNIT_INDEX;
  const realmIndex = Math.floor(offset / 3);
  const stageIdx = offset % 3;
  return {
    name: `${REALMS[realmIndex]}·${STAGE_NAMES[stageIdx]}`,
    color: `hsl(${REALM_HUES[realmIndex]}, 75%, ${STAGE_LIGHTNESS[stageIdx]}%)`,
    infinite: false,
    stageNum: 0,
  };
}

/** 排行·登顶门槛：须达到第一个境界「炼气」（最高数值 ≥ 1 亿） */
export function canAscendRank(state: GameState): boolean {
  const m = state.highestValue?.m ?? 0;
  const e = state.highestValue?.e ?? 0;
  return m > 0 && e >= FIRST_REALM_EXP;
}

