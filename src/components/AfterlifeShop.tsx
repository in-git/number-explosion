import React from 'react';
import { GameState, UpgradeId } from '../types';
import { BigNum } from '../utils/bigNumber';
import {
  UPGRADE_ORDER,
  AFTERLIFE_POINT_EXCHANGE_COST,
  ONE_KEY_UPGRADE_UNLOCK_COST,
} from '../config';
import {
  UPGRADE_METADATA,
  getAfterlifeUpgradeCost,
  getAfterlifeDiscountPercent,
  getAfterlifeNextDiscount,
  getAfterlifeBaseValueCost,
  getAfterlifeBaseValueMultiplier,
  getAfterlifeNextBaseValueMultiplier,
  getRebirthCapUpgradeCost,
  getRebirthPointsCap,
} from '../utils/gameMath';
import { UpgradeButton } from './UpgradeButton';
import { PressableRow } from './PressableRow';

interface AfterlifeShopProps {
  state: GameState;
  /** 消耗坍缩点兑换往生点（恒定 10:1）：amount 为兑换次数，'all' = 全部可兑换 */
  onExchangeAfterlifePoint: (amount: number | 'all') => void;
  /** 购买指定属性的下一级往生加护（消耗往生点，按公差 4 的等差数列递增） */
  onBuyAfterlifeUpgrade: (id: UpgradeId) => void;
  /** 提升「永劫点上限」：每级 +100，消耗往生点 1,2,3,4,5… */
  onBuyRebirthCapUpgrade: () => void;
  /** 消耗 10 往生点解锁「一键升级」（解锁后数值殿才显示一键升级按钮） */
  onUnlockOneKeyUpgrade: () => void;
}

export const AfterlifeShop: React.FC<AfterlifeShopProps> = ({
  state,
  onExchangeAfterlifePoint,
  onBuyAfterlifeUpgrade,
  onBuyRebirthCapUpgrade,
  onUnlockOneKeyUpgrade,
}) => {
  // 仅列出数值殿中「可升级（有消耗）」的属性；autoClickUnlock 为解锁项、无升级消耗，故不列入
  // 往生殿不提供「频率 / 概率」类升级：自动点击频率、连击概率、暴击概率
  const order = UPGRADE_ORDER.filter(
    (id) =>
      id !== 'autoClickUnlock' &&
      id !== 'autoFrequency' &&
      id !== 'comboChance' &&
      id !== 'critChance'
  );

  // 坍缩点 → 往生点兑换（恒定 10:1，单次消耗恒定）
  const exchangeStep = AFTERLIFE_POINT_EXCHANGE_COST;
  // 全部兑换：当前可兑换的最大次数及其消耗
  const exchangeAllCount = Math.floor(state.collapsePoints / exchangeStep);
  const canExchange = state.collapsePoints >= exchangeStep;
  const canExchange10 = state.collapsePoints >= exchangeStep * 10;
  const canExchangeAll = exchangeAllCount > 0;

  // 永劫点上限：基础 100，每级 +100；每级消耗往生点 1,2,3,4,5…
  const capLevel = state.rebirthCapLevel || 0;
  const currentRebirthCap = getRebirthPointsCap(capLevel);
  const nextRebirthCap = getRebirthPointsCap(capLevel + 1);
  const rebirthCapCost = getRebirthCapUpgradeCost(capLevel);
  const canBuyRebirthCap = state.afterlifePoints >= rebirthCapCost;

  // 一键升级：消耗 10 往生点解锁，解锁后数值殿才显示一键升级按钮
  const canUnlockOneKey = state.afterlifePoints >= ONE_KEY_UPGRADE_UNLOCK_COST;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-mono text-[#8a7a63]">
          坍缩点数{' '}
          <span className="text-[#5b9bd8]">
            {BigNum.fromNumber(state.collapsePoints).formatChinese(0)}
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#8a7a63]">
          往生点{' '}
          <span className="text-[#d897fa]">
            {BigNum.fromNumber(state.afterlifePoints).formatChinese(0)}
          </span>
        </div>
      </div>

      {/* 兑换往生点：坍缩点 → 往生点；卡片，支持 +1 / +10 / 全部 */}
      <div
        id="afterlife-item-exchange"
        className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
            兑换往生点
          </span>
          <span className="text-[10px] font-serif text-[#998e7e] flex-shrink-0">
            兑换比例: 10:1
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <UpgradeButton
            id="btn-afterlife-exchange-1"
            disabled={!canExchange}
            onClick={() => onExchangeAfterlifePoint(1)}
            ariaLabel="兑换 1 点往生点"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +1
          </UpgradeButton>
          <UpgradeButton
            id="btn-afterlife-exchange-10"
            disabled={!canExchange10}
            onClick={() => onExchangeAfterlifePoint(10)}
            ariaLabel="兑换 10 点往生点"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +10
          </UpgradeButton>
          <UpgradeButton
            id="btn-afterlife-exchange-all"
            disabled={!canExchangeAll}
            onClick={() => onExchangeAfterlifePoint('all')}
            ariaLabel="全部兑换"
            className="flex-1 min-w-0! justify-center! text-center!"
          >
            +{BigNum.fromNumber(exchangeAllCount).formatChinese(0)}
          </UpgradeButton>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {order.map((id) => {
          const meta = UPGRADE_METADATA[id];
          const level = state.afterlifeUpgradeLevels?.[id] || 0;
          // 「数值升级」：不再降低消耗，改为放大数值殿该功法的基础倍数
          const isBaseValue = id === 'baseValue';
          const current = isBaseValue
            ? getAfterlifeBaseValueMultiplier(level)
            : getAfterlifeDiscountPercent(level);
          const next = isBaseValue
            ? getAfterlifeNextBaseValueMultiplier(level)
            : getAfterlifeNextDiscount(level);
          const cost = isBaseValue
            ? getAfterlifeBaseValueCost(level)
            : getAfterlifeUpgradeCost(level);
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
                  {isBaseValue ? (
                    <>
                      提升 数值殿 <span className="text-[#76d18c]">[{meta.name}]</span> 基础倍数{' '}
                      <span className="text-[#d897fa] font-mono font-bold">
                        ×{current} → ×{next}
                      </span>
                    </>
                  ) : (
                    <>
                      降低 数值殿 <span className="text-[#76d18c]">[{meta.name}]</span> 升级消耗{' '}
                      <span className="text-[#d897fa] font-mono font-bold">
                        -{current.toFixed(1)}% → -{next.toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              <UpgradeButton id={`btn-afterlife-${id}`} disabled={!canBuy}>
                {BigNum.fromNumber(cost).formatChinese(0)} 点
              </UpgradeButton>
            </PressableRow>
          );
        })}
      </div>

      {/* 永劫点上限：基础 100，每级 +100；消耗往生点 1,2,3,4,5… */}
      <PressableRow
        id="afterlife-item-rebirth-cap"
        disabled={!canBuyRebirthCap}
        onPress={() => {
          if (canBuyRebirthCap) onBuyRebirthCapUpgrade();
        }}
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canBuyRebirthCap ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              永劫点上限
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
              Lv.{capLevel}
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            提升 <span className="text-[#5fa8e6]">[永劫点数]</span> 单次获取上限{' '}
            <span className="text-[#5fa8e6] font-mono font-bold">
              {BigNum.fromNumber(currentRebirthCap).formatChinese(0)} →{' '}
              {BigNum.fromNumber(nextRebirthCap).formatChinese(0)}
            </span>
          </div>
        </div>

        <UpgradeButton id="btn-afterlife-rebirth-cap" disabled={!canBuyRebirthCap}>
          {BigNum.fromNumber(rebirthCapCost).formatChinese(0)} 点
        </UpgradeButton>
      </PressableRow>

      {/* 一键升级（未解锁时显示）：消耗 10 往生点 */}
      {!state.oneKeyUpgradeUnlocked && (
        <PressableRow
          id="afterlife-item-one-key"
          disabled={!canUnlockOneKey}
          onPress={() => {
            if (canUnlockOneKey) onUnlockOneKeyUpgrade();
          }}
          className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
            canUnlockOneKey ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                一键升级
              </span>
              <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                未开启
              </span>
            </div>
            <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
              数值殿开启一键升级 · 自动按「概率 → 数值 → 倍数」升满
            </div>
          </div>
          <UpgradeButton id="btn-afterlife-unlock-one-key" disabled={!canUnlockOneKey}>
            {BigNum.fromNumber(ONE_KEY_UPGRADE_UNLOCK_COST).formatChinese(0)} 点
          </UpgradeButton>
        </PressableRow>
      )}

    </div>
  );
};
