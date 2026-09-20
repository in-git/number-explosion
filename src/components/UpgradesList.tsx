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
  MULTIPLIER_STEP,
  applyAfterlifeDiscount,
  getAfterlifeDiscountPercent,
} from '../utils/gameMath';
import { UPGRADE_ORDER } from '../config';
import { UpgradeButton } from './UpgradeButton';
import { PressableRow } from './PressableRow';

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
    const next = getAutoClickRate(level + 1);
    const step = rate.intervalMs - next.intervalMs;
    return {
      currentDesc: `${rate.intervalMs}ms · ${rate.clicksPerSec.toFixed(1)}次/s`,
      nextDesc: step > 0 ? `间隔 -${step}ms` : '已至极速',
    };
  }

  if (id === 'comboChance') {
    const chance = Math.min(1.0, level * CRIT_CHANCE_STEP);
    return {
      currentDesc: `${(chance * 100).toFixed(1)}%`,
      nextDesc: chance >= 1.0 ? '上限 100%' : '+0.5%',
    };
  }

  // 暴击倍数 / 连击倍数: 基础100%，等差数列 +30%
  if (id === 'comboMultiplier' || id === 'critMultiplier') {
    const mult = 1.0 + level * MULTIPLIER_STEP;
    return { currentDesc: `${(mult * 100).toFixed(0)}%`, nextDesc: `+${MULTIPLIER_STEP * 100}%` };
  }

  // 暴击概率: 基础20%，每级 +0.5%，上限100%
  const chance = Math.min(1.0, CRIT_CHANCE_BASE + level * CRIT_CHANCE_STEP);
  return {
    currentDesc: `${(chance * 100).toFixed(1)}%`,
    nextDesc: chance >= 1.0 ? '上限 100%' : '+0.5%',
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

  // Filter upgrades: 点击量达标，或已解锁（解锁会消耗点击量，已解锁项须继续显示）
  const visibleUpgrades = UPGRADE_ORDER.filter(
    (id) => state.clickCount >= UPGRADE_METADATA[id].requiredClicks || state.upgrades[id].unlocked
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
          点击量: {state.clickCount}
        </div>
      </div>
    );
  }

  const rows = visibleUpgrades.map((id) => {
    const meta = UPGRADE_METADATA[id];
    const upgradeState = state.upgrades[id];
    const maxLevel = getUpgradeMaxLevel(id, upgradeState);
    const rawDesc = getUpgradeDesc(id, upgradeState.level);
    // 数值升级：把等级上限以纯文本放到描述最前面（其余功法上限已在徽章中显示）
    const desc =
      id === 'baseValue'
        ? { ...rawDesc, currentDesc: `上限 Lv.${maxLevel} · ${rawDesc.currentDesc}` }
        : rawDesc;
    // 往生殿折扣：按当前属性等级降低该属性的数值店升级消耗
    const currentCost = applyAfterlifeDiscount(
      getUpgradeCost(id, upgradeState.level, maxLevel),
      state.afterlifeUpgradeLevels?.[id] || 0,
    );

    return {
      id,
      meta,
      upgradeState,
      maxLevel,
      desc,
      currentCost,
      isMaxed: isUpgradeMaxed(id, upgradeState),
      canAffordUnlock: state.clickCount >= meta.requiredClicks,
      canAffordUpgrade: currentCost ? currentValue.gte(currentCost) : false,
    };
  });

  // 已满级的排到最后，其余保持原有顺序
  const orderedRows = [...rows.filter((r) => !r.isMaxed), ...rows.filter((r) => r.isMaxed)];
  const shownRows = hideMaxed ? orderedRows.filter((r) => !r.isMaxed) : orderedRows;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="flex items-center gap-3 text-[10px] font-serif text-[#6f6656]">
          <span>
            当前数值
            <span className="ml-1 font-mono text-[#c9a86a]">{currentValue.formatChinese(2)}</span>
          </span>
          <span id="upgrade-shop-click-count">
            点击量
            <span className="ml-1 font-mono text-[#76d18c]">
              {state.clickCount.toLocaleString('zh-CN')}
            </span>
          </span>
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

      {/* 长按提示 / 往生店折扣提示 */}
      <div className="text-[10px] font-serif text-[#8a7a63] text-center -mt-0.5">
        {'长按条目可持续升级'}
        {Object.values(state.afterlifeUpgradeLevels || {}).some((v) => v > 0) && (
          <span className="text-[#7bd88f]"> · 往生殿：升级消耗按属性折扣</span>
        )}
      </div>

      {shownRows.length === 0 ? (
        <div className="text-[11px] text-[#7d7364] font-serif text-center py-4">
          —— 诸法皆已臻圆满，可于永劫商店提升等级上限 ——
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
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#16211a] border border-[#2f4a35] transition-colors ${
                    row.canAffordUnlock
                      ? 'cursor-pointer hover:bg-[#1c2c22] hover:border-[#4d7a56]'
                      : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif font-bold text-xs sm:text-sm text-[#cfe8d4] break-words">
                        {meta.name}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-px rounded bg-[#1d2c22] border border-[#33553c] text-[#8fc79a] flex-shrink-0">
                        上限 Lv.{maxLevel}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7fa886] font-serif truncate">
                      仅消耗点击量 · 无需数值
                    </div>
                  </div>

                  <UpgradeButton
                    id={`btn-unlock-${id}`}
                    disabled={!row.canAffordUnlock}
                    ariaLabel="解锁"
                    tone="green"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono">
                        {meta.requiredClicks.toLocaleString('zh-CN')}
                      </span>
                      <Unlock
                        size={11}
                        className={`flex-shrink-0 ${
                          row.canAffordUnlock ? 'text-[#76d18c]' : 'text-[#4a5a4d]'
                        }`}
                      />
                    </span>
                  </UpgradeButton>
                </div>
              );
            }

            // 所有升级均支持长按持续升级：单击升级一次，长按连续连升
            const canUpgrade = !isMaxed && !!currentCost && row.canAffordUpgrade;

            const rowInner = (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                      {meta.name}
                    </span>
                    {/* 数值升级直接显示加成值，其余显示等级 / 上限 */}
                    <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
                      {id === 'baseValue'
                        ? `+${getBaseValueBonus(upgradeState.level).formatChinese(1)}`
                        : `Lv.${upgradeState.level} / ${maxLevel}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#998e7e] font-serif flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="break-words">{desc.currentDesc}</span>
                    <span className="text-[#6e6456] flex-shrink-0">→</span>
                    <span className="text-[#807667] break-words">{desc.nextDesc}</span>
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
              </>
            );

            const rowClassName = `flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUpgrade ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`;

            return (
              <PressableRow
                key={id}
                id={`upgrade-item-${id}`}
                disabled={!canUpgrade}
                onPress={() => {
                  if (!currentCost) return;
                  onUpgrade(id, currentCost);
                }}
                className={`${rowClassName} select-none`}
              >
                {rowInner}
              </PressableRow>
            );
          })}
        </div>
      )}
    </div>
  );
};
