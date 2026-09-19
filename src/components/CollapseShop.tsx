import React from 'react';
import { GameState, UpgradeId } from '../types';
import {
  UPGRADE_METADATA,
  LEVEL_CAP_PER_POINT,
  getValueCap,
  getRebirthPointUpgradeCost,
  COLLAPSE_COST,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import { REBIRTH_SHOP_ORDER } from '../config';
import { UpgradeButton } from './UpgradeButton';

interface CollapseShopProps {
  state: GameState;
  onBuyValueCap: () => void;
  /** 购买「重生点数获取」：消耗按斐波拉契递增的坍缩点数，每次重生额外 +1 点 */
  onBuyRebirthPointLevel: () => void;
  /** 消耗 1 点坍缩点数，为指定功法 +50 级上限（由重生商店迁移而来） */
  onBuyLevelCap: (id: UpgradeId) => void;
}

export const CollapseShop: React.FC<CollapseShopProps> = ({
  state,
  onBuyValueCap,
  onBuyRebirthPointLevel,
  onBuyLevelCap,
}) => {
  const level = state.valueCapLevel || 0;
  const currentCap = getValueCap(level);
  const nextCap = getValueCap(level + 1);
  const canBuy = state.collapsePoints >= 1;

  // 重生点数获取：当前等级 + 下一级消耗（斐波拉契）
  const rpLevel = state.rebirthPointLevel || 0;
  const rpCost = getRebirthPointUpgradeCost(rpLevel);
  const canBuyRp = BigNum.fromNumber(state.collapsePoints).gte(rpCost);

  return (
    <div className="flex flex-col gap-2">
    


      {/* 重生点数获取：每次重生额外 +1 点，消耗斐波拉契递增的坍缩点数 */}
      <div
        id="shop-item-rebirth-point"
        onClick={() => {
          if (canBuyRp) onBuyRebirthPointLevel();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canBuyRp ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
              重生点数获取
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#d897fa] flex-shrink-0">
              当前 +{rpLevel}
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
            每次重生额外 +1 点重生点数 · 消耗按斐波拉契递增
          </div>
        </div>

        <UpgradeButton id="btn-buy-rebirth-point" disabled={!canBuyRp}>
          {rpCost.formatChinese(0)} 点
        </UpgradeButton>
      </div>

      {/* 数值上限翻倍（原坍缩商店项） */}
      <div
        id="shop-item-value-cap"
        onClick={() => {
          if (canBuy) onBuyValueCap();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] ">
              数值上限
            </span>
        
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif  mt-0.5">
            {currentCap.formatChinese(2)} → {nextCap.formatChinese(2)}
          </div>
        </div>

        <UpgradeButton
          id="btn-buy-value-cap"
          disabled={!canBuy}
        >
          1 点
        </UpgradeButton>
      </div>

      {/* 功法等级上限（由重生商店迁移而来，消耗坍缩点） */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#2d2822]">
        <div className="text-[10px] font-serif text-[#6f6656] px-1">
          —— 功法等级上限（消耗坍缩点）——
        </div>
        {REBIRTH_SHOP_ORDER.map((id) => {
          const meta = UPGRADE_METADATA[id];
          const up = state.upgrades[id];

          return (
            <div
              key={id}
              id={`shop-item-${id}`}
              onClick={() => {
                if (canBuy) onBuyLevelCap(id);
              }}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                    {meta.name}
                  </span>
                  <span className='text-xs'>
                    Lv.{up.level} 
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif  mt-0.5">
                  等级上限 +{LEVEL_CAP_PER_POINT} 级
                  {up.capBonus || 0} 次
                </div>
              </div>

              <UpgradeButton
                id={`btn-shop-cap-${id}`}
                disabled={!canBuy}
              >
                1 点
              </UpgradeButton>
            </div>
          );
        })}
      </div>
    </div>
  );
};
