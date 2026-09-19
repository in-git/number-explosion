import React, { useState } from 'react';
import { Unlock } from 'lucide-react';
import { GameState, UpgradeId } from '../types';
import { BigNum } from '../utils/bigNumber';
import {
  UPGRADE_METADATA,
  getUpgradeCost,
  getUpgradeMaxLevel,
  isUpgradeMaxed,
  getBaseValueBonus,
  getAutoClickRate,
  CRIT_CHANCE_BASE,
  CRIT_CHANCE_STEP,
} from '../utils/gameMath';
import { UPGRADE_ORDER } from '../config';
import { UpgradeButton } from './UpgradeButton';

interface UpgradesListProps {
  state: GameState;
  currentValue: BigNum;
  onUnlock: (id: UpgradeId, cost: BigNum) => void;
  onUpgrade: (id: UpgradeId, cost: BigNum) => void;
}

interface UpgradeDesc {
  currentDesc: string;
  nextDesc: string;
}

function getUpgradeDesc(id: UpgradeId, level: number): UpgradeDesc {
  if (id === 'baseValue') {
    const currentBonus = getBaseValueBonus(level);
    const nextBonus = getBaseValueBonus(level + 1);
    return {
      currentDesc: `基础 +${currentBonus.formatChinese(1)}`,
      nextDesc: `+${nextBonus.formatChinese(1)}`,
    };
  }

  if (id === 'autoClickUnlock') {
    return { currentDesc: '自动行功运化', nextDesc: '不可升级' };
  }

  if (id === 'autoFrequency') {
    const rate = getAutoClickRate(level);
    if (rate.clicksPerMs > 0) {
      return { currentDesc: `${rate.clicksPerMs.toFixed(1)} 次/ms`, nextDesc: '提速' };
    }
    return {
      currentDesc: `${rate.intervalMs}ms · ${rate.clicksPerSec.toFixed(1)}次/s`,
      nextDesc: '间隔 -50ms',
    };
  }

  if (id === 'comboChance') {
    const chance = Math.min(1.0, level * 0.05);
    return {
      currentDesc: `${(chance * 100).toFixed(0)}%`,
      nextDesc: chance >= 1.0 ? '上限 100%' : '+5%',
    };
  }

  // 暴击倍数 / 连击倍数: 基础100%，等差数列 +0.5
  if (id === 'comboMultiplier' || id === 'critMultiplier') {
    const mult = 1.0 + level * 0.5;
    return { currentDesc: `${(mult * 100).toFixed(0)}%`, nextDesc: '+50%' };
  }

  // 暴击概率: 基础20%，每级 +5%，上限100%
  const chance = Math.min(1.0, CRIT_CHANCE_BASE + level * CRIT_CHANCE_STEP);
  return {
    currentDesc: `${(chance * 100).toFixed(0)}%`,
    nextDesc: chance >= 1.0 ? '上限 100%' : '+5%',
  };
}

export const UpgradesList: React.FC<UpgradesListProps> = ({
  state,
  currentValue,
  onUnlock,
  onUpgrade,
}) => {
  // 隐藏不可继续升级（已满级）的功法
  const [hideMaxed, setHideMaxed] = useState(false);

  // Filter upgrades: only show those whose requiredClicks condition is met
  const visibleUpgrades = UPGRADE_ORDER.filter(
    (id) => state.clickCount >= UPGRADE_METADATA[id].requiredClicks
  );

  if (visibleUpgrades.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-[#595043] text-xs font-serif tracking-[0.2em] mb-1">
          —— 尚 未 开 启 ——
        </div>
        <div className="text-[11px] text-[#807565] font-serif">
          使用当前点击次数解锁
        </div>
        <div className="mt-2 text-[11px]">
          本世点击: {state.clickCount} 
        </div>
      </div>
    );
  }

  const rows = visibleUpgrades.map((id) => {
    const meta = UPGRADE_METADATA[id];
    const upgradeState = state.upgrades[id];
    const maxLevel = getUpgradeMaxLevel(id, upgradeState);
    const desc = getUpgradeDesc(id, upgradeState.level);
    const currentCost = getUpgradeCost(id, upgradeState.level, maxLevel);

    return {
      id,
      meta,
      upgradeState,
      maxLevel,
      desc,
      currentCost,
      isMaxed: isUpgradeMaxed(id, upgradeState),
      canAffordUnlock: currentValue.gte(new BigNum(meta.baseUnlockCost, 0)),
      canAffordUpgrade: currentCost ? currentValue.gte(currentCost) : false,
    };
  });

  // 已满级的排到最后，其余保持原有顺序
  const orderedRows = [...rows.filter((r) => !r.isMaxed), ...rows.filter((r) => r.isMaxed)];
  const shownRows = hideMaxed ? orderedRows.filter((r) => !r.isMaxed) : orderedRows;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-serif text-[#6f6656]">
          当前数值
          <span className="ml-1 font-mono text-[#c9a86a]">{currentValue.formatChinese(2)}</span>
        </div>
        <button
          id="btn-toggle-hide-maxed"
          onClick={() => setHideMaxed((v) => !v)}
          aria-pressed={hideMaxed}
          className={`text-[10px] font-serif px-2 py-0.5 rounded border transition-colors cursor-pointer ${
            hideMaxed
              ? 'text-[#e8dcc6] border-[#6b5e4c] bg-[#3b3327]'
              : 'text-[#7d7364] border-[#2b2721] hover:border-[#453a2d] hover:text-[#b8aa98]'
          }`}
        >
          {hideMaxed ? '显示已满级' : '隐藏已满级'}
        </button>
      </div>

      {shownRows.length === 0 ? (
        <div className="text-[11px] text-[#7d7364] font-serif text-center py-4">
          —— 诸法皆已臻圆满，可于重生商店提升等级上限 ——
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shownRows.map((row) => {
            const { id, meta, upgradeState, maxLevel, desc, currentCost, isMaxed } = row;

            // If not unlocked yet:
            if (!upgradeState.unlocked) {
              return (
                <div
                  key={id}
                  id={`upgrade-item-${id}`}
                  onClick={() => {
                    if (!row.canAffordUnlock) return;
                    onUnlock(id, new BigNum(meta.baseUnlockCost, 0));
                  }}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211e1a] border border-[#3d372e] transition-colors ${
                    row.canAffordUnlock
                      ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]'
                      : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif font-bold text-xs sm:text-sm text-[#d9d1c3] truncate">
                        {meta.name}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                        上限 Lv.{maxLevel}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7d7364] font-serif truncate">
                      本世点击 {meta.requiredClicks} 次
                    </div>
                  </div>

                  <UpgradeButton
                    id={`btn-unlock-${id}`}
                    disabled={!row.canAffordUnlock}
                    ariaLabel="解锁"
                  >
                    <span className="inline-flex items-center gap-1">
                      {new BigNum(meta.baseUnlockCost, 0).formatChinese(0)}
                      <Unlock
                        size={11}
                        className={`flex-shrink-0 ${
                          row.canAffordUnlock ? 'text-[#c9a86a]' : 'text-[#595246]'
                        }`}
                      />
                    </span>
                  </UpgradeButton>
                </div>
              );
            }

            // Already unlocked:
            return (
              <div
                key={id}
                id={`upgrade-item-${id}`}
                onClick={() => {
                  if (isMaxed || !currentCost || !row.canAffordUpgrade) return;
                  onUpgrade(id, currentCost);
                }}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                  !isMaxed && currentCost && row.canAffordUpgrade
                    ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]'
                    : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                      {meta.name}
                    </span>
                    <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
                      Lv.{upgradeState.level} / {maxLevel}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#998e7e] font-serif flex items-center gap-1.5">
                    <span className="truncate">{desc.currentDesc}</span>
                    <span className="text-[#6e6456] flex-shrink-0">→</span>
                    <span className="text-[#807667] truncate">{desc.nextDesc}</span>
                  </div>
                </div>

                {/* 点击整行即可升级，此处仅作消耗展示 */}
                {isMaxed || !currentCost ? (
                  <UpgradeButton disabled>圆满</UpgradeButton>
                ) : (
                  <UpgradeButton
                    id={`btn-upgrade-${id}`}
                    disabled={!row.canAffordUpgrade}
                    ariaLabel="升级"
                  >
                    {currentCost.formatChinese(2)}
                  </UpgradeButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
