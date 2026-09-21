import React from 'react';
import { GameState, UpgradeId } from '../types';
import {
  UPGRADE_METADATA,
  LEVEL_CAP_PER_POINT,
  getValueCap,
  getValueCapStep,
  getValueCapCost,
  getRebirthPointUpgradeCost,
  getRebirthPointBonusPerMillion,
  getRebirthToCollapseCost,
  COLLAPSE_COST,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import {
  AFTERLIFE_SHOP_UNLOCK_COST,
  REBIRTH_SHOP_ORDER,
} from '../config';
import { UpgradeButton } from './UpgradeButton';

interface CollapseShopProps {
  state: GameState;
  onBuyValueCap: () => void;
  /** 购买「永劫爆炸」：消耗按 2^n 递增的坍缩点数，每级使永劫时每 100 万数值额外 +0.2 点 */
  onBuyRebirthPointLevel: () => void;
  /** 消耗 1 点坍缩点数，为指定功法 +50 级上限（由永劫商殿迁移而来） */
  onBuyLevelCap: (id: UpgradeId) => void;
  /** 消耗永劫点数兑换坍缩点数（恒定 3:1）：amount 为兑换次数，'all' = 全部可兑换 */
  onExchangeRebirthToCollapse: (amount: number | 'all') => void;

  /** 消耗 20 点坍缩点数解锁往生殿 */
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
  onUnlockAfterlifeShop,

}) => {
  const level = state.valueCapLevel || 0;
  const rebirths = state.rebirthCount || 0;
  const currentCap = getValueCap(level, rebirths);
  const nextCap = getValueCap(level + 1, rebirths);
  const valueCapCost = getValueCapCost(level + 1);
  const canBuy = state.collapsePoints >= valueCapCost.toNumber();

  // 永劫点数 → 坍缩点数兑换（单次消耗恒定）
  const exchanged = state.rebirthToCollapseCount || 0;
  const exchangeCostNum = getRebirthToCollapseCost(exchanged).toNumber();
  const exchangeStep = Number.isFinite(exchangeCostNum) && exchangeCostNum > 0 ? exchangeCostNum : 0;
  // 全部兑换：当前可兑换的最大次数及其消耗
  const exchangeAllCount = exchangeStep > 0 ? Math.floor(state.rebirthPoints / exchangeStep) : 0;
  const canExchange = exchangeStep > 0 && state.rebirthPoints >= exchangeStep;
  const canExchange10 = exchangeStep > 0 && state.rebirthPoints >= exchangeStep * 10;
  const canExchangeAll = exchangeAllCount > 0;

  // 永劫爆炸：当前等级 + 下一级消耗（2 的幂）
  const rpLevel = state.rebirthPointLevel || 0;
  const rpCost = getRebirthPointUpgradeCost(rpLevel);
  const canBuyRp = BigNum.fromNumber(state.collapsePoints).gte(rpCost);

  // 进行坍缩：献祭永劫点数凝练坍缩重数
  const canCollapse = state.rebirthPoints >= COLLAPSE_COST;


  // 往生殿：消耗坍缩点（非永劫点）解锁
  const canUnlockAfterlifeShop = state.collapsePoints >= AFTERLIFE_SHOP_UNLOCK_COST;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
      
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数{' '}
          <span className="text-[#5fa8e6]">
            {BigNum.fromNumber(state.rebirthPoints).formatChinese(0)}
          </span>{' '}
          · 坍缩点数{' '}
          <span className="text-[#5b9bd8]">
            {BigNum.fromNumber(state.collapsePoints).formatChinese(0)}
          </span>
        </div>
      </div>

      {/* 点化坍缩：永劫点数 → 坍缩点数；卡片，支持 +1 / +10 / 全部 */}
      <div
        id="shop-item-exchange-collapse"
        className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#161d2b] border border-[#2e4a6e] select-none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
            点化坍缩
          </span>
          <span className="text-[10px] font-serif text-[#7d8fa3] flex-shrink-0">
            永劫:坍缩=3:1
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <UpgradeButton
            id="btn-exchange-collapse-1"
            disabled={!canExchange}
            onClick={() => onExchangeRebirthToCollapse(1)}
            ariaLabel="兑换 1 点坍缩点数"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +1
          </UpgradeButton>
          <UpgradeButton
            id="btn-exchange-collapse-10"
            disabled={!canExchange10}
            onClick={() => onExchangeRebirthToCollapse(10)}
            ariaLabel="兑换 10 点坍缩点数"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +10
          </UpgradeButton>
          <UpgradeButton
            id="btn-exchange-collapse-all"
            disabled={!canExchangeAll}
            onClick={() => onExchangeRebirthToCollapse('all')}
            ariaLabel="全部兑换"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +{BigNum.fromNumber(exchangeAllCount).formatChinese(0)}
          </UpgradeButton>
        </div>
      </div>

      {/* 永劫爆炸：永劫时每 100 万数值额外 +0.2 点/级，消耗 2^n 递增的坍缩点数；仅按右侧按钮触发 */}
      <div
        id="shop-item-rebirth-point"
        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              永劫爆炸
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            每级（+20%/百万）的永劫点获得
          </div>
        </div>

        <UpgradeButton
          id="btn-buy-rebirth-point"
          disabled={!canBuyRp}
          onPress={() => {
            if (!canBuyRp) return;
            onBuyRebirthPointLevel();
          }}
        >
          {rpCost.formatChinese(0)} 点
        </UpgradeButton>
      </div>

      {/* 数值上限：消耗按斐波那契递增的坍缩点数，每级提升量亦按斐波那契式递增；仅按右侧按钮触发 */}
      <div
        id="shop-item-value-cap"
        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
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
          onPress={() => {
            if (!canBuy) return;
            onBuyValueCap();
          }}
        >
          {valueCapCost.formatChinese(0)} 点
        </UpgradeButton>
      </div>

      {/* 功法等级上限（由永劫商殿迁移而来，消耗坍缩点） */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[#2d2822]">
     
        {REBIRTH_SHOP_ORDER.map((id) => {
          const meta = UPGRADE_METADATA[id];
          const up = state.upgrades[id];

          return (
            <div
              key={id}
              id={`shop-item-${id}`}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                    {meta.name}
                  </span>
                  <span className='text-xs'>
                    Lv.{up.capBonus || 0}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif  mt-0.5">
                  每次购买等级上限 +{LEVEL_CAP_PER_POINT} 级
                </div>
              </div>

              <UpgradeButton
                id={`btn-shop-cap-${id}`}
                disabled={!canBuy}
                onPress={() => {
                  if (!canBuy) return;
                  onBuyLevelCap(id);
                }}
              >
                1 点
              </UpgradeButton>
            </div>
          );
        })}
      </div>



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
                往生殿：各属性升级消耗可进一步折扣
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
