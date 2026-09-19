import React from 'react';
import { GameState } from '../types';
import { COLLAPSE_COST } from '../utils/gameMath';
import {
  GOODS_SHOP_UNLOCK_COST,
  INVENTORY_UNLOCK_COST,
  RANKING_UNLOCK_COST,
  INITIAL_REBIRTH_BASE_ATTRS,
  REBIRTH_BASE_ATTR_LABELS,
  REBIRTH_BASE_ATTR_PURCHASE_GAINS,
} from '../config';
import { UpgradeButton } from './UpgradeButton';

type AttrKey = keyof typeof REBIRTH_BASE_ATTR_LABELS;

interface RebirthShopProps {
  state: GameState;
  collapseGain: number;
  /** 消耗 1 点永劫点数，单独升级某项永劫基础属性 */
  onBuyRebirthBaseAttr: (key: AttrKey) => void;
  /** 消耗 5 点永劫值解锁坍缩 */
  onUnlockCollapse: () => void;
  /** 已解锁后打开坍缩弹窗 */
  onOpenCollapse: () => void;
  /** 消耗 1 点永劫点数解锁万物店 */
  onUnlockGoodsShop: () => void;
  /** 消耗 3 点永劫点数解锁背包 */
  onUnlockInventory: () => void;
  /** 消耗 1 点永劫点数解锁排行 */
  onUnlockRanking: () => void;
}

/** 商店中每项基础的展示信息：当前值文案 + 单次提升文案 */
const ATTR_DISPLAY: Record<AttrKey, { current: (v: number) => string; gain: string }> = {
  baseValue: { current: (v) => `当前 +${v.toFixed(0)}`, gain: '+5' },
  autoFrequency: { current: (v) => `当前 +${v.toFixed(0)} 级`, gain: '+1 级' },
  critMultiplier: { current: (v) => `当前 +${(v * 100).toFixed(0)}%`, gain: '+50%' },
  critChance: { current: (v) => `当前 +${(v * 100).toFixed(0)}%`, gain: '+5%' },
  comboChance: { current: (v) => `当前 +${(v * 100).toFixed(0)}%`, gain: '+5%' },
  comboMultiplier: { current: (v) => `当前 +${(v * 100).toFixed(0)}%`, gain: '+50%' },
};

const ATTR_ORDER: AttrKey[] = [
  'baseValue',
  'autoFrequency',
  'critMultiplier',
  'critChance',
  'comboChance',
  'comboMultiplier',
];

export const RebirthShop: React.FC<RebirthShopProps> = ({
  state,
  collapseGain,
  onBuyRebirthBaseAttr,
  onUnlockCollapse,
  onOpenCollapse,
  onUnlockGoodsShop,
  onUnlockInventory,
  onUnlockRanking,
}) => {
  const canBuy = state.rebirthPoints >= 1;
  const canUnlockCollapse = !state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const canCollapse = state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const canUnlockInventory = state.rebirthPoints >= INVENTORY_UNLOCK_COST;
  const canUnlockRanking = state.rebirthPoints >= RANKING_UNLOCK_COST;

  const rebirthBase = state.rebirthBaseAttrs || INITIAL_REBIRTH_BASE_ATTRS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-serif text-[#6f6656]">
          左侧为功效 · 右侧为消耗（点击整行购买）
        </div>
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数 <span className="text-[#5fa8e6]">{state.rebirthPoints}</span>
        </div>
      </div>

      {/* 升级：永劫基础属性（逐项单独升级） */}
      <div className="flex flex-col gap-1.5">
        {ATTR_ORDER.map((key) => {
          const label = REBIRTH_BASE_ATTR_LABELS[key];
          const display = ATTR_DISPLAY[key];

          return (
            <div
              key={key}
              id={`shop-item-rebirth-attr-${key}`}
              onClick={() => {
                if (canBuy) onBuyRebirthBaseAttr(key);
              }}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                    {label}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                  每次 {display.gain} · {display.current(rebirthBase[key])}
                </div>
              </div>

              <UpgradeButton
                id={`btn-shop-rebirth-attr-${key}`}
                disabled={!canBuy}
              >
                1 点
              </UpgradeButton>
            </div>
          );
        })}
      </div>

      {/* 解锁万物店：以数值购置万物（默认不显示） */}
      {!state.goodsShopUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-goods"
            onClick={() => {
              if (canBuy) onUnlockGoodsShop();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁万物店
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                开张万物店 · 自此可以数值购置万物
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-goods" disabled={!canBuy}>
              {GOODS_SHOP_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁背包：开启后方可在万物店购置商品（默认不显示） */}
      {!state.inventoryUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-inventory"
            onClick={() => {
              if (canUnlockInventory) onUnlockInventory();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockInventory ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁背包
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                开启行囊 · 方可在万物店购置万物
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-inventory" disabled={!canUnlockInventory}>
              {INVENTORY_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁排行：开启天榜（默认不显示） */}
      {!state.rankingUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-ranking"
            onClick={() => {
              if (canUnlockRanking) onUnlockRanking();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockRanking ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁排行
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                开启天榜 · 查看数值 / 富豪 / 时长 / 重生排行
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-ranking" disabled={!canUnlockRanking}>
              {RANKING_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 最底部：解锁坍缩 / 进行坍缩 */}
      <div className="pt-1.5 border-t border-[#2d2822]">
        {state.collapseUnlocked ? (
          <div
            id="shop-item-collapse"
            onClick={() => {
              if (canCollapse) onOpenCollapse();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#1b1622] border border-[#3c2a4a] transition-colors ${
              canCollapse ? 'cursor-pointer hover:bg-[#241a2e] hover:border-[#6a3f8a]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  太虚坍缩
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a1d36] border border-[#4a2e5e] text-[#d897fa] flex-shrink-0">
                  已觉醒
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                献祭 {COLLAPSE_COST} 点永劫值 · 本次凝练 +{collapseGain} 重（现有坍缩{' '}
                {state.collapsePoints} 重）
              </div>
            </div>

            <UpgradeButton
              id="btn-shop-collapse"
              disabled={!canCollapse}
            >
              {COLLAPSE_COST} 点
            </UpgradeButton>
          </div>
        ) : (
          <div
            id="shop-item-unlock-collapse"
            onClick={() => {
              if (canUnlockCollapse) onUnlockCollapse();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockCollapse ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁坍缩
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未觉醒
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                觉醒太虚坍缩秘境 · 解锁后方可献祭永劫值进行坍缩
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-collapse" disabled={!canUnlockCollapse}>
              {COLLAPSE_COST} 点
            </UpgradeButton>
          </div>
        )}
      </div>
    </div>
  );
};
