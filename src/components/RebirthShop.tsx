import React from 'react';
import { GameState, UpgradeId } from '../types';
import { REBIRTH_MERGED_UPGRADES, AUTO_UNLOCK_COST, RANKING_UNLOCK_COST } from '../config';
import {
  COLLAPSE_COST,
  getRebirthMergedUpgradeCost,
  getBaseValueBonus,
  getAutoClickRate,
  calculateGameAttributes,
  getUpgradeMaxLevel,
  MULTIPLIER_STEP,
} from '../utils/gameMath';
import { BigNum } from '../utils/bigNumber';
import { PressableRow } from './PressableRow';
import { UpgradeButton } from './UpgradeButton';

interface RebirthShopProps {
  state: GameState;
  /** 消耗永劫点数，提升数值店对应升级等级（已合并，永久保留） */
  onBuyRebirthMergedUpgrade: (id: UpgradeId) => void;
  /** 消耗 5 点永劫值解锁坍缩（仅完整商店） */
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

/** 每项单次提升文案（与数值店升级效果一致） */
const nextGainText = (id: UpgradeId, level: number): string => {
  switch (id) {
    case 'baseValue': {
      const add = getBaseValueBonus(level + 1).sub(getBaseValueBonus(level));
      return `+${add.formatChinese(1)} 基础数值`;
    }
    case 'autoFrequency': {
      const cur = getAutoClickRate(level).intervalMs;
      const nxt = getAutoClickRate(level + 1).intervalMs;
      const step = cur - nxt;
      return step > 0 ? `自动间隔 -${step}ms` : '已至极速';
    }
    case 'critMultiplier':
    case 'comboMultiplier':
      return `倍数 +${MULTIPLIER_STEP * 100}%`;
    case 'critChance':
    case 'comboChance':
      return '概率 +5%';
    default:
      return '';
  }
};

/** 每项当前实际效果文案（含功法等级 / 成就加成，与属性面板同源） */
const currentValueText = (id: UpgradeId, attrs: ReturnType<typeof calculateGameAttributes>): string => {
  switch (id) {
    case 'baseValue':
      return `当前基础 ${attrs.baseValue.formatChinese(1)}`;
    case 'autoFrequency':
      return `当前 ${attrs.autoClicksPerSec.toFixed(1)} 次/s`;
    case 'critMultiplier':
      return `当前 ${BigNum.fromNumber(attrs.critMultiplier * 100).formatChinese(0)}%`;
    case 'comboMultiplier':
      return `当前 ${BigNum.fromNumber(attrs.comboMultiplier * 100).formatChinese(0)}%`;
    case 'critChance':
      return `当前 ${BigNum.fromNumber(attrs.critChance * 100).formatChinese(1)}%`;
    case 'comboChance':
      return `当前 ${BigNum.fromNumber(attrs.comboChance * 100).formatChinese(1)}%`;
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
        <div className="text-[10px] font-serif text-[#8a7a63]">长按条目可持续升级</div>
      </div>

      {/* 升级：永劫基础属性（已合并至数值店升级等级，重生/坍缩后永久保留） */}
      <div className="flex flex-col gap-1.5">
        {REBIRTH_MERGED_UPGRADES.map(({ id, label }) => {
          const up = state.upgrades[id] || { unlocked: false, level: 0, capBonus: 0 };
          const level = up.level || 0;
          const maxLevel = getUpgradeMaxLevel(id, up);
          const cost = getRebirthMergedUpgradeCost(id, level);
          const canBuy = state.rebirthPoints >= cost.toNumber();
          return (
            <PressableRow
              key={id}
              id={`rebirth-merged-${id}`}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuy ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : 'opacity-50'
              }`}
              disabled={!canBuy}
              onPress={() => onBuyRebirthMergedUpgrade(id)}
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
                  上限 Lv.{maxLevel} · {currentValueText(id, attrs)} · {nextGainText(id, level)}
                </div>
              </div>
              <UpgradeButton id={`btn-rebirth-merged-${id}`} disabled={!canBuy}>
                {cost.formatChinese(0)} 点
              </UpgradeButton>
            </PressableRow>
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
