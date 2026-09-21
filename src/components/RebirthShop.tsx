import React from 'react';
import { GameState, UpgradeId } from '../types';
import { REBIRTH_MERGED_UPGRADES, AUTO_UNLOCK_COST, RANKING_UNLOCK_COST } from '../config';
import {
  COLLAPSE_COST,
  getRebirthMergedUpgradeCost,
  getRebirthBaseValueCost,
  getRebirthBaseValueGain,
  calculateGameAttributes,
  MULTIPLIER_STEP,
  CRIT_CHANCE_STEP,
  COMBO_CHANCE_STEP,
  AUTO_FREQ_INTERVAL_STEP,
  AUTO_FREQ_INTERVAL_MIN,
  AUTO_FREQ_INTERVAL_BASE,
  AUTO_FREQ_MAX_LEVEL,
  isRebirthEffectCapped,
  getAfterlifeUpgradeMultiplier,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import { UpgradeButton } from './UpgradeButton';

interface RebirthShopProps {
  state: GameState;
  /** 消耗永劫点数升级（所有属性均与数值殿独立，等级永久保留，效果累加） */
  onBuyRebirthMergedUpgrade: (id: UpgradeId) => void;
  /** 消耗 5 点永劫值解锁坍缩（仅完整商殿） */
  onUnlockCollapse?: () => void;
  /** 消耗 1 点永劫点数解锁排行 */
  onUnlockRanking?: () => void;
  /** 消耗 1 点永劫点数购买「功法无需解锁」特权 */
  onBuyAutoUnlock?: () => void;
  /** 一指永劫（重生，仅主视图卡片） */
  onRebirth?: () => void;
  /** 回转（放弃本世，仅主视图卡片） */
  onReset?: () => void;
}

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

/** 每项描述：当前值 → 升级后值（永劫殿独立效果，与数值殿格式一致；已封顶时提示已至上限） */
const effectText = (
  id: UpgradeId,
  level: number,
  attrs: ReturnType<typeof calculateGameAttributes>,
  afterlifeLevel: number = 0
): string => {
  switch (id) {
    case 'baseValue': {
      // 独立公式：每级固定 +2（线性增长），并受往生殿「数值升级」基础倍数放大
      const cur = `基础 ${attrs.baseValue.formatChinese(1)}`;
      const next = `基础 ${attrs.baseValue
        .add(getRebirthBaseValueGain(level + 1, afterlifeLevel))
        .formatChinese(1)}`;
      return `${cur} → ${next}`;
    }
    case 'autoFrequency': {
      const cur = `${attrs.autoClicksPerSec.toFixed(1)}次/s`;
      if (attrs.autoIntervalMs <= AUTO_FREQ_INTERVAL_MIN) return `${cur} → 已至上限`;
      const nextInterval = Math.max(
        AUTO_FREQ_INTERVAL_MIN,
        attrs.autoIntervalMs - AUTO_FREQ_INTERVAL_STEP
      );
      return `${cur} → ${(AUTO_FREQ_INTERVAL_BASE / nextInterval).toFixed(1)}次/s`;
    }
    case 'critMultiplier':
    case 'comboMultiplier': {
      // 每级 +30% × 往生殿强化倍数
      const step = MULTIPLIER_STEP * getAfterlifeUpgradeMultiplier(id, afterlifeLevel);
      const cur = id === 'critMultiplier' ? attrs.critMultiplier : attrs.comboMultiplier;
      return `${pctText(cur)} → ${pctText(cur + step)}`;
    }
    case 'critChance':
      return attrs.critChance >= 1.0
        ? `${pctText(attrs.critChance)} → 已至上限`
        : `${pctText(attrs.critChance)} → ${pctText(Math.min(1, attrs.critChance + CRIT_CHANCE_STEP))}`;
    case 'comboChance':
      return attrs.comboChance >= 1.0
        ? `${pctText(attrs.comboChance)} → 已至上限`
        : `${pctText(attrs.comboChance)} → ${pctText(Math.min(1, attrs.comboChance + COMBO_CHANCE_STEP))}`;
    default:
      return '';
  }
};

export const RebirthShop: React.FC<RebirthShopProps> = ({
  state,
  onBuyRebirthMergedUpgrade,
  onUnlockCollapse,
  onUnlockRanking,
  onBuyAutoUnlock,
  onRebirth,
  onReset,
}) => {
  const canUnlockCollapse = !state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const canUnlockRanking = state.rebirthPoints >= RANKING_UNLOCK_COST;
  const canBuyAutoUnlock = state.rebirthPoints >= AUTO_UNLOCK_COST;
  const attrs = calculateGameAttributes(state);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数{' '}
          <span className="text-[#5fa8e6]">
            {BigNum.fromNumber(state.rebirthPoints).formatChinese(0)}
          </span>
        </div>
        <div className="text-[10px] font-serif text-[#8a7a63]">长按升级</div>
      </div>

      {/* 升级：所有属性均与数值殿独立，等级永久保留，计算时效果与数值殿累加 */}
      <div className="flex flex-col gap-1.5">
        {REBIRTH_MERGED_UPGRADES.filter(({ id }) => {
          // 概率 / 频率类：效果已达上限（概率 100% / 频率 20 级满级）后直接隐藏
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
          const canBuy = cost !== null && state.rebirthPoints >= cost.toNumber();
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
                    Lv.{level}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">
                  {capText(id) ? `${capText(id)} · ` : ''}
                  {effectText(id, level, attrs, afterlifeLevel)}
                </div>
                {afterlifeMult > 1 && (
                  <div className="text-[10px] font-serif text-[#d897fa] mt-0.5">
                    往生殿强化 ×{afterlifeMult}（永劫殿加成）
                  </div>
                )}
              </div>
              <UpgradeButton
                id={`btn-rebirth-merged-${id}`}
                disabled={!canBuy}
                onPress={() => {
                  if (!canBuy || cost === null) return;
                  onBuyRebirthMergedUpgrade(id);
                }}
              >
                {freqMaxed ? '圆满' : `${cost!.formatChinese(0)} 点`}
              </UpgradeButton>
            </div>
          );
        })}
      </div>

      {/* 功法通明（已购后隐藏） */}
      {onBuyAutoUnlock && !state.upgradesAutoUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-autounlock"
            onClick={() => {
              if (canBuyAutoUnlock) onBuyAutoUnlock();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canBuyAutoUnlock ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">功法通明</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未购</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">功法无需解锁 · 可直接升级，重生后保留</div>
            </div>
            <UpgradeButton id="btn-shop-unlock-autounlock" disabled={!canBuyAutoUnlock}>
              {AUTO_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁排行（已解锁后隐藏） */}
      {onUnlockRanking && !state.rankingUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-ranking"
            onClick={() => {
              if (canUnlockRanking) onUnlockRanking();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockRanking ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">解锁排行</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未开启</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">开启天榜 · 查看数值 / 富豪 / 时长 / 重生排行</div>
            </div>
            <UpgradeButton id="btn-shop-unlock-ranking" disabled={!canUnlockRanking}>
              {RANKING_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁坍缩 */}
      {onUnlockCollapse && !state.collapseUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-collapse"
            onClick={() => {
              if (canUnlockCollapse) onUnlockCollapse();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockCollapse ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">解锁坍缩</span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">未觉醒</span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif mt-0.5">觉醒太虚坍缩秘境 · 解锁后方可献祭永劫值进行坍缩</div>
            </div>
            <UpgradeButton id="btn-shop-unlock-collapse" disabled={!canUnlockCollapse}>
              {COLLAPSE_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 永劫 / 回转 */}
      {onRebirth && (
        <div className="pt-1.5 border-t border-[#2d2822] flex gap-2">
          <div
            id="shop-btn-rebirth"
            onClick={onRebirth}
            className="flex-1 text-center font-serif font-bold text-xs sm:text-sm text-[#ded7cb] p-2 rounded-lg bg-[#211f1c] border border-[#383229] cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]"
          >
            一指永劫（重生）
          </div>
          {onReset && (
            <div
              id="shop-btn-reset"
              onClick={onReset}
              className="flex-1 text-center font-serif font-bold text-xs sm:text-sm text-[#ded7cb] p-2 rounded-lg bg-[#211f1c] border border-[#383229] cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]"
            >
              回转（放弃本世）
            </div>
          )}
        </div>
      )}
    </div>
  );
};
