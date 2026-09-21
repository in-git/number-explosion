import { BigNum } from './utils/bigNumber';
import { GameState, UpgradeId } from './types';

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

/** 永劫门槛：数值达 100万 */
export const REBIRTH_THRESHOLD = new BigNum(1, 6);

/** 数值殿：开启成就系统的花费（数值，默认关闭） */
export const ACHIEVEMENTS_UNLOCK_COST = 500_000;
/** 数值殿：开启称号系统的花费（数值，默认关闭） */
export const TITLE_UNLOCK_COST = 2_000_000;

/** 功法顺序（解锁播报 / 升级列表 / 商殿 共用）：先概率类，后倍数类 */
export const UPGRADE_ORDER: UpgradeId[] = [
  'baseValue',
  'autoClickUnlock',
  'autoFrequency',
  'comboChance',
  'critChance',
  'comboMultiplier',
  'critMultiplier',
];

/**
 * 成就：门槛分两类
 * - click：以「历世累计点击次数」为门槛，与永劫无关，永不清零
 * - playTime：以「累计游玩时长」为门槛（仅页面可见时累计，不计离线/后台挂机）
 * 奖励之间可累加。
 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** 门槛类型：累计点击 / 累计游玩时长 */
  type: 'click' | 'playTime';
  /** 累计点击门槛（type = 'click'） */
  requiredClicks: number;
  /** 累计游玩时长门槛，ms（type = 'playTime'） */
  requiredPlayMs?: number;
  /** 达成后奖励的永劫初始数值（与其他奖励累加） */
  rebirthStartValue: number;
  /** 达成后奖励的暴击效果（暴击倍数，游玩时长成就的奖励） */
  critMultiplier?: number;
}

/** 时长门槛常量 */
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** 点击类成就：奖励永劫初始数值 */
export const CLICK_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'click-100',
    name: '小试身手',
    desc: '累计点击 1,000 次',
    type: 'click',
    requiredClicks: 1_000,
    rebirthStartValue: 10,
  },
  {
    id: 'click-500',
    name: '渐入佳境',
    desc: '累计点击 5,000 次',
    type: 'click',
    requiredClicks: 5_000,
    rebirthStartValue: 100,
  },
  {
    id: 'click-1k',
    name: '万次达成',
    desc: '累计点击 10,000 次',
    type: 'click',
    requiredClicks: 10_000,
    rebirthStartValue: 1_000,
  },
  {
    id: 'click-3k',
    name: '熟能生巧',
    desc: '累计点击 30,000 次',
    type: 'click',
    requiredClicks: 30_000,
    rebirthStartValue: 2_000,
  },
  {
    id: 'click-5k',
    name: '点击达人',
    desc: '累计点击 50,000 次',
    type: 'click',
    requiredClicks: 50_000,
    rebirthStartValue: 5e4,
  },
  {
    id: 'click-1m',
    name: '千万点击',
    desc: '累计点击 10,000,000 次',
    type: 'click',
    requiredClicks: 10_000_000,
    rebirthStartValue: 5e6,
  },
];

/**
 * 游玩时长类成就：奖励暴击效果（暴击倍数基数 +N）
 * 5分钟 → 1小时 → 12小时 → 24小时 → 10天 → 15天 → 30天 → 1年
 * 奖励按 4 倍递增：0.5, 2, 8, 32, 128, 512, 2048, 8192
 */
export const PLAY_TIME_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'play-5m',
    name: '初窥门径',
    desc: '累计游玩 5 分钟',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 5 * MINUTE_MS,
    rebirthStartValue: 0,
    critMultiplier: 0.5,
  },
  {
    id: 'play-1h',
    name: '静心参悟',
    desc: '累计游玩 1 小时',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: HOUR_MS,
    rebirthStartValue: 0,
    critMultiplier: 2,
  },
  {
    id: 'play-12h',
    name: '半日玄功',
    desc: '累计游玩 12 小时',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 12 * HOUR_MS,
    rebirthStartValue: 0,
    critMultiplier: 8,
  },
  {
    id: 'play-24h',
    name: '昼夜不辍',
    desc: '累计游玩 24 小时',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: DAY_MS,
    rebirthStartValue: 0,
    critMultiplier: 32,
  },
  {
    id: 'play-10d',
    name: '旬日苦修',
    desc: '累计游玩 10 天',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 10 * DAY_MS,
    rebirthStartValue: 0,
    critMultiplier: 128,
  },
  {
    id: 'play-15d',
    name: '半月凝神',
    desc: '累计游玩 15 天',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 15 * DAY_MS,
    rebirthStartValue: 0,
    critMultiplier: 512,
  },
  {
    id: 'play-30d',
    name: '一月圆满',
    desc: '累计游玩 30 天',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 30 * DAY_MS,
    rebirthStartValue: 0,
    critMultiplier: 2048,
  },
  {
    id: 'play-1y',
    name: '岁寒道成',
    desc: '累计游玩 1 年',
    type: 'playTime',
    requiredClicks: 0,
    requiredPlayMs: 365 * DAY_MS,
    rebirthStartValue: 0,
    critMultiplier: 8192,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...CLICK_ACHIEVEMENTS,
  ...PLAY_TIME_ACHIEVEMENTS,
];

/**
 * 坍缩商殿出售等级上限的功法
 * - 自动点击不可升级，故不在列
 * - 概率类（连击概率 / 暴击概率）不可在此购买等级上限，故不在列
 */
export const REBIRTH_SHOP_ORDER: UpgradeId[] = [
  'baseValue',
  'critMultiplier',
  'comboMultiplier',
];

/**
 * 永劫殿升级条目及其展示名。
 * 所有属性均与数值殿完全独立：等级存于 rebirthMergedLevels / rebirthBaseValueLevel，
 * 永久保留（重生/坍缩不清零），计算时效果与数值殿累加。
 */
export const REBIRTH_MERGED_UPGRADES: { id: UpgradeId; label: string }[] = [
  { id: 'baseValue', label: '基础数值' },
  { id: 'autoFrequency', label: '自动点击频率' },
  { id: 'critMultiplier', label: '暴击倍数' },
  { id: 'critChance', label: '暴击概率' },
  { id: 'comboChance', label: '连击概率' },
  { id: 'comboMultiplier', label: '连击倍数' },
];






/** 排行榜单项：按门槛划分阶位称号 */
export interface RankDef {
  id: 'value' | 'wealth' | 'playTime' | 'rebirth';
  name: string;
  desc: string;
  /** 进度刻度：数值类跨度极大用对数，次数/时长用线性 */
  scale: 'log' | 'linear';
  /** 各阶门槛 */
  tiers: number[];
  /** 各阶称号（与 tiers 一一对应） */
  titles: string[];
}

/** 通用阶位称号 */
const TIER_TITLES = [
  '练气',
  '筑基',
  '金丹',
  '元婴',
  '化神',
  '炼虚',
  '合体',
  '大乘',
  '渡劫',
  '真仙',
];

/** 排行榜：数值 / 富豪 / 时长 / 永劫次数 */
export const RANKS: RankDef[] = [
  {
    id: 'value',
    name: '数值排行',
    desc: '历世最高数值',
    scale: 'log',
    tiers: [1e3, 1e4, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e28],
    titles: TIER_TITLES,
  },
  {
    id: 'wealth',
    name: '富豪排行',
    desc: '万物殿累计购置总额',
    scale: 'log',
    tiers: [1e3, 1e5, 1e7, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e28],
    titles: TIER_TITLES,
  },
  {
    id: 'playTime',
    name: '时长排行',
    desc: '累计游玩时长',
    scale: 'linear',
    tiers: [
      5 * MINUTE_MS,
      30 * MINUTE_MS,
      2 * HOUR_MS,
      6 * HOUR_MS,
      12 * HOUR_MS,
      DAY_MS,
      3 * DAY_MS,
      7 * DAY_MS,
      15 * DAY_MS,
      30 * DAY_MS,
    ],
    titles: TIER_TITLES,
  },
  {
    id: 'rebirth',
    name: '永劫排行',
    desc: '累计永劫次数',
    scale: 'linear',
    tiers: [1, 5, 10, 25, 50, 100, 200, 500, 1_000, 3_000],
    titles: TIER_TITLES,
  },
];

/** 解锁排行消耗的永劫点数 */
export const RANKING_UNLOCK_COST = 1;
/** 「功法无需解锁」特权消耗的永劫点数 */
export const AUTO_UNLOCK_COST = 1;
/** 「往生殿」特权消耗的坍缩点数（于坍缩殿一次性解锁） */
export const AFTERLIFE_SHOP_UNLOCK_COST = 20;
/** 往生点兑换：每 10 点坍缩点数可兑换 1 点往生点数（于往生殿内兑换） */
export const AFTERLIFE_POINT_EXCHANGE_COST = 10;
/** 往生殿：「一键升级」特权消耗的往生点（解锁后数值殿显示一键升级） */
export const ONE_KEY_UPGRADE_UNLOCK_COST = 10;

/** 排行昵称默认值（必填，用户可自行修改） */
export const DEFAULT_NICKNAME = '数爆玩家';

export const INITIAL_STATE: GameState = {
  currentValue: { m: 0, e: 0 },
  /** 历世最高数值纪录 */
  highestValue: { m: 0, e: 0 },
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
  /** 往生殿「永劫点上限」等级：默认 0（上限 100） */
  rebirthCapLevel: 0,
  collapsePoints: 0,
  /** 往生点数：默认 0，由坍缩点兑换而来 */
  afterlifePoints: 0,
  /** 累计游玩时长（ms）：仅页面可见时累计 */
  playTimeMs: 0,
  rebirthUnlocked: false,
  collapseUnlocked: false,

  /** 排行：默认不显示，消耗 1 点永劫点数解锁 */
  rankingUnlocked: false,
  /** 功法无需解锁特权：默认关闭 */
  upgradesAutoUnlocked: false,
  /** 往生殿特权：默认关闭（于坍缩殿消耗 20 点坍缩点数解锁） */
  afterlifeShopUnlocked: false,
  /** 往生殿「一键升级」特权：默认关闭（消耗 10 往生点解锁） */
  oneKeyUpgradeUnlocked: false,
  /** 成就系统：默认关闭（数值殿花费 50 万解锁） */
  achievementsUnlocked: false,
  /** 称号系统：默认关闭（数值殿花费 200 万解锁） */
  titleUnlocked: false,
  /** 永劫殿累计购买的等级（永久道基，默认全为 0） */
  rebirthMergedLevels: {
    baseValue: 0,
    autoClickUnlock: 0,
    autoFrequency: 0,
    comboChance: 0,
    critMultiplier: 0,
    comboMultiplier: 0,
    critChance: 0,
  },
  /** 永劫殿「基础数值」的独立升级等级（永久，默认 0） */
  rebirthBaseValueLevel: 0,
  /** 往生殿：各属性已购升级等级，默认全为 0 */
  afterlifeUpgradeLevels: {
    baseValue: 0,
    autoClickUnlock: 0,
    autoFrequency: 0,
    comboChance: 0,
    critMultiplier: 0,
    comboMultiplier: 0,
    critChance: 0,
  },
  /** 登录账号与已选大区（未登录为 null） */
  account: null,
  /** 上次登录凭据（null = 无历史记录） */
  lastCredentials: null,


  valueCapLevel: 0,
  rebirthPointLevel: 0,
  /** 永劫点数兑换坍缩点数的累计次数 */
  rebirthToCollapseCount: 0,
  notifiedUnlocks: [],
  /** 基础暴击率：默认 5% */
  baseCritRate: 0.05,
  baseValueMultiplier: 1.0,
  /** 最后一次活跃的服务器时间戳（ms），用于离线收益结算 */
  lastActiveAt: 0,
};
