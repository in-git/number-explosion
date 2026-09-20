import React from 'react';
import { GameState, UpgradeId } from '../types';
import {
  UPGRADE_METADATA,
  LEVEL_CAP_PER_POINT,
  getValueCap,
  getValueCapStep,
  getValueCapCost,
  getRebirthPointUpgradeCost,
  getRebirthToCollapseCost,
  REBIRTH_TO_COLLAPSE_FREE_TIMES,
  COLLAPSE_COST,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import {
  INVENTORY_UNLOCK_COST,
  AFTERLIFE_SHOP_UNLOCK_COST,
  REBIRTH_SHOP_ORDER,
} from '../config';
import { UpgradeButton } from './UpgradeButton';
import { PressableRow } from './PressableRow';

interface CollapseShopProps {
  state: GameState;
  onBuyValueCap: () => void;
  /** 购买「永劫点数获取」：消耗按斐波拉契递增的坍缩点数，每次永劫额外 +1 点 */
  onBuyRebirthPointLevel: () => void;
  /** 消耗 1 点坍缩点数，为指定功法 +50 级上限（由永劫商店迁移而来） */
  onBuyLevelCap: (id: UpgradeId) => void;
  /** 消耗永劫点数兑换 1 点坍缩点数（前 50 次 3 点，之后按 50+斐波拉契 递增） */
  onExchangeRebirthToCollapse: () => void;
  /** 消耗 3 点永劫点数解锁背包 */
  onUnlockInventory: () => void;
  /** 消耗 20 点坍缩点数解锁往生店 */
  onUnlockAfterlifeShop: () => void;
  /** 本次坍缩可凝练的重数 */
  collapseGain: number;
  /** 打开坍缩确认弹窗 */
  onOpenCollapse: () => void;
}

export const CollapseShop: React.FC<CollapseShopProps> = ({
  state,
  onBuyValueCap,
  onBuyRebirthPointLevel,
  onBuyLevelCap,
  onExchangeRebirthToCollapse,
  onUnlockInventory,
  onUnlockAfterlifeShop,
  collapseGain,
  onOpenCollapse,
}) => {
  const level = state.valueCapLevel || 0;
  const currentCap = getValueCap(level);
  const nextCap = getValueCap(level + 1);
  const nextStep = getValueCapStep(level + 1);
  const valueCapCost = getValueCapCost(level + 1);
  const canBuy = state.collapsePoints >= valueCapCost.toNumber();

  // 永劫点数 → 坍缩点数兑换
  const exchanged = state.rebirthToCollapseCount || 0;
  const exchangeCost = getRebirthToCollapseCost(exchanged);
  const exchangeCostNum = exchangeCost.toNumber();
  const canExchange = Number.isFinite(exchangeCostNum) && state.rebirthPoints >= exchangeCostNum;
  const cheapLeft = Math.max(0, REBIRTH_TO_COLLAPSE_FREE_TIMES - exchanged);

  // 永劫点数获取：当前等级 + 下一级消耗（斐波拉契）
  const rpLevel = state.rebirthPointLevel || 0;
  const rpCost = getRebirthPointUpgradeCost(rpLevel);
  const canBuyRp = BigNum.fromNumber(state.collapsePoints).gte(rpCost);

  // 进行坍缩：献祭永劫点数凝练坍缩重数
  const canCollapse = state.rebirthPoints >= COLLAPSE_COST;

  // 解锁项（消耗永劫点数）
  const canUnlockInventory = state.rebirthPoints >= INVENTORY_UNLOCK_COST;
  // 往生店：消耗坍缩点（非永劫点）解锁
  const canUnlockAfterlifeShop = state.collapsePoints >= AFTERLIFE_SHOP_UNLOCK_COST;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
      
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数 <span className="text-[#5fa8e6]">{state.rebirthPoints}</span> · 坍缩点数{' '}
          <span className="text-[#5b9bd8]">{state.collapsePoints}</span>
        </div>
      </div>

      {/* 兑换：永劫点数 → 坍缩点数（前 50 次 3 点，之后按 50+斐波拉契 递增） */}
      <PressableRow
        id="shop-item-exchange-collapse"
        disabled={!canExchange}
        onPress={() => {
          if (canExchange) onExchangeRebirthToCollapse();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#161d2b] border border-[#2e4a6e] transition-colors ${
          canExchange ? 'cursor-pointer hover:bg-[#1c2940] hover:border-[#3f7fd0]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              点化坍缩
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#1d2a3a] border border-[#2e4a6e] text-[#5b9bd8] flex-shrink-0">
              已兑换 {exchanged} 次
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            {exchangeCost.formatChinese(0)} 永劫点数 兑换 1 点坍缩点数
   
          </div>
        </div>

        <UpgradeButton id="btn-exchange-collapse" disabled={!canExchange}>
          {exchangeCost.formatChinese(0)} 点
        </UpgradeButton>
      </PressableRow>

      {/* 永劫点数获取：每次永劫额外 +1 点，消耗斐波拉契递增的坍缩点数 */}
      <PressableRow
        id="shop-item-rebirth-point"
        disabled={!canBuyRp}
        onPress={() => {
          if (canBuyRp) onBuyRebirthPointLevel();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canBuyRp ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              永劫爆炸
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            每次永劫点额外 +1
          </div>
        </div>

        <UpgradeButton id="btn-buy-rebirth-point" disabled={!canBuyRp}>
          {rpCost.formatChinese(0)} 点
        </UpgradeButton>
      </PressableRow>

      {/* 数值上限：消耗按斐波那契递增的坍缩点数，每级提升量亦按斐波那契式递增 */}
      <PressableRow
        id="shop-item-value-cap"
        disabled={!canBuy}
        onPress={() => {
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
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
              下一级 +{nextStep.formatChinese(2)}
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
          {valueCapCost.formatChinese(0)} 点
        </UpgradeButton>
      </PressableRow>

      {/* 功法等级上限（由永劫商店迁移而来，消耗坍缩点） */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#2d2822]">
        <div className="text-[10px] font-serif text-[#6f6656] px-1">
          —— 功法等级上限（消耗坍缩点）——
        </div>
        {REBIRTH_SHOP_ORDER.map((id) => {
          const meta = UPGRADE_METADATA[id];
          const up = state.upgrades[id];

          return (
            <PressableRow
              key={id}
              id={`shop-item-${id}`}
              disabled={!canBuy}
              onPress={() => {
                if (canBuy) onBuyLevelCap(id);
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
            </PressableRow>
          );
        })}
      </div>


      {/* 解锁背包（消耗 3 点永劫点数） */}
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
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                  解锁背包
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
                开启行囊 · 收纳珍藏，可随时变卖折现
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-inventory" disabled={!canUnlockInventory}>
              {INVENTORY_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁往生殿（消耗 20 点坍缩点数） */}
      {!state.afterlifeShopUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-afterlife"
            onClick={() => {
              if (canUnlockAfterlifeShop) onUnlockAfterlifeShop();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockAfterlifeShop ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                  解锁往生殿
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
                往生殿：各属性升级消耗可进一步折扣 · 每级 2×斐波那契递增
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-afterlife" disabled={!canUnlockAfterlifeShop}>
              {AFTERLIFE_SHOP_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}
    </div>
  );
};
