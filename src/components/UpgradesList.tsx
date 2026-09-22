import React, { useState } from 'react';
import { Unlock } from 'lucide-react';
import { UpgradeId } from '../types';
import { BigNum } from '../utils/bigNumber';
import { useGameActions, useGameData } from '../context/GameContext';
import {
  UPGRADE_METADATA,
  getUpgradeCost,
  getUpgradeMaxLevel,
  getBulkUpgradeResult,
  planByAmountMode,
  isUpgradeMaxed,
  getBaseValueBonus,
  getAutoClickRate,
  isRebirthEffectCapped,
  CRIT_CHANCE_BASE,
  CRIT_CHANCE_STEP,
  COMBO_CHANCE_STEP,
  CRIT_MULT_BASE,
  MULTIPLIER_STEP,
  UPGRADE_TRIBULATION_POINT_COST,
} from '../utils/gameMath';
import { UPGRADE_ORDER, ACHIEVEMENTS_UNLOCK_COST, TITLE_UNLOCK_COST } from '../config';
import { useUpgradeAmountMode } from '../hooks/useUpgradeAmountMode';
import { UpgradeAmountButton } from './UpgradeAmountButton';
import { UpgradeAmountToggle } from './UpgradeAmountToggle';
import { UpgradeButton } from './UpgradeButton';

interface UpgradeDesc {
  currentDesc: string;
  nextDesc: string;
}

/** 百分比文案：整百分数不带小数，否则保留 1 位 */
const pctText = (ratio: number): string => {
  const v = Math.round(ratio * 1000) / 10;
  return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}%`;
};

/**
 * 功法效果文案。
 * @param level 当前等级（用于计算升级消耗）
 * @param keptLevel 数值重置丹保留的等级：效果按「当前等级 + 保留等级」计，故用丹后效果不丢
 * @param levels 本次升级级数：×1 为 1；MAX 为本次实际能升的级数（预览随之取更远的档）
 */
function getUpgradeDesc(
  id: UpgradeId,
  level: number,
  keptLevel: number = 0,
  levels: number = 1
): UpgradeDesc {
  const gain = Number.isFinite(levels) && levels > 1 ? Math.floor(levels) : 1;

  if (id === 'baseValue') {
    // 格式：升级前的数值 -> 升级后预览（升级后的值以绿色显示）
    // 往生殿强化作用于永劫殿，数值殿此处只看自身累计加成
    const effective = level + keptLevel;
    const currentBonus = getBaseValueBonus(effective);
    const nextBonus = getBaseValueBonus(effective + gain);
    return {
      currentDesc: `+${currentBonus.formatChinese(1)}`,
      nextDesc: `+${nextBonus.formatChinese(1)}`,
    };
  }

  if (id === 'autoClickUnlock') {
    return { currentDesc: '自动行功运化', nextDesc: '不可升级' };
  }

  // 所有条目统一：当前值 -> 升级后值（频率只显示 次/s）
  if (id === 'autoFrequency') {
    const rate = getAutoClickRate(level);
    const next = getAutoClickRate(level + gain);
    return {
      currentDesc: `${rate.clicksPerSec.toFixed(1)}次/s`,
      nextDesc:
        next.intervalMs < rate.intervalMs
          ? `${next.clicksPerSec.toFixed(1)}次/s`
          : '已至极速',
    };
  }

  if (id === 'comboChance') {
    const cur = Math.min(1.0, level * COMBO_CHANCE_STEP);
    const next = Math.min(1.0, (level + gain) * COMBO_CHANCE_STEP);
    return {
      currentDesc: pctText(cur),
      nextDesc: cur >= 1.0 ? '上限 100%' : pctText(next),
    };
  }

  // 连击倍数: 基础100%；暴击倍数: 基础5%；每级 +30%
  if (id === 'comboMultiplier' || id === 'critMultiplier') {
    const base = id === 'critMultiplier' ? CRIT_MULT_BASE : 1.0;
    return {
      currentDesc: pctText(base + level * MULTIPLIER_STEP),
      nextDesc: pctText(base + (level + gain) * MULTIPLIER_STEP),
    };
  }

  // 暴击概率: 基础5%，每级 +1%（0.01），上限100%
  const cur = Math.min(1.0, CRIT_CHANCE_BASE + level * CRIT_CHANCE_STEP);
  const next = Math.min(1.0, CRIT_CHANCE_BASE + (level + gain) * CRIT_CHANCE_STEP);
  return {
    currentDesc: pctText(cur),
    nextDesc: cur >= 1.0 ? '上限 100%' : pctText(next),
  };
}

export const UpgradesList: React.FC = () => {
  const { state, currentBigNum: currentValue } = useGameData();
  const {
    handleUnlockUpgrade: onUnlock,
    handleUpgradeLevel: onUpgrade,
    handleUpgradeMax: onUpgradeMax,
    handleUnlockAchievements: onUnlockAchievements,
    handleUnlockTitles: onUnlockTitles,
    handleUseValueResetPill: onUseValueResetPill,
  } = useGameActions();
  // 成就 / 称号系统是否已开启
  const achievementsUnlocked = state.achievementsUnlocked;
  const titleUnlocked = state.titleUnlocked;

  // 隐藏不可继续升级（已满级）的功法
  const [hideMaxed, setHideMaxed] = useState(false);

  /** 升级量模式（全局「一键升级」开关）：1（默认）/ 一半 / max；任意一殿切换，各殿按钮次数联动 */
  const { mode: amountMode, cycle: cycleAmount } = useUpgradeAmountMode();

  // Filter upgrades: 点击量达标，或已解锁（解锁会消耗点击量，已解锁项须继续显示）
  const visibleUpgrades = UPGRADE_ORDER.filter((id) => {
    if (state.clickCount < UPGRADE_METADATA[id].requiredClicks && !state.upgrades[id].unlocked) {
      return false;
    }
    // 仅频率类：永劫殿已达最快间隔时数值殿再升也无效果，隐藏该项
    // 概率类不再被移除：其等级上限已改为「100% − 永劫殿同属性概率」动态计算
    if (id === 'autoFrequency' && isRebirthEffectCapped(id, state.rebirthMergedLevels?.[id] || 0)) {
      return false;
    }
    return true;
  });

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

  // 系统开启：成就（50 万）/ 称号（200 万），未开启时显示一次性购买项，购买后隐藏
  const specialUnlocks = [
    ...(achievementsUnlocked
      ? []
      : [
          {
            id: 'achievements',
            name: '成就系统',
            desc: '历世成就 · 达成后永久生效',
            costText: BigNum.fromNumber(ACHIEVEMENTS_UNLOCK_COST).formatChinese(0),
            affordable: currentValue.gte(BigNum.fromNumber(ACHIEVEMENTS_UNLOCK_COST)),
            onUnlock: onUnlockAchievements,
          },
        ]),
    ...(titleUnlocked
      ? []
      : [
          {
            id: 'title',
            name: '称号系统',
            desc: '按历世最高数值自动获得修仙境界称号',
            costText: BigNum.fromNumber(TITLE_UNLOCK_COST).formatChinese(0),
            affordable: currentValue.gte(BigNum.fromNumber(TITLE_UNLOCK_COST)),
            onUnlock: onUnlockTitles,
          },
        ]),
  ];

  // 渡劫成功后：数值殿每次升级另须消耗渡劫点，点数不足则不可升级
  const needTribPoint = !!state.tribulationSuccess;
  const hasTribPoint =
    !needTribPoint || (state.tribulationPoints || 0) >= UPGRADE_TRIBULATION_POINT_COST;
  // MAX 模式下受渡劫点限制的可升级次数（未渡劫成功时不限）
  const pointLevelLimit = needTribPoint
    ? Math.floor((state.tribulationPoints || 0) / UPGRADE_TRIBULATION_POINT_COST)
    : Infinity;

  const rows = visibleUpgrades.map((id) => {
    const meta = UPGRADE_METADATA[id];
    const upgradeState = state.upgrades[id];
    // 永劫殿该属性的独立等级：概率类上限需据此扣减，保证两殿合计不超 100%
    const rebirthLevel = state.rebirthMergedLevels?.[id] || 0;
    const maxLevel = getUpgradeMaxLevel(id, upgradeState, rebirthLevel);
    // 数值重置丹保留的等级：只计入效果，不计入升级消耗
    const keptLevel = state.valueResetLevels?.[id] || 0;
    // 往生殿的倍数与优惠均已迁移至永劫殿，数值殿升级一律原价
    const currentCost = getUpgradeCost(id, upgradeState.level, maxLevel);

    // 一半 · max 模式：本次实际会购买的级数（按钮即展示这个数；1 级模式不连购）
    const bulk =
      amountMode === '1'
        ? null
        : planByAmountMode(amountMode, (maxLevels) =>
            getBulkUpgradeResult(
              id,
              upgradeState,
              rebirthLevel,
              currentValue,
              Math.min(pointLevelLimit, maxLevels)
            )
          );
    const bulkLevels = bulk?.levels ?? 0;
    // 效果预览：连购模式预览「本次升满后」的效果（一级都买不起时退回 1 级预览）
    const desc = getUpgradeDesc(
      id,
      upgradeState.level,
      keptLevel,
      bulk ? Math.max(1, bulkLevels) : 1
    );

    return {
      id,
      meta,
      upgradeState,
      maxLevel,
      desc,
      currentCost,
      // 本次实扣的数值：1 模式为单次消耗，连购模式为这批升级的总和（bulk 仅在连购模式下非空）
      payCost: bulk ? bulk.cost : currentCost,
      bulkLevels,
      isMaxed: isUpgradeMaxed(id, upgradeState, rebirthLevel),
      canAffordUnlock: state.clickCount >= meta.requiredClicks,
      // 单次（1 模式）是否买得起；连购模式的可用性由 UpgradeAmountButton 按 bulkLevels 判断
      canAffordSingle: !!currentCost && currentValue.gte(currentCost) && hasTribPoint,
    };
  });

  // 已满级的排到最后，其余保持原有顺序
  const orderedRows = [...rows.filter((r) => !r.isMaxed), ...rows.filter((r) => r.isMaxed)];
  const shownRows = hideMaxed ? orderedRows.filter((r) => !r.isMaxed) : orderedRows;

  // 数值重置丹（一次性重置全部功法）：渡劫成功后可用，须持丹且至少一项功法已有等级
  const hasResettableLevel = (Object.keys(state.upgrades) as UpgradeId[]).some(
    (id) => id !== 'autoFrequency' && state.upgrades[id].unlocked && state.upgrades[id].level > 0
  );
  const canUseValueReset = (state.valueResetPills || 0) > 0 && hasResettableLevel;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="flex items-center gap-3 text-[10px] font-serif text-[#6f6656]">
          <span>
            当前数值
            <span className="ml-1 font-mono text-[#c9a86a]">{currentValue.formatChinese(2)}</span>
          </span>
          {state.tribulationSuccess && (
            <span>
              渡劫点
              <span
                className={`ml-1 font-mono ${hasTribPoint ? 'text-[#e8c46a]' : 'text-[#c96a5a]'}`}
              >
                {state.tribulationPoints || 0}
              </span>
            </span>
          )}
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

      {/* 渡劫成功后单独一行提示：每次升级均须消耗 1 点渡劫点（并说明它同时限制了「一键升级」的次数上限） */}
      {state.tribulationSuccess && (
        <div className="-mt-0.5 text-[10px] font-serif text-[#8a7a63]">
          每次升级都会消耗一个渡劫点 · 现有渡劫点{' '}
          <span className="font-mono text-[#e8c46a]">{state.tribulationPoints || 0}</span> 点，
          一键升级每次最多升{' '}
          <span className="font-mono text-[#e8c46a]">
            {BigNum.fromNumber(pointLevelLimit).formatChinese(0)}
          </span>{' '}
          级
        </div>
      )}

      {/* 长按提示 / 数值重置丹 / 一键升级 */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-serif text-[#8a7a63] -mt-0.5">
        <span className="flex-shrink-0">长按升级</span>
        <div className="flex items-center gap-1.5 min-w-0">
          {/* 数值重置丹：消耗 1 颗，一次性重置全部功法——消耗从初始曲线重算，已有效果全部保留 */}
          {state.tribulationSuccess && (
            <button
              id="btn-use-value-reset"
              onClick={() => onUseValueResetPill()}
              disabled={!canUseValueReset}
              className={`px-2 py-0.5 rounded border transition-colors flex-shrink-0 ${
                canUseValueReset
                  ? 'text-[#e8b56f] border-[#4a3f2c] bg-[#2a2620] cursor-pointer hover:border-[#6b5e4c] hover:text-[#ffd98a]'
                  : 'text-[#5b5548] border-[#2b2721] cursor-default'
              }`}
            >
              数值重置丹 {state.valueResetPills || 0}
            </button>
          )}
          {/* 一键升级：升级量开关（1 → 一半 → max 循环）；下方按钮随之联动 */}
          {state.oneKeyUpgradeUnlocked && (
            <UpgradeAmountToggle
              id="btn-upgrade-all"
              mode={amountMode}
              onToggle={cycleAmount}
              className="px-2 py-0.5"
            />
          )}
        </div>
      </div>

      {shownRows.length === 0 ? (
        <div className="text-[11px] text-[#7d7364] font-serif text-center py-4">
          —— 诸法皆已臻圆满，可于永劫商殿提升等级上限 ——
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shownRows.map((row) => {
            const { id, meta, upgradeState, maxLevel, desc, currentCost, payCost, isMaxed } = row;

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
                      ? 'cursor-pointer hover:bg-[#1c2c22] hover:border-[#4d7a56] animate-[unlockGlowGreen_1.5s_ease-in-out_infinite]'
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

            // 仅升级按钮可触发升级，避免误触整行
            const rowInner = (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                      {meta.name}
                    </span>
                    <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#a69b8b] flex-shrink-0">
                      {`Lv.${BigNum.fromNumber(upgradeState.level).formatChinese(0)} / ${BigNum.fromNumber(
                        maxLevel
                      ).formatChinese(0)}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#998e7e] font-serif flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="break-words">{desc.currentDesc}</span>
                    <span className="text-[#6e6456] flex-shrink-0">→</span>
                    <span className="break-words text-[#807667]">{desc.nextDesc}</span>
                  </div>
                </div>

                {/* 通用升级按钮：文案与结算数量由「升级量」模式决定；支持长按连升（含移动端） */}
                <UpgradeAmountButton
                  id={`btn-upgrade-${id}`}
                  mode={amountMode}
                  bulkLevels={row.bulkLevels}
                  cost={payCost}
                  maxed={isMaxed || !currentCost}
                  singleDisabled={!row.canAffordSingle}
                  onSingle={() => {
                    if (!currentCost) return;
                    onUpgrade(id, currentCost);
                  }}
                  onBulk={(levels) => onUpgradeMax(id, levels)}
                  ariaLabel="升级"
                />
              </>
            );

            const rowClassName =
              'flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229]';

            return (
              <div
                key={id}
                id={`upgrade-item-${id}`}
                className={`${rowClassName} select-none`}
              >
                {rowInner}
              </div>
            );
          })}
        </div>
      )}

      {/* 系统开启：成就（50万）/ 称号（200万），置底展示；一次性数值消耗，购买后隐藏；仅按钮可点 */}
      {specialUnlocks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {specialUnlocks.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                s.affordable ? 'hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                    {s.name}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif truncate">{s.desc}</div>
              </div>
              <UpgradeButton
                id={`btn-unlock-${s.id}`}
                disabled={!s.affordable}
                onClick={s.onUnlock}
                ariaLabel="开启"
              >
                {s.costText}
              </UpgradeButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
