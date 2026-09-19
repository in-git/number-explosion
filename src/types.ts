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
  /** 在重生商店中用重生点数购买的等级上限加成次数（每次 +50 级上限） */
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

/**
 * 重生基础属性：每次重生永久累加，与基础值叠加参与计算
 * - baseValue: 直接加到单次点击的基础数值上
 * - critMultiplier / comboMultiplier: 加到倍数基数（1.0 = 100%）上
 * - critChance / comboChance: 加到概率上（0.05 = 5%），合计上限 100%
 */
export interface RebirthBaseAttrs {
  baseValue: number;
  /** 自动点击频率的永久等级加成（每次购买 +1 级，与功法等级叠加计算） */
  autoFrequency: number;
  critMultiplier: number;
  critChance: number;
  comboChance: number;
  comboMultiplier: number;
}

export interface GameState {
  // 核心数值
  currentValue: BigNumData;
  /** 本世（本次重生后）的用户点击次数：用于解锁功法，重生/坍缩时清零 */
  clickCount: number;
  /** 历世累计的用户点击次数：永不清零，用于解锁成就 */
  totalClickCount: number;
  /** 已达成的成就 id */
  unlockedAchievements: string[];

  // 升级状态
  upgrades: Record<UpgradeId, UpgradeState>;

  // 重生与坍缩
  rebirthCount: number;     // 累计重生次数（无上限）
  rebirthPoints: number;    // 重生点数（当前拥有）
  collapsePoints: number;   // 坍缩点数（当前拥有）
  rebirthUnlocked: boolean;
  collapseUnlocked: boolean;
  /** 重生基础属性（永久累加，重生/坍缩均不清除） */
  rebirthBaseAttrs: RebirthBaseAttrs;
  /** 数值上限的翻倍次数（坍缩商店购买，0 = 默认 500万） */
  valueCapLevel: number;
  /**
   * 「重生点数获取」的升级次数（坍缩商店购买，消耗按斐波拉契递增的坍缩点数）
   * 每级在重生时额外 +1 点重生点数
   */
  rebirthPointLevel: number;

  /** 已经弹出过解锁提示的条目（功法 id / 'rebirth' / 'collapse'），持久化避免刷新后重复提示 */
  notifiedUnlocks: string[];

  // 基础暴击率（默认20%）
  baseCritRate: number;
  // 基础数值倍率（默认1.0）
  baseValueMultiplier: number;

  /** 最后一次活跃的服务器时间戳（ms），由服务器时间写入；0 = 无记录，不结算离线收益 */
  lastActiveAt: number;
}
