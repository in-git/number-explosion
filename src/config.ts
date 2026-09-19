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

/** 永劫门槛：数值达 100万 */
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

/** 永劫基础属性初始值（尚未永劫时全为 0） */
export const INITIAL_REBIRTH_BASE_ATTRS: RebirthBaseAttrs = {
  baseValue: 0,
  autoFrequency: 0,
  critMultiplier: 0,
  critChance: 0,
  comboChance: 0,
  comboMultiplier: 0,
};

/**
 * 永劫不再自动累加基础属性（永劫只给 1 点永劫点数）。
 * 基础属性仅通过 REBIRTH_BASE_ATTR_PURCHASE_GAINS 在永劫商店购买获得。
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

/** 永劫商店中，单独升级某项永劫基础属性时，每次购买获得的增量（消耗 1 点永劫点数） */
export const REBIRTH_BASE_ATTR_PURCHASE_GAINS: Record<keyof RebirthBaseAttrs, number> = {
  baseValue: 5,
  autoFrequency: 1,
  critMultiplier: 0.5,
  critChance: 0.05,
  comboChance: 0.05,
  comboMultiplier: 0.5,
};

/** 永劫基础属性中文名（用于商店与提示） */
export const REBIRTH_BASE_ATTR_LABELS: Record<keyof RebirthBaseAttrs, string> = {
  baseValue: '基础数值',
  autoFrequency: '自动点击频率',
  critMultiplier: '暴击倍数',
  critChance: '暴击概率',
  comboChance: '连击概率',
  comboMultiplier: '连击倍数',
};

/** 万物店商品条目（消耗当前数值购买） */
export interface GoodsItem {
  id: string;
  name: string;
  /** 价格（当前数值） */
  cost: number;
}

/** 万物店分类：由廉价到奢侈依次排列 */
export interface GoodsCategory {
  id: string;
  name: string;
  items: GoodsItem[];
}

/**
 * 万物店商品表：掌中万物 → 出行座驾 → 名牌珍品 → 琼楼府邸
 * 价格自廉价递增至奢侈，整体跨度覆盖早中期到后期数值量级
 */
export const GOODS_CATEGORIES: GoodsCategory[] = [
  {
    id: 'digital',
    name: '掌中万物',
    items: [
      { id: 'usb-cable', name: '数据线', cost: 9.9 },
      { id: 'phone-case', name: '手机壳', cost: 29 },
      { id: 'bt-earbuds', name: '蓝牙耳机', cost: 99 },
      { id: 'power-bank', name: '充电宝', cost: 129 },
      { id: 'wireless-mouse', name: '无线鼠标', cost: 199 },
      { id: 'mi-band8', name: '小米手环 8', cost: 249 },
      { id: 'xiao-bawang', name: '小霸王游戏机', cost: 299 },
      { id: 'nokia-1100', name: '诺基亚 1100', cost: 399 },
      { id: 'mech-keyboard', name: '机械键盘', cost: 399 },
      { id: 'redmi-note', name: '红米 Note 13', cost: 1_199 },
      { id: 'switch-oled', name: 'Switch OLED', cost: 2_299 },
      { id: 'ipad-11', name: 'iPad 11', cost: 2_599 },
      { id: 'vivo-iqoo12', name: 'vivo iQOO 12', cost: 3_999 },
      { id: 'ps5-pro', name: 'PS5 Pro', cost: 4_299 },
      { id: 'macbook-air', name: 'MacBook Air M3', cost: 7_999 },
      { id: 'iphone-16-pro', name: 'iPhone 16 Pro Max', cost: 9_999 },
      { id: 'mate-x5', name: '华为 Mate X5 折叠屏', cost: 12_999 },
      { id: 'dji-mavic3', name: '大疆 Mavic 3', cost: 13_888 },
      { id: 'sony-a7m4', name: '索尼 A7M4 相机', cost: 17_999 },
      { id: 'rog-laptop', name: 'ROG 枪神游戏本', cost: 22_999 },
    ],
  },
  {
    id: 'vehicle',
    name: '出行座驾',
    items: [
      { id: 'mi-scooter', name: '小米电动滑板车', cost: 1_999 },
      { id: 'giant-bike', name: '捷安特自行车', cost: 2_199 },
      { id: 'yadea-ebike', name: '雅迪电动车', cost: 3_299 },
      { id: 'wuling-mini', name: '五菱宏光 MINI EV', cost: 32_800 },
      { id: 'honda-fit', name: '本田飞度', cost: 88_800 },
      { id: 'vw-lavida', name: '大众朗逸', cost: 128_800 },
      { id: 'toyota-camry', name: '丰田凯美瑞', cost: 198_800 },
      { id: 'byd-han', name: '比亚迪汉 EV', cost: 219_800 },
      { id: 'tesla-model3', name: '特斯拉 Model 3', cost: 245_900 },
      { id: 'bmw-3', name: '宝马 3 系', cost: 318_900 },
      { id: 'bmw-5', name: '宝马 5 系', cost: 439_900 },
      { id: 'porsche-macan', name: '保时捷 Macan', cost: 628_800 },
      { id: 'benz-gle', name: '奔驰 GLE 450', cost: 798_800 },
      { id: 'porsche-911', name: '保时捷 911', cost: 1_468_000 },
      { id: 'maybach-s680', name: '迈巴赫 S680', cost: 3_288_000 },
      { id: 'lambo-urus', name: '兰博基尼 Urus', cost: 3_290_000 },
      { id: 'ferrari-f8', name: '法拉利 F8', cost: 3_988_000 },
      { id: 'rolls-phantom', name: '劳斯莱斯幻影', cost: 9_200_000 },
      { id: 'bugatti-chiron', name: '布加迪 Chiron', cost: 25_000_000 },
    ],
  },
  {
    id: 'luxury',
    name: '名牌珍品',
    items: [
      { id: 'zippo', name: 'Zippo 打火机', cost: 299 },
      { id: 'chanel-lipstick', name: '香奈儿口红', cost: 380 },
      { id: 'swarovski', name: '施华洛世奇项链', cost: 1_290 },
      { id: 'gucci-wallet', name: 'Gucci 钱包', cost: 3_900 },
      { id: 'coach-bag', name: 'Coach 手袋', cost: 4_500 },
      { id: 'lv-bag', name: 'LV Neverfull 手袋', cost: 14_500 },
      { id: 'bvlgari-necklace', name: '宝格丽项链', cost: 32_000 },
      { id: 'cartier-ballon', name: '卡地亚蓝气球', cost: 48_500 },
      { id: 'chanel-flap', name: '香奈儿 Classic Flap', cost: 88_000 },
      { id: 'rolex-submariner', name: '劳力士绿水鬼', cost: 92_000 },
      { id: 'hermes-birkin', name: '爱马仕铂金包', cost: 150_000 },
      { id: 'rolex-daytona', name: '劳力士迪通拿', cost: 180_000 },
      { id: 'patek-celestial', name: '百达翡丽星空表', cost: 500_000 },
      { id: 'rm-011', name: '理查德米勒 RM 011', cost: 1_500_000 },
      { id: 'private-yacht', name: '私人游艇', cost: 20_000_000 },
      { id: 'pink-diamond', name: '粉钻戒指', cost: 88_000_000 },
      { id: 'gulfstream-g650', name: '湾流 G650 公务机', cost: 450_000_000 },
      { id: 'picasso', name: '毕加索真迹', cost: 1_200_000_000 },
    ],
  },
  {
    id: 'mansion',
    name: '琼楼府邸',
    items: [
      { id: 'county-flat', name: '县城小户型', cost: 300_000 },
      { id: 'school-flat', name: '三线三居室', cost: 900_000 },
      { id: 'city-penthouse', name: '二线大平层', cost: 5_000_000 },
      { id: 'tier1-flat', name: '一线三居室', cost: 12_000_000 },
      { id: 'suburban-villa', name: '郊区独栋别墅', cost: 30_000_000 },
      { id: 'private-island', name: '私人海岛', cost: 80_000_000 },
      { id: 'bj-courtyard', name: '北京四合院', cost: 100_000_000 },
      { id: 'tompson-penthouse', name: '汤臣一品顶层复式', cost: 150_000_000 },
      { id: 'hilltop-manor', name: '半山庄园', cost: 200_000_000 },
      { id: 'dubai-villa', name: '迪拜棕榈岛别墅', cost: 350_000_000 },
      { id: 'monaco-flat', name: '摩纳哥海景豪宅', cost: 500_000_000 },
      { id: 'london-mansion', name: '伦敦骑士桥豪宅', cost: 800_000_000 },
      { id: 'hk-peak', name: '香港山顶超级豪宅', cost: 1_500_000_000 },
      { id: 'france-chateau', name: '法国酒庄城堡', cost: 2_000_000_000 },
      { id: 'office-tower', name: '整栋甲级写字楼', cost: 3_000_000_000 },
    ],
  },
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
    desc: '万物店累计购置总额',
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

/** 解锁万物店消耗的永劫点数 */
export const GOODS_SHOP_UNLOCK_COST = 1;
/** 解锁背包消耗的永劫点数（未解锁不可购置商品） */
export const INVENTORY_UNLOCK_COST = 3;
/** 解锁排行消耗的永劫点数 */
export const RANKING_UNLOCK_COST = 1;

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
  collapsePoints: 0,
  /** 累计游玩时长（ms）：仅页面可见时累计 */
  playTimeMs: 0,
  rebirthUnlocked: false,
  collapseUnlocked: false,
  /** 万物店：默认不显示，消耗 1 点永劫点数解锁 */
  goodsShopUnlocked: false,
  /** 背包：默认不显示，消耗 3 点永劫点数解锁（未解锁不可购置商品） */
  inventoryUnlocked: false,
  /** 排行：默认不显示，消耗 1 点永劫点数解锁 */
  rankingUnlocked: false,
  /** 登录账号与已选大区（未登录为 null） */
  account: null,
  /** 万物店已购商品：商品 id → 拥有数量 */
  goodsPurchases: {},
  /** 购置商品累计花费的数值总额 */
  goodsTotalSpent: { m: 0, e: 0 },
  rebirthBaseAttrs: { ...INITIAL_REBIRTH_BASE_ATTRS },
  valueCapLevel: 0,
  rebirthPointLevel: 0,
  /** 永劫点数兑换坍缩点数的累计次数 */
  rebirthToCollapseCount: 0,
  notifiedUnlocks: [],
  baseCritRate: 0,
  baseValueMultiplier: 1.0,
  /** 最后一次活跃的服务器时间戳（ms），用于离线收益结算 */
  lastActiveAt: 0,
};
