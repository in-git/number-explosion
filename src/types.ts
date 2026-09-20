export interface BigNumData {
  m: number; // mantissa: 1 <= m < 10 (or 0)
  e: number; // exponent (base 10)
}

export type UpgradeId =
  | 'baseValue'        // 数值升级
  | 'autoClickUnlock'  // 自动点击
  | 'autoFrequency'    // 自动点击频率
  | 'comboChance'      // 连击概率
  | 'critMultiplier'   // 暴击倍数
  | 'comboMultiplier'  // 连击倍数
  | 'critChance';      // 暴击概率

export interface UpgradeConfig {
  id: UpgradeId;
  name: string;
  desc: string;
  requiredClicks: number; // 解锁所需点击次数
  unlockCost: BigNumData; // 解锁消耗数值
  canUpgrade: boolean;    // 是否可升级（自动点击不可升级）
}

export interface UpgradeState {
  unlocked: boolean;
  level: number;
  /** 在永劫商店中用永劫点数购买的等级上限加成次数（每次 +50 级上限） */
  capBonus: number;
}

export interface FloatingText {
  id: string;
  text: string;
  type: 'crit' | 'combo' | 'crit-combo' | 'normal';
  createdAt: number;
  offsetAngle: number;
  distance: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

/** 挂机收益结算报告（挂机回来后弹窗展示） */
export interface OfflineGainReport {
  /** 实际结算的离线时长（ms），已按 1 天上限裁剪 */
  durationMs: number;
  /** 实际入账收益（可能被数值上限截断） */
  gain: BigNumData;
  /** 离线时长超过 1 天，已按上限结算 */
  truncatedByMax: boolean;
  /** 收益被数值上限截断，超出部分未能入账 */
  truncatedByCap: boolean;
}

/** 登录账号（排行榜登顶用） */
export interface UserAccountData {
  userId: string;
  userName: string;
  /** 昵称：展示在排行榜上 */
  nickname: string;
  password: string;
  token: string;
  /** 已入驻大区 */
  regionId: string | null;
  regionName: string | null;
}

/** 上次登录的凭据（退出登录后保留，便于再次登录） */
export interface LoginCredentials {
  userName: string;
  password: string;
  nickname: string;
}

export interface GameState {
  // 核心数值
  currentValue: BigNumData;
  /** 历世最高数值纪录（达到过的最高值，永不清零） */
  highestValue: BigNumData;
  /** 本世（本次永劫后）的用户点击次数：用于解锁功法，永劫/坍缩时清零 */
  clickCount: number;
  /** 历世累计的用户点击次数：永不清零，用于解锁成就 */
  totalClickCount: number;
  /** 已达成的成就 id */
  unlockedAchievements: string[];
  /** 累计游玩时长（ms）：仅在页面可见时累计，不计离线 / 后台挂机 */
  playTimeMs: number;

  // 升级状态
  upgrades: Record<UpgradeId, UpgradeState>;

  // 永劫与坍缩
  rebirthCount: number;     // 累计永劫次数（无上限）
  rebirthPoints: number;    // 永劫点数（当前拥有）
  collapsePoints: number;   // 坍缩点数（当前拥有）
  afterlifePoints: number;  // 往生点数（当前拥有，由坍缩点兑换而来）
  rebirthUnlocked: boolean;
  collapseUnlocked: boolean;

  /** 排行是否已解锁（消耗 1 点永劫点数，默认不显示） */
  rankingUnlocked: boolean;
  /** 是否已购买「功法无需解锁」特权（消耗 1 点永劫点数，永久生效） */
  upgradesAutoUnlocked: boolean;
  /** 是否已解锁「往生殿」特权（于坍缩店消耗 20 点坍缩点数解锁，永久生效，默认不显示） */
  afterlifeShopUnlocked: boolean;
  /**
   * 永劫店累计购买的各属性等级（永久道基，永不清零）。
   * 数值店用数值购买的等级超出此部分，将在永劫/坍缩时重置。
   */
  rebirthMergedLevels: Record<UpgradeId, number>;
  /** 往生殿：各属性已购买的升级等级，每级进一步降低该属性在数值店的升级消耗，消耗按 2×斐波那契增长 */
  afterlifeUpgradeLevels: Record<UpgradeId, number>;
  /** 登录账号与已选大区（登顶榜单用，null = 未登录） */
  account: UserAccountData | null;
  /** 上次登录的账号密码与昵称（登录界面直接复用，不再重新生成） */
  lastCredentials: LoginCredentials | null;

  /** 数值上限的提升次数（坍缩商店购买，每级 +100万，0 = 默认 100万） */
  valueCapLevel: number;
  /**
   * 「永劫点数获取」的升级次数（坍缩商店购买，消耗按斐波拉契递增的坍缩点数）
   * 每级在永劫时额外 +1 点永劫点数
   */
  rebirthPointLevel: number;
  /**
   * 坍缩商店中「永劫点数 → 坍缩点数」的累计兑换次数
   * 前 50 次每次 3 点永劫点数；第 51 次起消耗按 50 + 斐波拉契 递增
   */
  rebirthToCollapseCount: number;

  /** 已经弹出过解锁提示的条目（功法 id / 'rebirth' / 'collapse'），持久化避免刷新后重复提示 */
  notifiedUnlocks: string[];

  // 基础暴击率（默认20%）
  baseCritRate: number;
  // 基础数值倍率（默认1.0）
  baseValueMultiplier: number;

  /** 最后一次活跃的服务器时间戳（ms），由服务器时间写入；0 = 无记录，不结算离线收益 */
  lastActiveAt: number;
}
