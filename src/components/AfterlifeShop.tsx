import React from 'react';
import { GameState, UpgradeId } from '../types';
import { UPGRADE_ORDER } from '../config';
import {
  UPGRADE_METADATA,
  getAfterlifeUpgradeCost,
  getAfterlifeDiscountPercent,
  getAfterlifeNextDiscount,
} from '../utils/gameMath';
import { UpgradeButton } from './UpgradeButton';
import { PressableRow } from './PressableRow';

interface AfterlifeShopProps {
  state: GameState;
  /** 消耗 10 点坍缩点兑换 1 点往生点 */
  onExchangeAfterlifePoint: () => void;
  /** 购买指定属性的下一级往生加护（消耗往生点，按斐波那契递增） */
  onBuyAfterlifeUpgrade: (id: UpgradeId) => void;
}

export const AfterlifeShop: React.FC<AfterlifeShopProps> = ({
  state,
  onExchangeAfterlifePoint,
  onBuyAfterlifeUpgrade,
}) => {
  // 仅列出数值殿中「可升级（有消耗）」的属性；autoClickUnlock 为解锁项、无升级消耗，故不列入
  const order = UPGRADE_ORDER.filter((id) => id !== 'autoClickUnlock');
  const canExchange = state.collapsePoints >= 10;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-mono text-[#8a7a63]">
          坍缩点数 <span className="text-[#5b9bd8]">{state.collapsePoints}</span>
        </div>
        <div className="text-[10px] font-mono text-[#8a7a63]">
          往生点 <span className="text-[#d897fa]">{state.afterlifePoints}</span>
        </div>
      </div>

      {/* 兑换往生点：10 坍缩点 → 1 往生点 */}
      <PressableRow
        id="afterlife-item-exchange"
        disabled={!canExchange}
        onPress={() => {
          if (canExchange) onExchangeAfterlifePoint();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canExchange ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              兑换往生点
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            10 坍缩点 → 1 往生点
          </div>
        </div>

        <UpgradeButton id="btn-afterlife-exchange" disabled={!canExchange}>
          兑换
        </UpgradeButton>
      </PressableRow>

      <div className="flex flex-col gap-1.5">
        {order.map((id) => {
          const meta = UPGRADE_METADATA[id];
          const level = state.afterlifeUpgradeLevels?.[id] || 0;
          const current = getAfterlifeDiscountPercent(level);
          const next = getAfterlifeNextDiscount(level);
          const cost = getAfterlifeUpgradeCost(level);
          const canBuy = state.afterlifePoints >= cost;

          return (
            <PressableRow
              key={id}
              id={`afterlife-item-${id}`}
              disabled={!canBuy}
              onPress={() => {
                if (canBuy) onBuyAfterlifeUpgrade(id);
              }}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                    {meta.name}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
                    Lv.{level}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
                  降低 <span className="text-[#8c8273]">[数值殿]</span> 升级消耗{' '}
                  <span className="text-[#d897fa] font-mono font-bold">
                    -{current.toFixed(1)}% → -{next.toFixed(1)}%
                  </span>
                </div>
              </div>

              <UpgradeButton id={`btn-afterlife-${id}`} disabled={!canBuy}>
                {cost} 点
              </UpgradeButton>
            </PressableRow>
          );
        })}
      </div>

      <div className="text-[10px] font-serif text-[#6f6656] text-center pt-0.5">
        每属性独立折扣 · 折扣按斐波那契递增 · 消耗 1,2,3,5,8… 往生点 · 重生不退回
      </div>
    </div>
  );
};
