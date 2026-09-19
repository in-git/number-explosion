import React, { useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { GameState } from '../types';
import { GOODS_CATEGORIES, INVENTORY_UNLOCK_COST } from '../config';
import { getGoodsPrice } from '../utils/gameMath';

interface GoodsShopProps {
  state: GameState;
  currentValue: BigNum;
  /** 购买商品：按当前售价扣除数值 */
  onBuy: (id: string, name: string, cost: BigNum) => void;
}

/** 分类筛选：全部 + 各分类 */
type FilterId = 'all' | string;

/** 万物店：顶部 tabbar 筛选分类，商品以卡片呈现（一排三个） */
export const GoodsShop: React.FC<GoodsShopProps> = ({ state, currentValue, onBuy }) => {
  const [filter, setFilter] = useState<FilterId>('all');
  const purchases = state.goodsPurchases || {};
  // 未解锁背包：不可购置任何商品
  const unlocked = !!state.inventoryUnlocked;

  const tabs: { id: FilterId; label: string }[] = [
    { id: 'all', label: '全部' },
    ...GOODS_CATEGORIES.map((c) => ({ id: c.id, label: c.name })),
  ];

  // 所有商品平铺在同一个卡片区域，仅按 tabbar 过滤
  const shownItems = GOODS_CATEGORIES.filter((c) => filter === 'all' || c.id === filter).flatMap(
    (c) => c.items
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* 顶部：当前数值 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <span className="text-[11px] font-serif text-[#6f6656]">当前数值</span>
        <span className="text-xs font-mono font-bold text-[#e8b56f]">
          {currentValue.formatChinese(2)}
        </span>
      </div>

      {/* 未解锁背包的简单提示 */}
      {!unlocked && (
        <div className="rounded-lg border border-[#5a2f2f] bg-[#261b1b] px-2.5 py-2 text-center text-[11px] font-serif text-[#d99797]">
          未解锁背包 · 暂不可购置（永劫商店消耗 {INVENTORY_UNLOCK_COST} 点永劫点数解锁）
        </div>
      )}

      {/* tabbar：分类筛选 */}
      <div className="grid grid-cols-5 gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`btn-goods-filter-${t.id}`}
            onClick={() => setFilter(t.id)}
            aria-pressed={filter === t.id}
            className={`py-1.5 rounded border text-[10px] font-serif font-bold text-center leading-tight transition-colors cursor-pointer ${
              filter === t.id
                ? 'bg-[#3d3428] border-[#736450] text-[#f2ede4]'
                : 'bg-[#1a1816] border-[#2b2721] text-[#7d7364] hover:border-[#453a2d] hover:text-[#b8aa98]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 商品卡片：全部平铺，一排三个 */}
      <div className="grid grid-cols-3 gap-2">
        {shownItems.map((item) => {
          const owned = purchases[item.id] || 0;
          // 每购一次，售价按斐波拉契递增
          const price = getGoodsPrice(item.cost, owned);
          const canBuy = unlocked && currentValue.gte(price);

          return (
            <button
              key={item.id}
              id={`goods-item-${item.id}`}
              onClick={() => {
                if (canBuy) onBuy(item.id, item.name, price);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 p-2 pt-2.5 rounded-lg border-2 text-center transition-all active:translate-y-0.5 ${
                canBuy
                  ? 'bg-[#211f1c] border-[#5b5142] hover:bg-[#2a2620] hover:border-[#8a653f] cursor-pointer'
                  : 'bg-[#1a1917] border-[#2b2926] opacity-75 cursor-not-allowed'
              }`}
            >
              {/* 已拥有：右上角显示数量 */}
              {owned > 0 && (
                <span className="absolute top-1 right-1 px-1 py-px rounded bg-[#3b3327] border border-[#6b5a3f] text-[10px] font-mono leading-none text-[#c9a86a]">
                  ×{owned}
                </span>
              )}

              {/* 标题：单行显示，超出隐藏 */}
              <span
                className={`w-full whitespace-nowrap overflow-hidden text-ellipsis font-serif font-bold text-[11px] sm:text-xs leading-tight ${
                  canBuy ? 'text-[#ded7cb]' : 'text-[#6f6961]'
                }`}
              >
                {item.name}
              </span>

              <span
                className={`font-mono text-[11px] font-bold ${
                  canBuy ? 'text-[#e8b56f]' : 'text-[#5c564e]'
                }`}
              >
                {price.formatChinese(2)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
