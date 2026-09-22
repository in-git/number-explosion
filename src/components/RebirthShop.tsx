import React from 'react';
import { UpgradeId } from '../types';
import { useGameActions, useGameData } from '../context/GameContext';
import { REBIRTH_MERGED_UPGRADES, AUTO_UNLOCK_COST, RANKING_UNLOCK_COST } from '../config';
import { useUpgradeAmountMode } from '../hooks/useUpgradeAmountMode';
import { UpgradeAmountButton } from './UpgradeAmountButton';
import { UpgradeAmountToggle } from './UpgradeAmountToggle';
import {
  COLLAPSE_COST,
  getBulkRebirthUpgradeResult,
  planByAmountMode,
  getRebirthMergedUpgradeCost,
  getRebirthBaseValueCost,
  getRebirthBaseValueBonus,
  calculateGameAttributes,
  MULTIPLIER_STEP,
  CRIT_CHANCE_STEP,
  COMBO_CHANCE_STEP,
  AUTO_FREQ_INTERVAL_STEP,
  AUTO_FREQ_INTERVAL_MIN,
  AUTO_FREQ_INTERVAL_BASE,
  AUTO_FREQ_MAX_LEVEL,
  isRebirthEffectCapped,
  isChanceCapped,
  getAfterlifeUpgradeMultiplier,
  getRebirthChanceHeadroom,
  getRebirthBulkUpgradeCost,
  UPGRADE_TRIBULATION_POINT_COST,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import { UpgradeButton } from './UpgradeButton';

/** 有上限属性的封顶提示（无上限项返回空，如基础数值 / 倍数） */
const capText = (id: UpgradeId): string => {
  switch (id) {
    case 'autoFrequency':
      return `上限 ${AUTO_FREQ_INTERVAL_BASE / AUTO_FREQ_INTERVAL_MIN}次/s`;
    case 'critChance':
    case 'comboChance':
      return '上限 100%';
    default:
      return '';
  }
};

/** 百分比文案：整百分数不带小数，否则保留 1 位 */
const pctText = (ratio: number): string => {
  const v = Math.round(ratio * 1000) / 10;
  return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}%`;
};

/** 数值高亮：把效果文案中的关键数字点亮，便于一眼看清 */
const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-bold text-[#e8c46a]">{children}</span>
);

/**
 * 每项描述：当前值 → 升级后值（永劫殿独立效果，与数值殿格式一致；已封顶时提示已至上限）
 * @param levels 本次升级级数：×1 为 1；MAX 为本次实际能升的级数（预览随之取更远的档）
 */
const effectText = (
  id: UpgradeId,
  level: number,
  attrs: ReturnType<typeof calculateGameAttributes>,
  afterlifeLevel: number = 0,
  levels: number = 1
): React.ReactNode => {
  const gain = Number.isFinite(levels) && levels > 1 ? Math.floor(levels) : 1;

  switch (id) {
    case 'baseValue': {
      // 独立公式：每级固定 +2（线性增长），并受往生殿「数值升级」基础倍数放大。
      // 注意 getRebirthBaseValueGain 与等级无关（恒为 +2×倍数），
      // 故 gain 级的增量须取「升 gain 级前后累计加成之差」，不能只按 1 级算。
      const gainTotal = getRebirthBaseValueBonus(level + gain, afterlifeLevel).sub(
        getRebirthBaseValueBonus(level, afterlifeLevel)
      );
      const cur = attrs.baseValue.formatChinese(1);
      const next = attrs.baseValue.add(gainTotal).formatChinese(1);
      return (
        <>
          基础 <Num>{cur}</Num> → 基础 <Num>{next}</Num>
        </>
      );
    }
    case 'autoFrequency': {
      const cur = `${attrs.autoClicksPerSec.toFixed(1)}次/s`;
      if (attrs.autoIntervalMs <= AUTO_FREQ_INTERVAL_MIN) return `${cur} → 已至上限`;
      const nextInterval = Math.max(
        AUTO_FREQ_INTERVAL_MIN,
        attrs.autoIntervalMs - AUTO_FREQ_INTERVAL_STEP * gain
      );
      return `${cur} → ${(AUTO_FREQ_INTERVAL_BASE / nextInterval).toFixed(1)}次/s`;
    }
    case 'critMultiplier':
    case 'comboMultiplier': {
      // 每级 +30% × 往生殿强化倍数
      const step = MULTIPLIER_STEP * getAfterlifeUpgradeMultiplier(id, afterlifeLevel);
      const cur = id === 'critMultiplier' ? attrs.critMultiplier : attrs.comboMultiplier;
      return `${pctText(cur)} → ${pctText(cur + step * gain)}`;
    }
    case 'critChance':
      return attrs.critChance >= 1.0
        ? `${pctText(attrs.critChance)} → 已至上限`
        : `${pctText(attrs.critChance)} → ${pctText(Math.min(1, attrs.critChance + CRIT_CHANCE_STEP * gain))}`;
    case 'comboChance':
      return attrs.comboChance >= 1.0
        ? `${pctText(attrs.comboChance)} → 已至上限`
        : `${pctText(attrs.comboChance)} → ${pctText(Math.min(1, attrs.comboChance + COMBO_CHANCE_STEP * gain))}`;
    default:
      return '';
  }
};

export const RebirthShop: React.FC = () => {
  const { state } = useGameData();
  const {
    handleBuyRebirthMergedUpgrade,
    handleBuyRebirthMergedUpgradeMax: onBuyMax,
    handleUnlockCollapse,
    handleUnlockRanking,
    handleBuyAutoUnlock,
    handleUseRebirthResetPill: onUseRebirthResetPill,
  } = useGameActions();

  // 永劫重置丹（一次性重置全部属性）：渡劫成功后可用，须持丹且至少一项属性已有等级
  const hasResettableLevel =
    (state.rebirthBaseValueLevel || 0) > 0 ||
    REBIRTH_MERGED_UPGRADES.some(
      ({ id }) =>
        id !== 'baseValue' && id !== 'autoFrequency' && (state.rebirthMergedLevels?.[id] || 0) > 0
    );
  const canUseRebirthReset = (state.rebirthResetPills || 0) > 0 && hasResettableLevel;

  /** 升级量模式（全局「一键升级」开关）：1（默认）/ 一半 / max；任意一殿切换，各殿按钮次数联动 */
  const { mode: amountMode, cycle: cycleAmount } = useUpgradeAmountMode();

  // 各条目的展示由解锁状态决定（未解锁的解锁项常驻，解锁后隐藏）
  const canUnlockCollapse = !state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const canUnlockRanking = state.rebirthPoints >= RANKING_UNLOCK_COST;
  const canBuyAutoUnlock = state.rebirthPoints >= AUTO_UNLOCK_COST;
  const attrs = calculateGameAttributes(state);

  // 渡劫成功后：永劫殿每次购买另须消耗渡劫点，点数不足则不可购买
  const needTribPoint = !!state.tribulationSuccess;
  const hasTribPoint =
    !needTribPoint || (state.tribulationPoints || 0) >= UPGRADE_TRIBULATION_POINT_COST;
  // MAX 模式下受渡劫点限制的可购买次数（未渡劫成功时不限）
  const pointLevelLimit = needTribPoint
    ? Math.floor((state.tribulationPoints || 0) / UPGRADE_TRIBULATION_POINT_COST)
    : Infinity;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数{' '}
          <span className="text-[#5fa8e6]">
            {BigNum.fromNumber(state.rebirthPoints).formatChinese(0)}
          </span>
          {state.tribulationSuccess && (
            <>
              {' · '}渡劫点{' '}
              <span className={hasTribPoint ? 'text-[#e8c46a]' : 'text-[#c96a5a]'}>
                {state.tribulationPoints || 0}
              </span>
              {' · '}每次升级 -{UPGRADE_TRIBULATION_POINT_COST}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-serif text-[#8a7a63]">长按升级</span>
        </div>
      </div>

      {/* 渡劫成功后：每次升级另耗 1 点渡劫点，它同时决定了「一键升级」的次数上限 */}
      {state.tribulationSuccess && (
        <div className="-mt-0.5 text-[10px] font-serif text-[#8a7a63]">
          每次升级另耗 1 点渡劫点 · 现有渡劫点{' '}
          <span className="font-mono text-[#e8c46a]">{state.tribulationPoints || 0}</span> 点，
          一键升级每次最多买{' '}
          <span className="font-mono text-[#e8c46a]">
            {BigNum.fromNumber(pointLevelLimit).formatChinese(0)}
          </span>{' '}
          级
        </div>
      )}

      {/* 工具行：一键升级 / 永劫重置丹（位于「数值升级」之上） */}
      {(state.oneKeyUpgradeUnlocked || state.tribulationSuccess) && (
        <div
          id="rebirth-reset-pill-row"
          className="flex items-center gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229]"
        >
          {/* 永劫重置丹居左、一键升级居右（与数值殿一致） */}
          <div className="flex flex-1 min-w-0 items-center justify-between gap-2">
            {/* 永劫重置丹：消耗 1 颗，一次性重置全部属性 */}
            {state.tribulationSuccess && (
              <button
                id="btn-use-rebirth-reset"
                title="消耗 1 颗：全部属性等级清零，升级消耗重算，已有效果全部保留"
                onClick={onUseRebirthResetPill}
                disabled={!canUseRebirthReset}
                className={`px-1.5 py-px text-[10px] font-serif rounded border transition-colors flex-shrink-0 ${
                  canUseRebirthReset
                    ? 'text-[#e8b56f] border-[#4a3f2c] bg-[#2a2620] cursor-pointer hover:border-[#6b5e4c] hover:text-[#ffd98a]'
                    : 'text-[#5b5548] border-[#2b2721] cursor-default'
                }`}
              >
                永劫重置丹 {state.rebirthResetPills || 0}
              </button>
            )}
            {/* 一键升级：升级量开关（1 → 一半 → max 循环）；下方按钮随之联动 */}
            {state.oneKeyUpgradeUnlocked && (
              <UpgradeAmountToggle
                id="btn-rebirth-upgrade-all"
                mode={amountMode}
                onToggle={cycleAmount}
                className="px-1.5 py-px text-[10px]"
              />
            )}
          </div>
        </div>
      )}

      {/* 升级：所有属性均与数值殿独立，等级永久保留，计算时效果与数值殿累加 */}
      <div className="flex flex-col gap-1.5">
        {REBIRTH_MERGED_UPGRADES.filter(({ id }) => {
          // 概率类：以「数值殿 + 永劫殿」合计为准，合计已达（或超过）100% 即隐藏——再升已无效果
          if (isChanceCapped(attrs, id)) return false;
          // 其余上限类（频率 20 级满级）：达到后直接隐藏
          const level =
            id === 'baseValue'
              ? state.rebirthBaseValueLevel || 0
              : state.rebirthMergedLevels?.[id] || 0;
          return !isRebirthEffectCapped(id, level);
        }).map(({ id, label }) => {
          // 「基础数值」存于 rebirthBaseValueLevel，其余存于 rebirthMergedLevels（均与数值殿独立）
          const level =
            id === 'baseValue'
              ? state.rebirthBaseValueLevel || 0
              : state.rebirthMergedLevels?.[id] || 0;
          // 往生殿：该属性的往生强化等级与强化倍数（放大永劫殿该属性的累计加成）
          const afterlifeLevel = state.afterlifeUpgradeLevels?.[id] || 0;
          const afterlifeMult = getAfterlifeUpgradeMultiplier(id, afterlifeLevel);
          // 自动点击频率：永劫殿独立 20 级满级
          const freqMaxed = id === 'autoFrequency' && level >= AUTO_FREQ_MAX_LEVEL;
          const cost = freqMaxed
            ? null
            : id === 'baseValue'
              ? getRebirthBaseValueCost(level)
              : getRebirthMergedUpgradeCost(id, level);
          // 一半 · max：本次实际会购买的级数与总消耗（永劫点数）
          // 上限同时受本次次数、渡劫点与「两殿概率合计不超 100%」约束
          const bulk =
            amountMode === '1'
              ? null
              : planByAmountMode(amountMode, (maxLevels) =>
                  getBulkRebirthUpgradeResult(
                    id,
                    level,
                    state.rebirthPoints,
                    Math.min(pointLevelLimit, maxLevels, getRebirthChanceHeadroom(attrs, id)),
                    // 消耗线性递增：走闭式累计消耗 + 二分，避免大预算时逐级扫描卡死页面
                    (count) => getRebirthBulkUpgradeCost(id, level, count)
                  )
                );
          const canBuy = bulk
            ? bulk.levels > 0
            : cost !== null && state.rebirthPoints >= cost.toNumber() && hasTribPoint;
          // 效果预览级数：连购模式预览「本次升满后」的效果（一级都买不起时退回 1 级预览）
          const previewLevels = bulk ? Math.max(1, bulk.levels) : 1;
          return (
            <div
              key={id}
              id={`rebirth-merged-${id}`}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] ${
                canBuy ? '' : 'opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                    {label}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574]">
                    Lv.{BigNum.fromNumber(level).formatChinese(0)}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">
                  {capText(id) ? `${capText(id)} · ` : ''}
                  {effectText(id, level, attrs, afterlifeLevel, previewLevels)}
                </div>
                {afterlifeMult > 1 && (
                  <div className="text-[10px] font-serif text-[#d897fa] mt-0.5">
                    往生殿强化 ×{BigNum.fromNumber(afterlifeMult).formatChinese(0)}
                  </div>
                )}
              </div>
              <UpgradeAmountButton
                id={`btn-rebirth-merged-${id}`}
                mode={amountMode}
                bulkLevels={bulk?.levels ?? 0}
                cost={bulk ? bulk.cost : cost}
                maxed={cost === null}
                singleDisabled={!canBuy}
                onSingle={() => handleBuyRebirthMergedUpgrade(id)}
                onBulk={(levels) => onBuyMax(id, levels)}
                ariaLabel="升级"
              />
            </div>
          );
        })}
      </div>

      {/* 功法通明（已购后隐藏） */}
      {!state.upgradesAutoUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-autounlock"
            onClick={() => {
              if (canBuyAutoUnlock) handleBuyAutoUnlock();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canBuyAutoUnlock ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142] animate-[unlockGlow_1.5s_ease-in-out_infinite]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">功法通明</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未购</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">功法无需解锁 · 可直接升级，重生后保留</div>
            </div>
            <UpgradeButton
              id="btn-shop-unlock-autounlock"
              disabled={!canBuyAutoUnlock}
              dashedBorder
            >
              {AUTO_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁排行（已解锁后隐藏） */}
      {!state.rankingUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-ranking"
            onClick={() => {
              if (canUnlockRanking) handleUnlockRanking();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockRanking ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142] animate-[unlockGlow_1.5s_ease-in-out_infinite]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">解锁排行</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未开启</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">开启天榜 · 查看数值 / 时长 / 重生 / 连点排行</div>
            </div>
            <UpgradeButton
              id="btn-shop-unlock-ranking"
              disabled={!canUnlockRanking}
              dashedBorder
            >
              {RANKING_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁坍缩 */}
      {!state.collapseUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-collapse"
            onClick={() => {
              if (canUnlockCollapse) handleUnlockCollapse();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockCollapse ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142] animate-[unlockGlow_1.5s_ease-in-out_infinite]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">解锁坍缩</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未觉醒</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">觉醒太虚坍缩秘境 · 解锁后方可献祭永劫值进行坍缩</div>
            </div>
            <UpgradeButton
              id="btn-shop-unlock-collapse"
              disabled={!canUnlockCollapse}
              dashedBorder
            >
              {COLLAPSE_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

    </div>
  );
};
