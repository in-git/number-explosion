import React from 'react';
import { UpgradeId } from '../types';
import { BigNum } from '../utils/bigNumber';
import { useGameActions, useGameData, useModals } from '../context/GameContext';
import { useUpgradeAmountMode } from '../hooks/useUpgradeAmountMode';
import { UpgradeAmountButton } from './UpgradeAmountButton';
import { UpgradeAmountToggle } from './UpgradeAmountToggle';
import {
  UPGRADE_ORDER,
  AFTERLIFE_POINT_EXCHANGE_COST,
  ONE_KEY_UPGRADE_UNLOCK_COST,
  TRIBULATION_UNLOCK_COST,
  REBIRTH_MERGED_UPGRADES,
} from '../config';
import {
  getAfterlifeUpgradeCost,
  getAfterlifeUpgradeMultiplier,
  getAfterlifeNextUpgradeMultiplier,
  getRebirthCapUpgradeCost,
  getRebirthCapStep,
  getRebirthPointsCap,
  getRebirthCapBulkCost,
  planBulkBuy,
  planByAmountMode,
} from '../utils/gameMath';
import { UpgradeButton } from './UpgradeButton';

export const AfterlifeShop: React.FC = () => {
  const { state } = useGameData();
  const {
    handleExchangeAfterlifePoint: onExchangeAfterlifePoint,
    handleBuyAfterlifeUpgrade: onBuyAfterlifeUpgrade,
    handleBuyAfterlifeUpgradeMax: onBuyAfterlifeUpgradeMax,
    handleBuyRebirthCapUpgrade: onBuyRebirthCapUpgrade,
    handleBuyRebirthCapUpgradeMax: onBuyRebirthCapUpgradeMax,
    handleUnlockOneKeyUpgrade: onUnlockOneKeyUpgrade,
    handleUnlockTribulation: onUnlockTribulation,
  } = useGameActions();
  const modals = useModals();

  /** 升级量模式（全局「一键升级」开关）：1（默认）/ 一半 / max；任意一殿切换，各殿按钮次数联动 */
  const { mode: amountMode, cycle: cycleAmount } = useUpgradeAmountMode();

  /** 打开「天雷峰」：关闭往生殿，打开渡劫弹窗 */
  const onOpenTribulation = () => {
    modals.afterlifeShop.close();
    modals.tribulation.open();
  };

  // 仅列出永劫殿中「可升级（有消耗）」的属性；autoClickUnlock 为解锁项、无升级消耗，故不列入
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
  const canExchangeAll = exchangeAllCount > 0;

  // 永劫点上限：基础 100，每级提升量线性递增（+100、+110、+120…）；消耗往生点为斐波那契 1,1,2,3,5…
  const capLevel = state.rebirthCapLevel || 0;
  const currentRebirthCap = getRebirthPointsCap(capLevel);
  const nextRebirthCap = getRebirthPointsCap(capLevel + 1);
  const nextCapStep = getRebirthCapStep(capLevel + 1);
  const rebirthCapCost = getRebirthCapUpgradeCost(capLevel);
  const canBuyRebirthCap = state.afterlifePoints >= rebirthCapCost;

  // 一半 · max：本次实际会购买的次数（与结算同源，故按钮显示即实际购买次数）
  const afterlifePointsNow = Math.max(0, state.afterlifePoints);
  const capBulk =
    amountMode === '1'
      ? null
      : planByAmountMode(amountMode, (maxLevels) =>
          planBulkBuy(
            capLevel,
            afterlifePointsNow,
            (lv) => getRebirthCapUpgradeCost(lv),
            maxLevels,
            // 消耗为斐波那契：走闭式累计消耗 + 二分，避免大预算时逐级扫描卡死页面
            (count) => getRebirthCapBulkCost(capLevel, count)
          )
        );
  // 兑换往生点：本次兑换次数（1 / 一半 / 全部）
  const exchangeTimes =
    amountMode === '1'
      ? 1
      : amountMode === 'half'
        ? Math.max(1, Math.ceil(exchangeAllCount / 2))
        : exchangeAllCount;

  // 一键升级：消耗 10 往生点解锁，解锁后数值殿 / 永劫殿才显示「升级量」开关
  const canUnlockOneKey = state.afterlifePoints >= ONE_KEY_UPGRADE_UNLOCK_COST;

  // 渡劫：需先消耗 100 往生点解锁；实际渡劫在「天雷峰」模态框内进行
  const canUnlockTribulation =
    !state.tribulationUnlocked && state.afterlifePoints >= TRIBULATION_UNLOCK_COST;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-mono text-[#8a7a63]">
          坍缩点数{' '}
          <span className="text-[#5b9bd8]">
            {BigNum.fromNumber(state.collapsePoints).formatChinese(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono text-[#8a7a63]">
            往生点{' '}
            <span className="text-[#d897fa]">
              {BigNum.fromNumber(state.afterlifePoints).formatChinese(0)}
            </span>
          </div>

          {/* 一键升级：升级量开关（1 → 一半 → max 循环）；下方按钮随之联动 */}
          {state.oneKeyUpgradeUnlocked && (
            <UpgradeAmountToggle
              id="btn-afterlife-upgrade-all"
              mode={amountMode}
              onToggle={cycleAmount}
              className="px-2 py-0.5 text-[10px]"
            />
          )}
        </div>
      </div>

      {/* 兑换往生点：坍缩点 → 往生点；普通卡片，按「升级量」开关兑换 1 次或全部 */}
      <div
        id="afterlife-item-exchange"
        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] select-none"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              兑换往生点
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
              10:1
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            每 {exchangeStep} 点坍缩点数兑 1 点往生点
          </div>
        </div>

        <UpgradeAmountButton
          id="btn-afterlife-exchange"
          mode={amountMode}
          bulkLevels={exchangeTimes}
          cost={exchangeStep * exchangeTimes}
          singleDisabled={!canExchange}
          bulkDisabled={!canExchangeAll}
          onSingle={() => onExchangeAfterlifePoint(1)}
          onBulk={(times) => onExchangeAfterlifePoint(amountMode === 'max' ? 'all' : times)}
          ariaLabel="兑换往生点"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {order.map((id) => {
          // 条目名沿用永劫殿的叫法（baseValue 统一叫「数值升级」）
          const label = REBIRTH_MERGED_UPGRADES.find((u) => u.id === id)?.label ?? id;
          const level = state.afterlifeUpgradeLevels?.[id] || 0;
          // 各条目均为「强化」：放大永劫殿该属性的累计加成（消耗统一为斐波那契数列）
          const current = getAfterlifeUpgradeMultiplier(id, level);
          const next = getAfterlifeNextUpgradeMultiplier(id, level);
          const cost = getAfterlifeUpgradeCost(level);
          const canBuy = state.afterlifePoints >= cost;
          // 一半 · max：本次实际会购买的次数
          const bulk =
            amountMode === '1'
              ? null
              : planByAmountMode(amountMode, (maxLevels) =>
                  planBulkBuy(
                    level,
                    afterlifePointsNow,
                    (lv) => getAfterlifeUpgradeCost(lv),
                    maxLevels
                  )
                );

          return (
            <div
              key={id}
              id={`afterlife-item-${id}`}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuy ? '' : 'opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                    {label}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
                    Lv.{BigNum.fromNumber(level).formatChinese(0)}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
                  强化 永劫殿 <span className="text-[#76d18c]">[{label}]</span> 累计加成{' '}
                  <span className="text-[#d897fa] font-mono font-bold">
                    ×{BigNum.fromNumber(current).formatChinese(0)} → ×
                    {BigNum.fromNumber(next).formatChinese(0)}
                  </span>
                </div>
              </div>

              <UpgradeAmountButton
                id={`btn-afterlife-${id}`}
                mode={amountMode}
                bulkLevels={bulk?.levels ?? 0}
                cost={bulk ? bulk.cost : cost}
                singleDisabled={!canBuy}
                onSingle={() => onBuyAfterlifeUpgrade(id)}
                onBulk={(levels) => onBuyAfterlifeUpgradeMax(id, levels)}
                ariaLabel={label}
              />
            </div>
          );
        })}
      </div>

      {/* 永劫点上限：基础 100，每级提升量线性递增（+100、+110、+120…）；消耗往生点为斐波那契 1,1,2,3,5… */}
      <div
        id="afterlife-item-rebirth-cap"
        className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
          canBuyRebirthCap ? '' : 'opacity-50'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
              永劫点上限
            </span>
            <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
              Lv.{BigNum.fromNumber(capLevel).formatChinese(0)}
            </span>
          </div>
          <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
            单次获取上限{' '}
            <span className="text-[#5fa8e6] font-mono font-bold">
              {BigNum.fromNumber(currentRebirthCap).formatChinese(2)} →{' '}
              {BigNum.fromNumber(nextRebirthCap).formatChinese(2)}
            </span>{' '}
            <span className="text-[#6f6656]">
              (+{BigNum.fromNumber(nextCapStep).formatChinese(2)})
            </span>
          </div>
        </div>

        <UpgradeAmountButton
          id="btn-afterlife-rebirth-cap"
          mode={amountMode}
          bulkLevels={capBulk?.levels ?? 0}
          cost={capBulk ? capBulk.cost : rebirthCapCost}
          singleDisabled={!canBuyRebirthCap}
          onSingle={onBuyRebirthCapUpgrade}
          onBulk={(levels) => onBuyRebirthCapUpgradeMax(levels)}
          ariaLabel="永劫点上限"
        />
      </div>

      {/* 渡劫：需先解锁；解锁后进入「天雷峰」（消耗 1 万往生点，成功渡劫点 +1，失败散尽一切）
          已渡劫成功（飞升成仙）后移除入口 */}
      {!state.tribulationSuccess && (!state.tribulationUnlocked ? (
        <div
          id="afterlife-item-unlock-tribulation"
          className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
            canUnlockTribulation ? 'animate-[unlockGlow_1.5s_ease-in-out_infinite]' : 'opacity-50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                解锁渡劫
              </span>
              <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                未开启
              </span>
            </div>
            <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
              天雷峰：成则飞升成仙，败则飞禽走兽
            </div>
          </div>

          <UpgradeButton
            id="btn-afterlife-unlock-tribulation"
            disabled={!canUnlockTribulation}
            onClick={onUnlockTribulation}
            dashedBorder
          >
            {BigNum.fromNumber(TRIBULATION_UNLOCK_COST).formatChinese(0)} 点
          </UpgradeButton>
        </div>
      ) : (
        <div
          id="afterlife-item-tribulation"
          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors animate-[unlockGlow_1.5s_ease-in-out_infinite]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                渡劫
              </span>
            </div>
            <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
              成则飞升成仙，败则飞禽走兽
            </div>
          </div>

          <UpgradeButton id="btn-afterlife-tribulation" onClick={onOpenTribulation} dashedBorder>
            渡劫
          </UpgradeButton>
        </div>
      ))}

      {/* 一键升级（未解锁时显示）：消耗 10 往生点 */}
      {!state.oneKeyUpgradeUnlocked && (
        <div
          id="afterlife-item-one-key"
          className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
            canUnlockOneKey ? 'animate-[unlockGlow_1.5s_ease-in-out_infinite]' : 'opacity-50'
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
              数值殿 / 永劫殿 / 坍缩殿 / 往生殿开启「升级量」开关 · 可买到买不动
            </div>
          </div>
          <UpgradeButton
            id="btn-afterlife-unlock-one-key"
            disabled={!canUnlockOneKey}
            onClick={onUnlockOneKeyUpgrade}
            dashedBorder
          >
            {BigNum.fromNumber(ONE_KEY_UPGRADE_UNLOCK_COST).formatChinese(0)} 点
          </UpgradeButton>
        </div>
      )}

    </div>
  );
};
