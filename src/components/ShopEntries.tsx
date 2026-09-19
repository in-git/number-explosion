import React from 'react';
import {
  Dices,
  Infinity as InfinityIcon,
  Orbit,
  RefreshCw,
  Settings,
  ShoppingBag,
  Store,
  Trophy,
} from 'lucide-react';
import { GameState } from '../types';

interface ShopEntriesProps {
  state: GameState;
  canRebirth: boolean;
  canCollapse: boolean;
  onOpenUpgradeShop: () => void;
  onOpenRebirthShop: () => void;
  onOpenFunShop: () => void;
  onOpenCollapseShop: () => void;
  /** 万物店入口：解锁后开放 */
  onOpenGoodsShop: () => void;
  /** 重生入口：弹窗内可继续转入坍缩 */
  onOpenRebirthModal: () => void;
  /** 成就面板入口（累计点击成就） */
  onOpenAchievementsModal: () => void;
  /** 设置面板入口 */
  onOpenSettingsModal: () => void;
}

/** 商店卡片：同一排铺满，列宽自适应，内部为上下结构（图标在上、文字在下） */
const SHOP_CARD =
  'flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all text-center';
/** 商店网格：固定一排三个，超出换行 */
const SHOP_GRID = 'grid gap-2 grid-cols-3';
const SHOP_TITLE =
  'text-[11px] sm:text-sm font-serif font-bold tracking-[0.1em] sm:tracking-[0.2em] text-[#ded7cb] leading-tight';

/** 功能卡片：列表排布，一行一个 */
const LIST_CARD =
  'flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all text-left';
const LIST_TITLE =
  'text-sm font-serif font-bold tracking-[0.2em] text-[#ded7cb] whitespace-nowrap';

export const ShopEntries: React.FC<ShopEntriesProps> = ({
  state,
  canRebirth,
  canCollapse,
  onOpenUpgradeShop,
  onOpenRebirthShop,
  onOpenFunShop,
  onOpenCollapseShop,
  onOpenGoodsShop,
  onOpenRebirthModal,
  onOpenAchievementsModal,
  onOpenSettingsModal,
}) => {
  // 重生商店：重生之道开启后才出现；坍缩商店：解锁坍缩后即出现（无需先坍缩一次）
  const rebirthShopUnlocked = state.rebirthUnlocked || state.rebirthPoints > 0;
  const collapseShopUnlocked = state.collapseUnlocked || state.collapsePoints > 0;
  const canOpenRebirth = canRebirth || canCollapse;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 flex flex-col gap-2">
      {/* 商店：同一排网格 */}
      <div className={SHOP_GRID}>
        {/* 升级商店 */}
        <button
          id="btn-open-upgrade-shop"
          onClick={onOpenUpgradeShop}
          className={`${SHOP_CARD} bg-[#1a1816] border-[#332e27] hover:border-[#5b5142] active:translate-y-0.5 cursor-pointer`}
        >
          <Store size={18} className="text-[#8c8273] flex-shrink-0" />
          <div className={SHOP_TITLE}>数 值 店</div>
        </button>

        {/* 重生商店：解锁后才显示 */}
        {rebirthShopUnlocked && (
          <button
            id="btn-open-rebirth-shop"
            onClick={onOpenRebirthShop}
            className={`${SHOP_CARD} bg-[#1a1816] border-[#3a3226] hover:border-[#6b5a3f] active:translate-y-0.5 cursor-pointer`}
          >
            <RefreshCw size={18} className="text-[#8c8273] flex-shrink-0" />
            <div className={SHOP_TITLE}>重 生 店</div>
          </button>
        )}

        {/* 奇趣商店 */}
        <button
          id="btn-open-fun-shop"
          onClick={onOpenFunShop}
          className={`${SHOP_CARD} bg-[#1a1816] border-[#332e27] hover:border-[#5b5142] active:translate-y-0.5 cursor-pointer`}
        >
          <Dices size={18} className="text-[#8c8273] flex-shrink-0" />
          <div className={SHOP_TITLE}>奇 趣 店</div>
        </button>

        {/* 坍缩商店：解锁后才显示 */}
        {collapseShopUnlocked && (
          <button
            id="btn-open-collapse-shop"
            onClick={onOpenCollapseShop}
            className={`${SHOP_CARD} bg-[#1b1622] border-[#4a2e5e] hover:border-[#8938b8] active:translate-y-0.5 cursor-pointer`}
          >
            <Orbit size={18} className="text-[#8c8273] flex-shrink-0" />
            <div className={SHOP_TITLE}>坍 缩 店</div>
          </button>
        )}

        {/* 万物店：解锁后才显示 */}
        {state.goodsShopUnlocked && (
          <button
            id="btn-open-goods-shop"
            onClick={onOpenGoodsShop}
            className={`${SHOP_CARD} bg-[#1a1816] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer`}
          >
            <ShoppingBag size={18} className="text-[#8c8273] flex-shrink-0" />
            <div className={SHOP_TITLE}>万 物 店</div>
          </button>
        )}
      </div>

      {/* 重生 / 成就 / 设置：依旧是列表，一行一个 */}
      <div className="flex flex-col gap-2">
        {/* 重生（内含坍缩入口） */}
        <button
          id="btn-open-rebirth"
          onClick={onOpenRebirthModal}
          disabled={!canOpenRebirth}
          className={`${LIST_CARD} ${
            canOpenRebirth
              ? 'bg-[#1a1816] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer'
              : 'bg-[#171513] border-[#2b2721] cursor-not-allowed'
          }`}
        >
          <div
            className={`text-sm font-serif font-bold tracking-[0.2em] whitespace-nowrap ${
              canOpenRebirth ? 'text-[#ded7cb]' : 'text-[#6b6455]'
            }`}
          >
            重 生
          </div>
          <InfinityIcon size={18} className="text-[#8c8273] flex-shrink-0" />
        </button>

        {/* 成就（累计点击成就） */}
        <button
          id="btn-open-achievements"
          onClick={onOpenAchievementsModal}
          className={`${LIST_CARD} bg-[#1a1715] border-[#4a3a24] hover:border-[#8a653f] active:translate-y-0.5 cursor-pointer`}
        >
          <div className={LIST_TITLE}>成 就</div>
          <Trophy size={18} className="text-[#8c8273] flex-shrink-0" />
        </button>

        {/* 设置（数值设定 / 重修道途） */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettingsModal}
          className={`${LIST_CARD} bg-[#161a1f] border-[#2c3440] hover:border-[#4a8db8] active:translate-y-0.5 cursor-pointer`}
        >
          <div className={LIST_TITLE}>设 置</div>
          <Settings size={18} className="text-[#8c8273] flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};
