import React from 'react';
import { BigNum } from '../utils/bigNumber';
import { GameState, UpgradeId, UserAccountData } from '../types';
import { GameModalsState } from '../hooks/useGameModals';
import { REBIRTH_BASE_ATTR_PURCHASE_GAINS } from '../config';
import { FunShop, SettleType } from './FunShop';
import { ModalShell } from './ModalShell';
import { UpgradesList } from './UpgradesList';
import { RebirthShop } from './RebirthShop';
import { CollapseShop } from './CollapseShop';
import { GoodsShop } from './GoodsShop';
import { Inventory } from './Inventory';
import { Ranking } from './Ranking';
import { AchievementsModal } from './AchievementsModal';
import { RebirthModal } from './RebirthModal';
import { CollapseModal } from './CollapseModal';
import { SettingsModal } from './SettingsModal';

interface GameModalsProps {
  modals: GameModalsState;
  state: GameState;
  currentValue: BigNum;
  collapseGain: number;
  onUnlockUpgrade: (id: UpgradeId, cost: BigNum) => void;
  onUpgradeLevel: (id: UpgradeId, cost: BigNum) => void;
  onBuyLevelCap: (id: UpgradeId) => void;
  onBuyRebirthBaseAttr: (key: keyof typeof REBIRTH_BASE_ATTR_PURCHASE_GAINS) => void;
  onUnlockCollapse: () => void;
  /** 消耗 1 点永劫点数解锁万物店 */
  onUnlockGoodsShop: () => void;
  /** 消耗 3 点永劫点数解锁背包 */
  onUnlockInventory: () => void;
  /** 消耗 1 点永劫点数解锁排行 */
  onUnlockRanking: () => void;
  /** 消耗 1 点永劫点数购买「功法无需解锁」特权 */
  onBuyAutoUnlock: () => void;
  /** 排行·登顶：注册/登录 */
  onLogin: (account: UserAccountData) => void;
  /** 排行·登顶：入驻大区 */
  onRegionSelected: (regionId: string, regionName: string) => void;
  onBuyValueCap: () => void;
  /** 购买「永劫点数获取」 */
  onBuyRebirthPointLevel: () => void;
  /** 永劫点数兑换坍缩点数 */
  onExchangeRebirthToCollapse: () => void;
  /** 万物店：花费当前数值购置商品 */
  onBuyGoods: (id: string, name: string, cost: BigNum) => void;
  /** 背包：变卖 1 件已购商品 */
  onSellGoods: (id: string, name: string, price: BigNum) => void;
  /** 背包：变卖全部已购商品 */
  onSellAllGoods: () => void;
  onGambleSettle: (type: SettleType, amount: BigNum) => void;
  onConfirmRebirth: () => void;
  onConfirmCollapse: () => void;
  onSetDebugValue: (val: BigNum) => void;
  /** 调试：直接设置永劫点数 */
  onSetRebirthPoints: (n: number) => void;
  /** 调试：直接设置坍缩点数 */
  onSetCollapsePoints: (n: number) => void;
  onResetProgress: () => void;
}

/** 全部弹窗：数值商店 / 永劫商店 / 坍缩商店 / 奇趣商店 / 永劫 / 坍缩 */
export const GameModals: React.FC<GameModalsProps> = ({
  modals,
  state,
  currentValue,
  collapseGain,
  onUnlockUpgrade,
  onUpgradeLevel,
  onBuyLevelCap,
  onBuyRebirthBaseAttr,
  onUnlockCollapse,
  onUnlockGoodsShop,
  onUnlockInventory,
  onUnlockRanking,
  onBuyAutoUnlock,
  onLogin,
  onRegionSelected,
  onBuyValueCap,
  onBuyRebirthPointLevel,
  onExchangeRebirthToCollapse,
  onBuyGoods,
  onSellGoods,
  onSellAllGoods,
  onGambleSettle,
  onConfirmRebirth,
  onConfirmCollapse,
  onSetDebugValue,
  onSetRebirthPoints,
  onSetCollapsePoints,
  onResetProgress,
}) => (
  <>
    {/* 数值商店 Modal */}
    <ModalShell
      isOpen={modals.upgradeShop.isOpen}
      onClose={modals.upgradeShop.close}
      title="数 值 店"
      subtitle="—— 先 启 封 印 · 方 可 习 炼 ——"
    >
      <UpgradesList
        state={state}
        currentValue={currentValue}
        onUnlock={onUnlockUpgrade}
        onUpgrade={onUpgradeLevel}
      />
    </ModalShell>

    {/* 永劫商店 Modal */}
    <ModalShell
      isOpen={modals.rebirthShop.isOpen}
      onClose={modals.rebirthShop.close}
      title="永 劫 店"
    >
      <RebirthShop
        state={state}
        collapseGain={collapseGain}
        onBuyRebirthBaseAttr={onBuyRebirthBaseAttr}
        onUnlockCollapse={onUnlockCollapse}
        onUnlockGoodsShop={onUnlockGoodsShop}
        onUnlockInventory={onUnlockInventory}
        onUnlockRanking={onUnlockRanking}
        onBuyAutoUnlock={onBuyAutoUnlock}
        onOpenCollapse={() => {
          modals.rebirthShop.close();
          modals.collapse.open();
        }}
      />
    </ModalShell>

    {/* 坍缩商店 Modal */}
    <ModalShell
      isOpen={modals.collapseShop.isOpen}
      onClose={modals.collapseShop.close}
      title="坍 缩 店"
      subtitle="—— 一 元 复 始 · 上 限 突 破 ——"
    >
      <CollapseShop
        state={state}
        onBuyValueCap={onBuyValueCap}
        onBuyRebirthPointLevel={onBuyRebirthPointLevel}
        onBuyLevelCap={onBuyLevelCap}
        onExchangeRebirthToCollapse={onExchangeRebirthToCollapse}
      />
    </ModalShell>

    {/* 万物店 Modal */}
    <ModalShell
      isOpen={modals.goodsShop.isOpen}
      onClose={modals.goodsShop.close}
      title="万 物 店"
      subtitle="—— 一 掷 千 金 · 万 物 可 购 ——"
    >
      <GoodsShop state={state} currentValue={currentValue} onBuy={onBuyGoods} />
    </ModalShell>

    {/* 背包 Modal */}
    <ModalShell
      isOpen={modals.inventory.isOpen}
      onClose={modals.inventory.close}
      title="背 包"
      subtitle="—— 万 物 入 囊 · 变 卖 折 现 ——"
    >
      <Inventory
        state={state}
        currentValue={currentValue}
        onSell={onSellGoods}
        onSellAll={onSellAllGoods}
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
      <Ranking state={state} onLogin={onLogin} onRegionSelected={onRegionSelected} />
    </ModalShell>

    {/* 奇趣商店 Modal */}
    <ModalShell
      isOpen={modals.funShop.isOpen}
      onClose={modals.funShop.close}
      title="奇 趣 店 · 博 弈 造 化"
    >
      <FunShop
        currentValue={currentValue}
        onSettle={onGambleSettle}
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
    />

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

    {/* 设置 Modal */}
    <SettingsModal
      isOpen={modals.settings.isOpen}
      onClose={modals.settings.close}
      onSetValue={onSetDebugValue}
      onSetRebirthPoints={onSetRebirthPoints}
      onSetCollapsePoints={onSetCollapsePoints}
      onResetProgress={onResetProgress}
      currentValue={currentValue}
    />
  </>
);
