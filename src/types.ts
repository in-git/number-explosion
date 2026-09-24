export interface BigNumData {
  m: number; // mantissa: 1 <= m < 10 (or 0)
  e: number; // exponent (base 10)
}

/** 奇趣殿结算方向：gain = 净赚，loss = 没收 */
export type SettleType = 'gain' | 'loss';

/** 可梭哈的货币：数值 / 永劫点 / 坍缩点 / 往生点 */
export type GambleCurrency = 'value' | 'rebirth' | 'collapse' | 'afterlife';

/** 点数类货币（不含数值） */
export type PointsCurrency = Exclude<GambleCurrency, 'value'>;

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
  /** 在永劫商殿中用永劫点数购买的等级上限加成次数（每次 +50 级上限） */
  capBonus: number;
}

export interface FloatingText {
  id: string;
  text: string;
  /** 连击与暴击互斥，不存在同时触发的类型 */
  type: 'crit' | 'combo' | 'normal';
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

/** 登录账号（排行榜登录用） */
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
  /**
   * 是否已通关：数值曾达 1ssr（字母档位顶点）即置为 true。
   * 存档属性——渡劫失败 / 永劫 / 坍缩均不复位，并随成绩上报到排行榜。
   */
  gameCleared: boolean;
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
  rebirthPoints: number;    // 永劫点数（当前拥有，持有量无上限）
  rebirthCapLevel: number;  // 往生殿「永劫点上限」等级：限制「每次永劫所得」的上限（每级 +100）
  collapsePoints: number;   // 坍缩点数（当前拥有）
  afterlifePoints: number;  // 往生点数（当前拥有，由坍缩点兑换而来）

  /** 往生殿「升级量」开关特权：消耗 10 往生点解锁，默认不显示 */
  oneKeyUpgradeUnlocked: boolean;
  rebirthUnlocked: boolean;
  collapseUnlocked: boolean;

  /** 排行是否已解锁（消耗 1 点永劫点数，默认不显示） */
  rankingUnlocked: boolean;
  /** 是否已购买「功法无需解锁」特权（消耗 1 点永劫点数，永久生效） */
  upgradesAutoUnlocked: boolean;
  /** 是否已解锁「往生殿」特权（于坍缩殿消耗 20 点坍缩点数解锁，永久生效，默认不显示） */
  afterlifeShopUnlocked: boolean;
  /** 成就系统是否已开启（数值殿花费 50 万数值解锁，默认关闭） */
  achievementsUnlocked: boolean;
  /** 称号系统是否已开启（数值殿花费 200 万数值解锁，默认关闭） */
  titleUnlocked: boolean;
  /**
   * 永劫殿各属性的独立升级等级（永久道基，永不清零）。
   * 与数值殿完全独立，计算时效果累加；「基础数值」另存于 rebirthBaseValueLevel。
   */
  rebirthMergedLevels: Record<UpgradeId, number>;
  /**
   * 永劫殿「基础数值」的独立升级等级（永久，永不清零）。
   * 与数值殿「数值升级」完全独立、效果累加：每级提升 +2（线性），消耗 1,1,3,5,7...（前两级各 1，此后每级 +2）
   */
  rebirthBaseValueLevel: number;
  /**
   * 往生殿：各属性的强化等级（消耗往生点，统一为斐波那契数列 1、1、2、3、5…）
   * - 「数值升级」：放大永劫殿「基础数值」的累计加成，倍数 5、7、12、19、31…（类斐波那契）
   * - 其余属性：放大永劫殿对应属性的累计加成，倍数 2、3、4、5、6…（线性）
   */
  afterlifeUpgradeLevels: Record<UpgradeId, number>;
  /** 登录账号与已选大区（榜单登录用，null = 未登录） */
  account: UserAccountData | null;
  /** 上次登录的账号密码与昵称（登录界面直接复用，不再重新生成） */
  lastCredentials: LoginCredentials | null;

  /** 数值上限的提升次数（坍缩商殿购买，每级 +100万，0 = 默认 100万）；另每次永劫永久 +100万 */
  valueCapLevel: number;
  /**
   * 「永劫爆炸」的升级次数（坍缩商殿购买，消耗按 2 的幂递增的坍缩点数）
   * 每级使永劫时「每 100 万数值」额外 +0.2 点永劫点数
   */
  rebirthPointLevel: number;
  /**
   * 持有的渡劫丹数量（往生殿购买，300 往生点/颗）。
   * 渡劫时每道雷劫可消耗 1 颗：持丹的那一道必定通过（100%），否则该道仅 50%
   */
  tribulationPills: number;
  /** 是否已渡劫成功：未成功前「渡劫次方」不参与收益计算，避免数值崩塌 */
  tribulationSuccess: boolean;
  /**
   * 渡劫次数（= 渡劫成功次数，仅成功时 +1），上限 9（TRIBULATION_MAX_COUNT）。
   * 单次收益 = 原值 ^ 渡劫次数：0 次时不参与计算（原值 ^ 0 = 1 会打崩数值）。
   * 例：单次点击值 10、渡劫次数 3 → 10³ = 1000
   */
  tribulationCount: number;
  /** 往生殿「渡劫」是否已解锁（消耗 100 往生点一次性解锁，未解锁不显示渡劫入口） */
  tribulationUnlocked: boolean;
  /** 渡劫殿：持有的「数值重置丹」数量（作用于数值殿，随存档持久化到本地） */
  valueResetPills: number;
  /** 渡劫殿：「数值重置丹」已炼成的炉数，决定下一炉耗时（10s、20s、30s…） */
  valueResetCraftCount: number;
  /** 渡劫殿：「数值重置丹」当前这一炉已投入的时间（ms） */
  valueResetProgressMs: number;
  /** 渡劫殿：「数值重置丹」是否正在炼制（点击炼制才开始，炼制中不可操作） */
  valueResetCrafting: boolean;
  /** 渡劫殿：持有的「永劫重置丹」数量（作用于永劫殿「基础数值」，随存档持久化） */
  rebirthResetPills: number;
  /** 渡劫殿：「永劫重置丹」已炼成的炉数，决定下一炉耗时（10s、20s、30s…） */
  rebirthResetCraftCount: number;
  /** 渡劫殿：「永劫重置丹」当前这一炉已投入的时间（ms） */
  rebirthResetProgressMs: number;
  /** 渡劫殿：「永劫重置丹」是否正在炼制（点击炼制才开始，炼制中不可操作） */
  rebirthResetCrafting: boolean;
  /** 渡劫殿：持有的「坍缩重置丹」数量（作用于坍缩殿，随存档持久化） */
  collapseResetPills: number;
  /** 渡劫殿：「坍缩重置丹」已炼成的炉数 */
  collapseResetCraftCount: number;
  /** 渡劫殿：「坍缩重置丹」当前这一炉已投入的时间（ms） */
  collapseResetProgressMs: number;
  /** 渡劫殿：「坍缩重置丹」是否正在炼制（点击炼制才开始，炼制中不可操作） */
  collapseResetCrafting: boolean;
  /** 渡劫殿：持有的「渡劫点」数量（渡劫成功后每 10 秒 +15） */
  tribulationPoints: number;
  /** 渡劫殿：距离产出下 1 点「渡劫点」已累计的时间（ms） */
  tribulationPointProgressMs: number;
  /** 渡劫殿：距离下一次自动结算「永劫点」已累计的时间（ms） */
  autoRebirthProgressMs: number;
  /** 渡劫殿：已自动结算「永劫点」的次数（仅作记录；自动结算间隔固定 30s，不随次数变化） */
  autoRebirthCount: number;
  /**
   * 「数值重置丹」的账本：按功法记录数值殿中被重置掉的等级。
   * 使用后该项升级消耗从初始曲线重算（等级清零），
   * 但已获得的效果仍按「当前等级 + 本字段等级」累计，故效果全部保留。
   */
  valueResetLevels: Record<UpgradeId, number>;
  /**
   * 「永劫重置丹」的账本：按属性记录永劫殿中被重置掉的等级（效果照旧计入）。
   * 永劫殿等级为永久道基，故本字段转世不清零。
   */
  rebirthResetLevels: Record<UpgradeId, number>;
  /**
   * 「坍缩重置丹」的账本：记录坍缩殿被重置掉的等级（数值上限 / 永劫爆炸），
   * 效果照旧计入。使用后对应升级消耗从初始曲线重算（等级清零），
   * 但已获得的效果仍按「当前等级 + 本字段等级」累计。
   */
  collapseResetLevels: { valueCap: number; rebirthExplosion: number };
  /** 坍缩商殿中「永劫点数 → 坍缩点数」的累计兑换次数（每次恒定 3 点永劫点数） */
  rebirthToCollapseCount: number;

  /** 已经弹出过解锁提示的条目（功法 id / 'rebirth' / 'collapse'），持久化避免刷新后重复提示 */
  notifiedUnlocks: string[];

  // 基础暴击率（默认5%）
  baseCritRate: number;
  // 基础数值倍率（默认1.0）
  baseValueMultiplier: number;

  /** 最后一次活跃的服务器时间戳（ms），由服务器时间写入；0 = 无记录，不结算离线收益 */
  lastActiveAt: number;
}
