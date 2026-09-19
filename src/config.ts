import { BigNum } from './utils/bigNumber';
import { GameState, RebirthBaseAttrs, UpgradeId } from './types';

/** 存档键名 */
export const STORAGE_KEY = 'shuzhibaozha_save_v1';

/** 浮动特效阈值: 同屏最多保留 10 条，且两次生成至少间隔 40ms */
export const MAX_FLOATING_TEXTS = 10;
export const FLOATING_TEXT_INTERVAL_MS = 40;
/** 浮动特效存活时长 */
export const FLOATING_TEXT_LIFETIME_MS = 850;

/** toast 存活时长 */
export const TOAST_LIFETIME_MS = 4500;

/** 离线收益：低于 3 分钟不计 */
export const OFFLINE_MIN_MS = 3 * 60 * 1000;
/** 离线收益：最多结算 1 天的量 */
export const OFFLINE_MAX_MS = 24 * 60 * 60 * 1000;
/** 服务器时间同步间隔 */
export const SERVER_TIME_SYNC_INTERVAL_MS = 60 * 1000;

/** 重生门槛：数值达 100万 */
export const REBIRTH_THRESHOLD = new BigNum(1, 6);

/** 功法顺序（解锁播报 / 升级列表 / 商店 共用） */
export const UPGRADE_ORDER: UpgradeId[] = [
  'baseValue',
  'autoClickUnlock',
  'autoFrequency',
  'comboChance',
  'critMultiplier',
  'comboMultiplier',
  'critChance',
];

/**
 * 成就：以「历世累计点击次数」为门槛，与重生无关，永不清零。
 * 每个成就奖励一份「重生初始数值」，奖励之间可累加，并在重生/坍缩时作为起始数值。
 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  requiredClicks: number;
  /** 达成后奖励的重生初始数值（与其他奖励累加） */
  rebirthStartValue: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'click-100',
    name: '小试身手',
    desc: '累计点击 100 次',
    requiredClicks: 100,
    rebirthStartValue: 10,
  },
  {
    id: 'click-500',
    name: '渐入佳境',
    desc: '累计点击 500 次',
    requiredClicks: 500,
    rebirthStartValue: 100,
  },
  {
    id: 'click-1k',
    name: '千次达成',
    desc: '累计点击 1,000 次',
    requiredClicks: 1_000,
    rebirthStartValue: 1_000,
  },
  {
    id: 'click-3k',
    name: '熟能生巧',
    desc: '累计点击 3,000 次',
    requiredClicks: 3_000,
    rebirthStartValue: 2_000,
  },
  {
    id: 'click-5k',
    name: '点击达人',
    desc: '累计点击 5,000 次',
    requiredClicks: 5_000,
    rebirthStartValue: 5e4,
  },
  {
    id: 'click-1m',
    name: '百万点击',
    desc: '累计点击 1,000,000 次',
    requiredClicks: 1_000_000,
    rebirthStartValue: 5e6,
  },
];

/**
 * 坍缩商店出售等级上限的功法
 * - 自动点击不可升级，故不在列
 * - 概率类（连击概率 / 暴击概率）不可在此购买等级上限，故不在列
 */
export const REBIRTH_SHOP_ORDER: UpgradeId[] = [
  'baseValue',
  'autoFrequency',
  'critMultiplier',
  'comboMultiplier',
];

/** 重生基础属性初始值（尚未重生时全为 0） */
export const INITIAL_REBIRTH_BASE_ATTRS: RebirthBaseAttrs = {
  baseValue: 0,
  autoFrequency: 0,
  critMultiplier: 0,
  critChance: 0,
  comboChance: 0,
  comboMultiplier: 0,
};

/**
 * 重生不再自动累加基础属性（重生只给 1 点重生点数）。
 * 基础属性仅通过 REBIRTH_BASE_ATTR_PURCHASE_GAINS 在重生商店购买获得。
 * 此常量保留作历史配置，当前逻辑不再使用。
 */
export const REBIRTH_BASE_ATTR_GAIN: RebirthBaseAttrs = {
  baseValue: 1,
  autoFrequency: 1,
  critMultiplier: 0.5,
  critChance: 0.05,
  comboChance: 0.05,
  comboMultiplier: 0.5,
};

/** 重生商店中，单独升级某项重生基础属性时，每次购买获得的增量（消耗 1 点重生点数） */
export const REBIRTH_BASE_ATTR_PURCHASE_GAINS: Record<keyof RebirthBaseAttrs, number> = {
  baseValue: 5,
  autoFrequency: 1,
  critMultiplier: 0.5,
  critChance: 0.05,
  comboChance: 0.05,
  comboMultiplier: 0.5,
};

/** 重生基础属性中文名（用于商店与提示） */
export const REBIRTH_BASE_ATTR_LABELS: Record<keyof RebirthBaseAttrs, string> = {
  baseValue: '基础数值',
  autoFrequency: '自动点击频率',
  critMultiplier: '暴击倍数',
  critChance: '暴击概率',
  comboChance: '连击概率',
  comboMultiplier: '连击倍数',
};

export const INITIAL_STATE: GameState = {
  currentValue: { m: 0, e: 0 },
  clickCount: 0,
  totalClickCount: 0,
  unlockedAchievements: [],
  upgrades: {
    baseValue: { unlocked: false, level: 0, capBonus: 0 },
    autoClickUnlock: { unlocked: false, level: 0, capBonus: 0 },
    autoFrequency: { unlocked: false, level: 0, capBonus: 0 },
    comboChance: { unlocked: false, level: 0, capBonus: 0 },
    critMultiplier: { unlocked: false, level: 0, capBonus: 0 },
    comboMultiplier: { unlocked: false, level: 0, capBonus: 0 },
    critChance: { unlocked: false, level: 0, capBonus: 0 },
  },
  rebirthCount: 0,
  rebirthPoints: 0,
  collapsePoints: 0,
  rebirthUnlocked: false,
  collapseUnlocked: false,
  rebirthBaseAttrs: { ...INITIAL_REBIRTH_BASE_ATTRS },
  valueCapLevel: 0,
  rebirthPointLevel: 0,
  notifiedUnlocks: [],
  baseCritRate: 0,
  baseValueMultiplier: 1.0,
  /** 最后一次活跃的服务器时间戳（ms），用于离线收益结算 */
  lastActiveAt: 0,
};
