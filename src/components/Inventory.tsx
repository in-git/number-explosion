import React from 'react';
import { BigNum } from '../utils/bigNumber';
import { GameState } from '../types';
import { GOODS_CATEGORIES } from '../config';
import { GOODS_SELL_RATE, getGoodsSellPrice } from '../utils/gameMath';

interface InventoryProps {
  state: GameState;
  currentValue: BigNum;
  /** 出售 1 件 */
  onSell: (id: string, name: string, price: BigNum) => void;
  /** 出售全部 */
  onSellAll: () => void;
}

/** 背包：陈列已购商品，可按原价 10% 变卖 */
export const Inventory: React.FC<InventoryProps> = ({
  state,
  currentValue,
  onSell,
  onSellAll,
}) => {
  const purchases = state.goodsPurchases || {};

  const ownedItems = GOODS_CATEGORIES.flatMap((c) => c.items)
    .map((item) => ({ item, owned: purchases[item.id] || 0 }))
    .filter((row) => row.owned > 0);

  const totalValue = ownedItems.reduce(
    (sum, row) => sum.add(getGoodsSellPrice(row.item.cost).mulScalar(row.owned)),
    new BigNum(0, 0)
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* 顶部：当前数值 + 全部变卖 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <span className="text-[11px] font-serif text-[#6f6656]">当前数值</span>
        <span className="text-xs font-mono font-bold text-[#e8b56f]">
          {currentValue.formatChinese(2)}
        </span>
      </div>

      {/* 累计购置总价值 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-serif text-[#6f6656]">累计购置总价值</span>
        <span className="text-[11px] font-mono text-[#c9a86a]">
          {BigNum.fromData(state.goodsTotalSpent).formatChinese(2)}
        </span>
      </div>

      {ownedItems.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-[11px] font-serif tracking-[0.2em] text-[#595043] mb-1">
            —— 囊 中 空 空 ——
          </div>
          <div className="text-[11px] text-[#807565] font-serif">
            在万物店购置后，方可在此变卖
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-serif text-[#6f6656]">
              共 {ownedItems.length} 种 · 全卖可得 {totalValue.formatChinese(2)}（原价 {GOODS_SELL_RATE * 100}%）
            </span>
            <button
              id="btn-inventory-sell-all"
              onClick={onSellAll}
              className="px-2.5 py-1 rounded border border-[#6b5a3f] bg-[#3b3327] hover:bg-[#4a3f2e] text-[10px] font-serif text-[#e8dcc6] cursor-pointer whitespace-nowrap"
            >
              全部变卖
            </button>
          </div>

          {/* 商品卡片：一排三个 */}
          <div className="grid grid-cols-3 gap-2">
            {ownedItems.map(({ item, owned }) => {
              const price = getGoodsSellPrice(item.cost);

              return (
                <button
                  key={item.id}
                  id={`inventory-item-${item.id}`}
                  onClick={() => onSell(item.id, item.name, price)}
                  className="relative flex flex-col items-center justify-center gap-1 p-2 pt-2.5 rounded-lg border-2 text-center bg-[#211f1c] border-[#5b5142] hover:bg-[#2a2620] hover:border-[#8a653f] transition-all active:translate-y-0.5 cursor-pointer"
                >
                  {/* 拥有数量：右上角 */}
                  <span className="absolute top-1 right-1 px-1 py-px rounded bg-[#3b3327] border border-[#6b5a3f] text-[10px] font-mono leading-none text-[#c9a86a]">
                    ×{owned}
                  </span>

                  {/* 名称：单行截断 */}
                  <span className="w-full whitespace-nowrap overflow-hidden text-ellipsis font-serif font-bold text-[11px] sm:text-xs leading-tight text-[#ded7cb]">
                    {item.name}
                  </span>

                  <span className="font-mono text-[11px] font-bold text-[#e8b56f]">
                    {price.formatChinese(2)}
                  </span>

                  <span className="text-[10px] font-serif text-[#7d7364]">点击变卖</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
