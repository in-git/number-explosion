import React from 'react';
import { GameState } from '../types';
import { COLLAPSE_COST, getRebirthBaseAttrCost } from '../utils/gameMath';
import {
  AUTO_UNLOCK_COST,
  RANKING_UNLOCK_COST,
  INITIAL_REBIRTH_BASE_ATTRS,
  REBIRTH_BASE_ATTR_LABELS,
} from '../config';
import { UpgradeButton } from './UpgradeButton';
import { PressableRow } from './PressableRow';
import { BigNum } from '../utils/bigNumber';

type AttrKey = keyof typeof REBIRTH_BASE_ATTR_LABELS;

interface RebirthShopProps {
  state: GameState;
  /** 消耗 1 点永劫点数，单独升级某项永劫基础属性 */
  onBuyRebirthBaseAttr: (key: AttrKey) => void;
  /** 消耗 5 点永劫值解锁坍缩 */
  onUnlockCollapse: () => void;
  /** 消耗 1 点永劫点数解锁排行 */
  onUnlockRanking: () => void;
  /** 消耗 1 点永劫点数购买「功法无需解锁」特权 */
  onBuyAutoUnlock: () => void;
}

/** 格式化：统一使用系统 BigNum 方法，避免大数（如高倍数/高概率）显示溢出 */
const fmtPct = (v: number) => BigNum.fromNumber(v * 100).formatChinese(0);
const fmtInt = (v: number) => BigNum.fromNumber(v).formatChinese(0);

/** 商店中每项基础的展示信息：当前值文案 + 单次提升文案 */
const ATTR_DISPLAY: Record<AttrKey, { current: (v: number) => string; gain: string }> = {
  baseValue: { current: (v) => `当前 +${fmtInt(v)}`, gain: '+5' },
  autoFrequency: { current: (v) => `当前 +${fmtInt(v)} 级`, gain: '+1 级' },
  critMultiplier: { current: (v) => `当前 +${fmtPct(v)}%`, gain: '+200%' },
  critChance: { current: (v) => `当前 +${fmtPct(v)}%`, gain: '+100%' },
  comboChance: { current: (v) => `当前 +${fmtPct(v)}%`, gain: '+100%' },
  comboMultiplier: { current: (v) => `当前 +${fmtPct(v)}%`, gain: '+200%' },
};

const ATTR_ORDER: AttrKey[] = [
  'baseValue',
  'autoFrequency',
  'critMultiplier',
  'critChance',
  'comboChance',
  'comboMultiplier',
];

export const RebirthShop: React.FC<RebirthShopProps> = ({
  state,
  onBuyRebirthBaseAttr,
  onUnlockCollapse,
  onUnlockRanking,
  onBuyAutoUnlock,
}) => {
  const canUnlockCollapse = !state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const canUnlockRanking = state.rebirthPoints >= RANKING_UNLOCK_COST;
  const canBuyAutoUnlock = state.rebirthPoints >= AUTO_UNLOCK_COST;

  const rebirthBase = state.rebirthBaseAttrs || INITIAL_REBIRTH_BASE_ATTRS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2822]">
      
        <div className="text-[10px] font-mono text-[#8a7a63]">
          永劫点数 <span className="text-[#5fa8e6]">{state.rebirthPoints}</span>
        </div>
      </div>

      {/* 升级：永劫基础属性（逐项单独升级） */}
      <div className="flex flex-col gap-1.5">
        {ATTR_ORDER.map((key) => {
          const label = REBIRTH_BASE_ATTR_LABELS[key];
          const display = ATTR_DISPLAY[key];
          const cost = getRebirthBaseAttrCost(key, rebirthBase[key]).toNumber();
          const canBuyAttr = state.rebirthPoints >= cost;

          return (
            <PressableRow
              key={key}
              id={`shop-item-rebirth-attr-${key}`}
              disabled={!canBuyAttr}
              onPress={() => {
                if (canBuyAttr) onBuyRebirthBaseAttr(key);
              }}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
                canBuyAttr ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] break-words">
                    {label}
                  </span>
                </div>
                <div className="text-[10px] text-[#998e7e] font-serif break-words mt-0.5">
                  每次 {display.gain} · {display.current(rebirthBase[key])}
                </div>
              </div>

              <UpgradeButton
                id={`btn-shop-rebirth-attr-${key}`}
                disabled={!canBuyAttr}
              >
                {cost} 点
              </UpgradeButton>
            </PressableRow>
          );
        })}
      </div>

      {/* 功法无需解锁：购买后数值功法不必解锁即可直接升级 */}
      {!state.upgradesAutoUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-auto-unlock"
            onClick={() => {
              if (canBuyAutoUnlock) onBuyAutoUnlock();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canBuyAutoUnlock ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  功法通明
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                功法无需解锁 · 永世可直接升级（重生亦不退回）
              </div>
            </div>

            <UpgradeButton id="btn-shop-auto-unlock" disabled={!canBuyAutoUnlock}>
              {AUTO_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 解锁排行：开启天榜（默认不显示） */}
      {!state.rankingUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-ranking"
            onClick={() => {
              if (canUnlockRanking) onUnlockRanking();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockRanking ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁排行
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未开启
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                开启天榜 · 查看数值 / 富豪 / 时长 / 重生排行
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-ranking" disabled={!canUnlockRanking}>
              {RANKING_UNLOCK_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}

      {/* 最底部：解锁坍缩（坍缩行为已迁至坍缩商店） */}
      {!state.collapseUnlocked && (
        <div className="pt-1.5 border-t border-[#2d2822]">
          <div
            id="shop-item-unlock-collapse"
            onClick={() => {
              if (canUnlockCollapse) onUnlockCollapse();
            }}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-[#211f1c] border border-[#383229] transition-colors ${
              canUnlockCollapse ? 'cursor-pointer hover:bg-[#2a2620] hover:border-[#5b5142]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb] truncate">
                  解锁坍缩
                </span>
                <span className="text-[10px] font-mono px-1 py-px rounded bg-[#2a2620] border border-[#3e372c] text-[#8f8574] flex-shrink-0">
                  未觉醒
                </span>
              </div>
              <div className="text-[10px] text-[#998e7e] font-serif truncate mt-0.5">
                觉醒太虚坍缩秘境 · 解锁后方可献祭永劫值进行坍缩
              </div>
            </div>

            <UpgradeButton id="btn-shop-unlock-collapse" disabled={!canUnlockCollapse}>
              {COLLAPSE_COST} 点
            </UpgradeButton>
          </div>
        </div>
      )}
    </div>
  );
};
