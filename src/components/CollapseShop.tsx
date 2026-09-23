import React from 'react';
import { UpgradeId } from '../types';
import { useGameActions, useGameData } from '../context/GameContext';
import { useUpgradeAmountMode } from '../hooks/useUpgradeAmountMode';
import { UpgradeAmountButton } from './UpgradeAmountButton';
import { UpgradeAmountToggle } from './UpgradeAmountToggle';
import {
  UPGRADE_METADATA,
  LEVEL_CAP_PER_POINT,
  getValueCap,
  getValueCapStep,
  getValueCapCost,
  getValueCapBulkCost,
  getRebirthPointUpgradeCost,
  getRebirthPointBonusPerMillion,
  getRebirthToCollapseCost,
  planBulkBuy,
  planByAmountMode,
  COLLAPSE_COST,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import {
  AFTERLIFE_SHOP_UNLOCK_COST,
  REBIRTH_SHOP_ORDER,
} from '../config';
import { UpgradeButton } from './UpgradeButton';

export const CollapseShop: React.FC = () => {
  const { state } = useGameData();
  const {
    handleBuyValueCap: onBuyValueCap,
    handleBuyValueCapMax: onBuyValueCapMax,
    handleBuyRebirthPointLevel: onBuyRebirthPointLevel,
    handleBuyRebirthPointLevelMax: onBuyRebirthPointLevelMax,
    handleBuyLevelCap: onBuyLevelCap,
    handleBuyLevelCapMax: onBuyLevelCapMax,
    handleExchangeRebirthToCollapse: onExchangeRebirthToCollapse,
    handleUnlockAfterlifeShop: onUnlockAfterlifeShop,
  } = useGameActions();

  /** 升级量模式（全局「一键升级」开关）：1（默认）/ 一半 / max；任意一殿切换，各殿按钮次数联动 */
  const { mode: amountMode, cycle: cycleAmount } = useUpgradeAmountMode();

  const level = state.valueCapLevel || 0;
  const rebirths = state.rebirthCount || 0;
  const currentCap = getValueCap(level, rebirths);
  const nextCap = getValueCap(level + 1, rebirths);
  const valueCapCost = getValueCapCost(level + 1);
  const canBuy = state.collapsePoints >= valueCapCost.toNumber();
  // 功法等级上限：每次固定 1 点坍缩点数（与「数值上限」的消耗无关）
  const canBuyLevelCap = state.collapsePoints >= 1;

  // 永劫点数 → 坍缩点数兑换（单次消耗恒定）
  const exchanged = state.rebirthToCollapseCount || 0;
  const exchangeCostNum = getRebirthToCollapseCost(exchanged).toNumber();
  const exchangeStep = Number.isFinite(exchangeCostNum) && exchangeCostNum > 0 ? exchangeCostNum : 0;
  // 全部兑换：当前可兑换的最大次数及其消耗
  const exchangeAllCount = exchangeStep > 0 ? Math.floor(state.rebirthPoints / exchangeStep) : 0;
  const canExchange = exchangeStep > 0 && state.rebirthPoints >= exchangeStep;
  const canExchangeAll = exchangeAllCount > 0;

  // 永劫爆炸：当前等级 + 下一级消耗（2 的幂）
  const rpLevel = state.rebirthPointLevel || 0;
  const rpCost = getRebirthPointUpgradeCost(rpLevel);
  const canBuyRp = BigNum.fromNumber(state.collapsePoints).gte(rpCost);

  // 进行坍缩：献祭永劫点数凝练坍缩重数
  const canCollapse = state.rebirthPoints >= COLLAPSE_COST;


  // 往生殿：消耗坍缩点（非永劫点）解锁
  const canUnlockAfterlifeShop = state.collapsePoints >= AFTERLIFE_SHOP_UNLOCK_COST;

  // 一半 · max：本次实际会购买的次数（与结算同源，故按钮显示即实际购买次数）
  const collapsePointsNow = Math.max(0, state.collapsePoints);
  const rpBulk =
    amountMode === '1'
      ? null
      : planByAmountMode(amountMode, (maxLevels) =>
          planBulkBuy(
            rpLevel,
            collapsePointsNow,
            (lv) => getRebirthPointUpgradeCost(lv).toNumber(),
            maxLevels
          )
        );
  const valueCapBulk =
    amountMode === '1'
      ? null
      : planByAmountMode(amountMode, (maxLevels) =>
          planBulkBuy(
            level,
            collapsePointsNow,
            (lv) => getValueCapCost(lv + 1).toNumber(),
            maxLevels,
            // 消耗线性递增（1、2、3…）：走闭式累计消耗 + 二分，
            // 否则大预算下次数会上千万，逐级扫描直接卡死页面
            (count) => getValueCapBulkCost(level, count)
          )
        );
  // 功法等级上限每次固定 1 点，故买光点数后再按次数上限收敛即可
  const levelCapBulk =
    amountMode === '1'
      ? null
      : planByAmountMode(amountMode, (maxLevels) => {
          const times = Math.min(
            Math.floor(collapsePointsNow),
            Number.isFinite(maxLevels) ? maxLevels : Infinity
          );
          return { levels: times, cost: times };
        });
  // 点化坍缩：本次兑换次数（1 / 一半 / 全部）
  const exchangeTimes =
    amountMode === '1'
      ? 1
      : amountMode === 'half'
        ? Math.max(1, Math.ceil(exchangeAllCount / 2))
        : exchangeAllCount;

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

        {/* 一键升级：升级量开关（1 → 一半 → max 循环）；下方按钮随之联动 */}
        {state.oneKeyUpgradeUnlocked && (
          <UpgradeAmountToggle
            id="btn-collapse-upgrade-all"
            mode={amountMode}
            onToggle={cycleAmount}
            className="px-2 py-0.5 text-[10px]"
          />
        )}
      </div>

      {/* 点化坍缩：永劫点数 → 坍缩点数；普通卡片，按「升级量」开关购买 1 次或全部 */}
      <div
        id="shop-item-exchange-collapse"
        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              点化坍缩
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
              3:1
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            每 3 点永劫点数兑 1 点坍缩点数
          </div>
        </div>

        <UpgradeAmountButton
          id="btn-exchange-collapse"
          mode={amountMode}
          bulkLevels={exchangeTimes}
          cost={exchangeStep * exchangeTimes}
          singleDisabled={!canExchange}
          bulkDisabled={!canExchangeAll}
          onSingle={() => onExchangeRebirthToCollapse(1)}
          onBulk={(times) => onExchangeRebirthToCollapse(amountMode === 'max' ? 'all' : times)}
          ariaLabel="点化坍缩"
        />
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

        <UpgradeAmountButton
          id="btn-buy-rebirth-point"
          mode={amountMode}
          bulkLevels={rpBulk?.levels ?? 0}
          cost={rpBulk ? rpBulk.cost : rpCost}
          singleDisabled={!canBuyRp}
          onSingle={onBuyRebirthPointLevel}
          onBulk={(levels) => onBuyRebirthPointLevelMax(levels)}
          ariaLabel="永劫爆炸"
        />
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

        <UpgradeAmountButton
          id="btn-buy-value-cap"
          mode={amountMode}
          bulkLevels={valueCapBulk?.levels ?? 0}
          cost={valueCapBulk ? valueCapBulk.cost : valueCapCost}
          singleDisabled={!canBuy}
          onSingle={onBuyValueCap}
          onBulk={(levels) => onBuyValueCapMax(levels)}
          ariaLabel="数值上限"
        />
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
                    Lv.{BigNum.fromNumber(up.capBonus || 0).formatChinese(0)}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif  mt-0.5">
                  每次购买等级上限 +{LEVEL_CAP_PER_POINT} 级
                </div>
              </div>

              <UpgradeAmountButton
                id={`btn-shop-cap-${id}`}
                mode={amountMode}
                bulkLevels={levelCapBulk?.levels ?? 0}
                // 等级上限每次固定 1 点坍缩点
                cost={levelCapBulk ? levelCapBulk.cost : 1}
                singleDisabled={!canBuyLevelCap}
                onSingle={() => onBuyLevelCap(id)}
                onBulk={(levels) => onBuyLevelCapMax(id, levels)}
                ariaLabel="等级上限"
              />
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
              canUnlockAfterlifeShop ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142] animate-[unlockGlow_1.5s_ease-in-out_infinite]' : ''
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
                往生殿：永劫殿各属性升级消耗可进一步折扣
              </div>
            </div>

            <UpgradeButton
              id="btn-shop-unlock-afterlife"
              disabled={!canUnlockAfterlifeShop}
              dashedBorder
            >
              {AFTERLIFE_SHOP_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}
    </div>
  );
};
