import React from 'react';
import { BigNum } from '../utils/bigNumber';
import { GameState, UpgradeId, UserAccountData } from '../types';
import { GameModalsState } from '../hooks/useGameModals';
import { FunShop, SettleType, PointsCurrency } from './FunShop';
import { ModalShell } from './ModalShell';
import { UpgradesList } from './UpgradesList';
import { RebirthShop } from './RebirthShop';
import { CollapseShop } from './CollapseShop';
import { Ranking } from './Ranking';
import { AchievementsModal } from './AchievementsModal';
import { RebirthModal } from './RebirthModal';
import { CollapseModal } from './CollapseModal';
import { AfterlifeShop } from './AfterlifeShop';
import { TitleModal } from './TitleModal';
import { SettingsModal } from './SettingsModal';
import { getExtraRebirthPoints, getRebirthPointsCap } from '../utils/gameMath';

interface GameModalsProps {
  modals: GameModalsState;
  state: GameState;
  currentValue: BigNum;
  collapseGain: number;
  onUnlockUpgrade: (id: UpgradeId, cost: BigNum) => void;
  onUpgradeLevel: (id: UpgradeId, cost: BigNum) => void;
  /** 数值殿：一键升级（按「概率 → 数值 → 倍数」升满，返回本次是否发生升级） */
  onUpgradeAll: () => boolean;
  /** 数值殿：开启成就系统（50 万数值） */
  onUnlockAchievements: () => void;
  /** 数值殿：开启称号系统（200 万数值） */
  onUnlockTitles: () => void;
  onBuyLevelCap: (id: UpgradeId) => void;
  onBuyRebirthMergedUpgrade: (id: UpgradeId) => void;
  onUnlockCollapse: () => void;

  /** 消耗 20 点坍缩点数解锁往生殿（于坍缩殿） */
  onUnlockAfterlifeShop: () => void;
  /** 消耗 1 点永劫点数解锁排行 */
  onUnlockRanking: () => void;
  /** 消耗 1 点永劫点数购买「功法无需解锁」特权 */
  onBuyAutoUnlock: () => void;
  /** 往生殿：消耗坍缩点兑换往生点（amount 为兑换次数，'all' = 全部） */
  onExchangeAfterlifePoint: (amount: number | 'all') => void;
  /** 往生殿：消耗按公差 4 的等差数列递增的往生点，提升某属性在数值殿的升级折扣 */
  onBuyAfterlifeUpgrade: (id: UpgradeId) => void;
  /** 往生殿：提升「永劫点上限」（每级 +100，消耗往生点 1,2,3,4,5…） */
  onBuyRebirthCapUpgrade: () => void;
  /** 往生殿：消耗 10 往生点解锁「一键升级」 */
  onUnlockOneKeyUpgrade: () => void;
  /** 排行·登顶：注册/登录 */
  onLogin: (account: UserAccountData) => void;
  /** 排行·登顶：入驻大区 */
  onRegionSelected: (regionId: string, regionName: string) => void;
  /** 排行·登顶：退出登录 */
  onLogout: () => void;
  onBuyValueCap: () => void;
  /** 购买「永劫点数获取」 */
  onBuyRebirthPointLevel: () => void;
  /** 永劫点数兑换坍缩点数（amount 为兑换次数，'all' = 全部） */
  onExchangeRebirthToCollapse: (amount: number | 'all') => void;


  onGambleSettle: (type: SettleType, amount: BigNum) => void;
  /** 奇趣殿：点数类货币结算 */
  onGambleSettlePoints: (currency: PointsCurrency, type: SettleType, amount: number) => void;
  onConfirmRebirth: () => void;
  onConfirmCollapse: () => void;
  onSetDebugValue: (val: BigNum) => void;
  /** 调试：直接设置永劫点数 */
  onSetRebirthPoints: (n: number) => void;
  /** 调试：直接设置坍缩点数 */
  onSetCollapsePoints: (n: number) => void;
  /** 重置往生殿升级等级 */
  onResetAfterlifeUpgrades: () => void;
  /** 重置坍缩殿升级等级 */
  onResetCollapseUpgrades: () => void;
  /** 重置永劫殿升级等级 */
  onResetRebirthUpgrades: () => void;
  onResetProgress: () => void;
}

/** 全部弹窗：数值商殿 / 永劫商殿 / 坍缩商殿 / 奇趣商殿 / 永劫 / 坍缩 */
export const GameModals: React.FC<GameModalsProps> = ({
  modals,
  state,
  currentValue,
  collapseGain,
  onUnlockUpgrade,
  onUpgradeLevel,
  onUpgradeAll,
  onUnlockAchievements,
  onUnlockTitles,
  onBuyLevelCap,
  onBuyRebirthMergedUpgrade,
  onUnlockCollapse,
  onUnlockAfterlifeShop,
  onUnlockRanking,
  onBuyAutoUnlock,
  onExchangeAfterlifePoint,
  onBuyAfterlifeUpgrade,
  onBuyRebirthCapUpgrade,
  onUnlockOneKeyUpgrade,
  onLogin,
  onRegionSelected,
  onLogout,
  onBuyValueCap,
  onBuyRebirthPointLevel,
  onExchangeRebirthToCollapse,
  onGambleSettle,
  onGambleSettlePoints,
  onConfirmRebirth,
  onConfirmCollapse,
  onSetDebugValue,
  onSetRebirthPoints,
  onSetCollapsePoints,
  onResetAfterlifeUpgrades,
  onResetCollapseUpgrades,
  onResetRebirthUpgrades,
  onResetProgress,
}) => (
  <>
    {/* 数值商殿 Modal */}
    <ModalShell
      isOpen={modals.upgradeShop.isOpen}
      onClose={modals.upgradeShop.close}
      title="数 值 殿"
      subtitle="—— 先 启 封 印 · 方 可 习 炼 ——"
    >
      <UpgradesList
        state={state}
        currentValue={currentValue}
        onUnlock={onUnlockUpgrade}
        onUpgrade={onUpgradeLevel}
        onUpgradeAll={onUpgradeAll}
        achievementsUnlocked={state.achievementsUnlocked}
        titleUnlocked={state.titleUnlocked}
        onUnlockAchievements={onUnlockAchievements}
        onUnlockTitles={onUnlockTitles}
      />
    </ModalShell>

    {/* 永劫商殿 Modal */}
    <ModalShell
      isOpen={modals.rebirthShop.isOpen}
      onClose={modals.rebirthShop.close}
      title="永 劫 殿"
    >
      <RebirthShop
        state={state}
        onBuyRebirthMergedUpgrade={onBuyRebirthMergedUpgrade}
        onUnlockCollapse={onUnlockCollapse}
        onUnlockRanking={onUnlockRanking}
        onBuyAutoUnlock={onBuyAutoUnlock}
      />
    </ModalShell>

    {/* 坍缩商殿 Modal */}
    <ModalShell
      isOpen={modals.collapseShop.isOpen}
      onClose={modals.collapseShop.close}
      title="坍 缩 殿"
      subtitle="—— 一 元 复 始 · 上 限 突 破 ——"
    >
      <CollapseShop
        state={state}
        onBuyValueCap={onBuyValueCap}
        onBuyRebirthPointLevel={onBuyRebirthPointLevel}
        onBuyLevelCap={onBuyLevelCap}
        onExchangeRebirthToCollapse={onExchangeRebirthToCollapse}
        onUnlockAfterlifeShop={onUnlockAfterlifeShop}
        collapseGain={collapseGain}
        onOpenCollapse={() => {
          modals.collapseShop.close();
          modals.collapse.open();
        }}
      />
    </ModalShell>


    {/* 排行 Modal */}
    <ModalShell
      isOpen={modals.ranking.isOpen}
      onClose={modals.ranking.close}
      title="排 行"
      subtitle="—— 天 道 有 榜 · 各 归 其 位 ——"
      hideFooterClose
    >
      <Ranking
        state={state}
        onLogin={onLogin}
        onRegionSelected={onRegionSelected}
        onLogout={onLogout}
      />
    </ModalShell>

    {/* 奇趣商殿 Modal */}
    <ModalShell
      isOpen={modals.funShop.isOpen}
      onClose={modals.funShop.close}
      title="奇 趣 殿 · 博 弈 造 化"
    >
      <FunShop
        currentValue={currentValue}
        rebirthPoints={state.rebirthPoints || 0}
        collapsePoints={state.collapsePoints || 0}
        afterlifePoints={state.afterlifePoints || 0}
        onSettle={onGambleSettle}
        onSettlePoints={onGambleSettlePoints}
        onClose={modals.funShop.close}
      />
    </ModalShell>

    {/* 永劫 Modal */}
    <RebirthModal
      isOpen={modals.rebirth.isOpen}
      onClose={modals.rebirth.close}
      onConfirm={() => {
        onConfirmRebirth();
        modals.rebirth.close();
      }}
      currentValue={currentValue}
      currentRebirthCount={state.rebirthCount}
      rebirthPointBonus={getExtraRebirthPoints(state.rebirthPointLevel || 0, currentValue)}
      currentRebirthPoints={state.rebirthPoints || 0}
      rebirthPointsCap={getRebirthPointsCap(state.rebirthCapLevel || 0)}
    />

    {/* 往生殿 Modal */}
    <ModalShell
      isOpen={modals.afterlifeShop?.isOpen ?? false}
      onClose={modals.afterlifeShop?.close}
      title="往生殿"
      subtitle="数值殿升级消耗折扣 · 往生点兑换"
    >
      <AfterlifeShop
        state={state}
        onExchangeAfterlifePoint={onExchangeAfterlifePoint}
        onBuyAfterlifeUpgrade={onBuyAfterlifeUpgrade}
        onBuyRebirthCapUpgrade={onBuyRebirthCapUpgrade}
        onUnlockOneKeyUpgrade={onUnlockOneKeyUpgrade}
      />
    </ModalShell>

    {/* 坍缩 Modal */}
    <CollapseModal
      isOpen={modals.collapse.isOpen}
      onClose={modals.collapse.close}
      onConfirm={() => {
        onConfirmCollapse();
        modals.collapse.close();
      }}
      currentRebirthPoints={state.rebirthPoints}
      currentCollapsePoints={state.collapsePoints}
      collapseGain={collapseGain}
    />

    {/* 成就 Modal */}
    <AchievementsModal
      isOpen={modals.achievements.isOpen}
      onClose={modals.achievements.close}
      state={state}
    />

    {/* 称号详情 Modal */}
    <ModalShell
      isOpen={modals.title.isOpen}
      onClose={modals.title.close}
      title="称 号"
      subtitle="—— 天 道 授 名 · 各 有 其 位 ——"
    >
      <TitleModal state={state} />
    </ModalShell>

    {/* 设置 Modal */}
    <SettingsModal
      isOpen={modals.settings.isOpen}
      onClose={modals.settings.close}
      onSetValue={onSetDebugValue}
      onSetRebirthPoints={onSetRebirthPoints}
      onSetCollapsePoints={onSetCollapsePoints}
      onResetAfterlifeUpgrades={onResetAfterlifeUpgrades}
      onResetCollapseUpgrades={onResetCollapseUpgrades}
      onResetRebirthUpgrades={onResetRebirthUpgrades}
      onResetProgress={onResetProgress}
      currentValue={currentValue}
    />
  </>
);
