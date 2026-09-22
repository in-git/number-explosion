import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { BigNum } from '../utils/bigNumber';
import {
  GameState,
  OfflineGainReport,
  PointsCurrency,
  SettleType,
  UpgradeId,
  UserAccountData,
} from '../types';
import { GameModalsState, useGameModals } from '../hooks/useGameModals';
import { useGameState } from '../hooks/useGameState';
import { ToastsApi, useToasts } from '../hooks/useToasts';
import { FloatingTextsApi, useFloatingTexts } from '../hooks/useFloatingTexts';
import { TribulationOutcome } from '../utils/gameMath';

/**
 * 只读游戏数据：随存档变化而变化。
 * 数值每帧都可能更新，故单独成库，避免无关组件跟着重渲染。
 */
export interface GameData {
  state: GameState;
  currentBigNum: BigNum;
  canRebirth: boolean;
  collapseGain: number;
  /** 挂机收益报告：非空时展示离线收益弹窗 */
  offlineReport: OfflineGainReport | null;
  /** 是否首次进入游戏（初始存档无 lastActiveAt 记录） */
  isFirstEntry: boolean;
}

/**
 * 全部玩法操作：全部来自 useGameState 的 useCallback，
 * 引用稳定（不随数值变化），故任何组件按需取用都不会引起额外重渲染。
 */
export interface GameActions {
  handleUserClick: () => void;
  handleUnlockUpgrade: (id: UpgradeId, cost: BigNum) => void;
  handleUpgradeLevel: (id: UpgradeId, cost: BigNum) => void;
  /** 数值殿：按本次次数上限连购（缺省不限），返回实际升级数 */
  handleUpgradeMax: (id: UpgradeId, maxLevels?: number) => number;
  handleUnlockAchievements: () => void;
  handleUnlockTitles: () => void;
  handleGambleSettle: (type: SettleType, amount: BigNum) => void;
  handleGambleSettlePoints: (currency: PointsCurrency, type: SettleType, amount: number) => void;
  handleBuyLevelCap: (id: UpgradeId) => void;
  /** 坍缩殿：功法等级上限连购（缺省不限次数），返回实际购买次数 */
  handleBuyLevelCapMax: (id: UpgradeId, maxLevels?: number) => number;
  handleBuyRebirthPointLevel: () => void;
  /** 坍缩殿：永劫爆炸连购（缺省不限次数），返回实际购买次数 */
  handleBuyRebirthPointLevelMax: (maxLevels?: number) => number;
  /** 坍缩殿：数值上限连购（缺省不限次数），返回实际购买次数 */
  handleBuyValueCapMax: (maxLevels?: number) => number;
  handleBuyRebirthMergedUpgrade: (id: UpgradeId) => void;
  /** 永劫殿：按本次次数上限连购（缺省不限），返回实际升级数 */
  handleBuyRebirthMergedUpgradeMax: (id: UpgradeId, maxLevels?: number) => number;
  handleUnlockCollapse: () => void;
  handleUnlockTribulation: () => void;
  handleTribulation: (outcome: TribulationOutcome) => void;
  handleBuyTribulationPill: () => void;
  handleCraftValueResetPill: () => void;
  handleCraftRebirthResetPill: () => void;
  handleUseValueResetPill: () => void;
  handleUseRebirthResetPill: () => void;
  handleBuyValueCap: () => void;
  handleExchangeRebirthToCollapse: (amount: number | 'all') => void;
  handleUnlockRanking: () => void;
  handleBuyAutoUnlock: () => void;
  handleUnlockAfterlifeShop: () => void;
  handleExchangeAfterlifePoint: (amount: number | 'all') => void;
  handleBuyAfterlifeUpgrade: (id: UpgradeId) => void;
  /** 往生殿：属性强化连购（缺省不限次数），返回实际购买次数 */
  handleBuyAfterlifeUpgradeMax: (id: UpgradeId, maxLevels?: number) => number;
  handleBuyRebirthCapUpgrade: () => void;
  /** 往生殿：永劫点上限连购（缺省不限次数），返回实际购买次数 */
  handleBuyRebirthCapUpgradeMax: (maxLevels?: number) => number;
  handleUnlockOneKeyUpgrade: () => void;
  handleLogin: (account: UserAccountData) => void;
  handleLogout: () => void;
  handleSelectRegion: (regionId: string, regionName: string) => void;
  confirmRebirth: () => void;
  confirmCollapse: () => void;
  dismissOfflineReport: () => void;
  resetProgress: () => void;
  resetAfterlifeUpgrades: () => void;
  resetCollapseUpgrades: () => void;
  resetRebirthUpgrades: () => void;
  debugSetValue: (val: BigNum) => void;
  debugSetRebirthPoints: (n: number) => void;
  debugSetCollapsePoints: (n: number) => void;
}

const GameDataContext = createContext<GameData | null>(null);
const GameActionsContext = createContext<GameActions | null>(null);
const ModalsContext = createContext<GameModalsState | null>(null);
const ToastsContext = createContext<ToastsApi | null>(null);
const FloatingTextsContext = createContext<FloatingTextsApi | null>(null);

/** Provider 缺失时立即报错，避免静默取到 undefined */
function useRequired<T>(ctx: React.Context<T | null>, hookName: string): T {
  const value = useContext(ctx);
  if (value === null) {
    throw new Error(`${hookName} 必须在 <GameProvider> 内使用`);
  }
  return value;
}

/** 只读数据：当前数值 / 存档 / 派生状态 */
export const useGameData = () => useRequired(GameDataContext, 'useGameData');
/** 玩法操作：升级 / 购买 / 永劫 / 坍缩 / 往生 等 */
export const useGameActions = () => useRequired(GameActionsContext, 'useGameActions');
/** 弹窗开关状态 */
export const useModals = () => useRequired(ModalsContext, 'useModals');
/** Toast 与飘字 */
export const useToastsApi = () => useRequired(ToastsContext, 'useToastsApi');
export const useFloatingTextsApi = () => useRequired(FloatingTextsContext, 'useFloatingTextsApi');

/**
 * 全局游戏 Provider：唯一持有 useGameState / useGameModals / toast / 飘字，
 * 子组件通过 useGameData / useGameActions / useModals 按需取用，不再逐层透传 props。
 */
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, addToast, dismissToast } = useToasts();
  const { floatingTexts, addFloatingText } = useFloatingTexts();
  const modals = useGameModals();
  const game = useGameState({ addToast, addFloatingText });

  const {
    state,
    currentBigNum,
    canRebirth,
    collapseGain,
    offlineReport,
    isFirstEntry,
    dismissOfflineReport,
    handleUserClick,
    handleUnlockUpgrade,
    handleUpgradeLevel,
    handleUpgradeMax,
    handleUnlockAchievements,
    handleUnlockTitles,
    handleGambleSettle,
    handleGambleSettlePoints,
    handleBuyLevelCap,
    handleBuyLevelCapMax,
    handleBuyRebirthPointLevel,
    handleBuyRebirthPointLevelMax,
    handleBuyValueCapMax,
    handleBuyRebirthMergedUpgrade,
    handleBuyRebirthMergedUpgradeMax,
    handleUnlockCollapse,
    handleUnlockTribulation,
    handleTribulation,
    handleBuyTribulationPill,
    handleCraftValueResetPill,
    handleCraftRebirthResetPill,
    handleUseValueResetPill,
    handleUseRebirthResetPill,
    handleBuyValueCap,
    handleExchangeRebirthToCollapse,
    handleUnlockRanking,
    handleBuyAutoUnlock,
    handleUnlockAfterlifeShop,
    handleExchangeAfterlifePoint,
    handleBuyAfterlifeUpgrade,
    handleBuyAfterlifeUpgradeMax,
    handleBuyRebirthCapUpgrade,
    handleBuyRebirthCapUpgradeMax,
    handleUnlockOneKeyUpgrade,
    handleLogin,
    handleLogout,
    handleSelectRegion,
    confirmRebirth,
    confirmCollapse,
    resetProgress,
    resetAfterlifeUpgrades,
    resetCollapseUpgrades,
    resetRebirthUpgrades,
    debugSetValue,
    debugSetRebirthPoints,
    debugSetCollapsePoints,
  } = game;

  const data = useMemo<GameData>(
    () => ({ state, currentBigNum, canRebirth, collapseGain, offlineReport, isFirstEntry }),
    [state, currentBigNum, canRebirth, collapseGain, offlineReport, isFirstEntry]
  );

  // 首次进入：弹出渡劫警示（3 秒后方可关闭），仅触发一次。
  // 用 ref 兜底幂等：即便 deps 变化导致 effect 重跑，也不会把玩家关掉的弹窗再次弹开。
  const firstEntryShownRef = useRef(false);
  useEffect(() => {
    if (!isFirstEntry || firstEntryShownRef.current) return;
    firstEntryShownRef.current = true;
    modals.firstEntry.open();
  }, [isFirstEntry, modals]);

  // 通关提示：仅在「未通关 → 通关」这一刻弹一次；读档即已通关时不重复打扰
  const prevClearedRef = useRef(state.gameCleared);
  useEffect(() => {
    const wasCleared = prevClearedRef.current;
    prevClearedRef.current = state.gameCleared;
    if (!wasCleared && state.gameCleared) modals.cleared.open();
  }, [state.gameCleared, modals]);

  // 所有 handler 均为 useCallback（依赖稳定），故此对象引用恒定：消费方不会因数值变化而重渲染
  const actions = useMemo<GameActions>(
    () => ({
      handleUserClick,
      handleUnlockUpgrade,
      handleUpgradeLevel,
      handleUpgradeMax,
      handleUnlockAchievements,
      handleUnlockTitles,
      handleGambleSettle,
      handleGambleSettlePoints,
      handleBuyLevelCap,
      handleBuyLevelCapMax,
      handleBuyRebirthPointLevel,
      handleBuyRebirthPointLevelMax,
      handleBuyValueCapMax,
      handleBuyRebirthMergedUpgrade,
      handleBuyRebirthMergedUpgradeMax,
      handleUnlockCollapse,
      handleUnlockTribulation,
      handleTribulation,
      handleBuyTribulationPill,
      handleCraftValueResetPill,
      handleCraftRebirthResetPill,
      handleUseValueResetPill,
      handleUseRebirthResetPill,
      handleBuyValueCap,
      handleExchangeRebirthToCollapse,
      handleUnlockRanking,
      handleBuyAutoUnlock,
      handleUnlockAfterlifeShop,
      handleExchangeAfterlifePoint,
      handleBuyAfterlifeUpgrade,
      handleBuyAfterlifeUpgradeMax,
      handleBuyRebirthCapUpgrade,
      handleBuyRebirthCapUpgradeMax,
      handleUnlockOneKeyUpgrade,
      handleLogin,
      handleLogout,
      handleSelectRegion,
      confirmRebirth,
      confirmCollapse,
      dismissOfflineReport,
      resetProgress,
      resetAfterlifeUpgrades,
      resetCollapseUpgrades,
      resetRebirthUpgrades,
      debugSetValue,
      debugSetRebirthPoints,
      debugSetCollapsePoints,
    }),
    [
      handleUserClick,
      handleUnlockUpgrade,
      handleUpgradeLevel,
      handleUpgradeMax,
      handleUnlockAchievements,
      handleUnlockTitles,
      handleGambleSettle,
      handleGambleSettlePoints,
      handleBuyLevelCap,
      handleBuyLevelCapMax,
      handleBuyRebirthPointLevel,
      handleBuyRebirthPointLevelMax,
      handleBuyValueCapMax,
      handleBuyRebirthMergedUpgrade,
      handleBuyRebirthMergedUpgradeMax,
      handleUnlockCollapse,
      handleUnlockTribulation,
      handleTribulation,
      handleBuyTribulationPill,
      handleCraftValueResetPill,
      handleCraftRebirthResetPill,
      handleUseValueResetPill,
      handleUseRebirthResetPill,
      handleBuyValueCap,
      handleExchangeRebirthToCollapse,
      handleUnlockRanking,
      handleBuyAutoUnlock,
      handleUnlockAfterlifeShop,
      handleExchangeAfterlifePoint,
      handleBuyAfterlifeUpgrade,
      handleBuyAfterlifeUpgradeMax,
      handleBuyRebirthCapUpgrade,
      handleBuyRebirthCapUpgradeMax,
      handleUnlockOneKeyUpgrade,
      handleLogin,
      handleLogout,
      handleSelectRegion,
      confirmRebirth,
      confirmCollapse,
      dismissOfflineReport,
      resetProgress,
      resetAfterlifeUpgrades,
      resetCollapseUpgrades,
      resetRebirthUpgrades,
      debugSetValue,
      debugSetRebirthPoints,
      debugSetCollapsePoints,
    ]
  );

  const toastsApi = useMemo<ToastsApi>(
    () => ({ toasts, addToast, dismissToast }),
    [toasts, addToast, dismissToast]
  );

  const floatingTextsApi = useMemo<FloatingTextsApi>(
    () => ({ floatingTexts, addFloatingText }),
    [floatingTexts, addFloatingText]
  );

  return (
    <GameActionsContext.Provider value={actions}>
      <GameDataContext.Provider value={data}>
        <ModalsContext.Provider value={modals}>
          <ToastsContext.Provider value={toastsApi}>
            <FloatingTextsContext.Provider value={floatingTextsApi}>
              {children}
            </FloatingTextsContext.Provider>
          </ToastsContext.Provider>
        </ModalsContext.Provider>
      </GameDataContext.Provider>
    </GameActionsContext.Provider>
  );
};
