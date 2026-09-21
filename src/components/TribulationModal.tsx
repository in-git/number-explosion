import React from 'react';
import { GameState } from '../types';
import { BigNum } from '../utils/bigNumber';
import {
  TRIBULATION_COST,
  TRIBULATION_MAX_COUNT,
  TRIBULATION_PILL_BONUS,
  TRIBULATION_PILL_COST,
  getTribulationSuccessRate,
} from '../utils/gameMath';

interface TribulationModalProps {
  state: GameState;
  /** 发起渡劫（消耗 1 万往生点；成功渡劫点 +1，失败失去全部点数） */
  onTribulate: () => void;
  /** 服用渡劫丹（300 往生点，渡劫成功率 +10%） */
  onBuyPill: () => void;
}

/** 百分比文案 */
const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** 天雷峰·渡劫：大标题 + 警告 + 圆形渡劫钮 + 渡劫丹小商店 */
export const TribulationModal: React.FC<TribulationModalProps> = ({
  state,
  onTribulate,
  onBuyPill,
}) => {
  const pills = state.tribulationPills || 0;
  const chance = getTribulationSuccessRate(pills);
  const nextChance = getTribulationSuccessRate(pills + 1);
  // 渡劫次数（= 成功次数）即收益的次方指数
  const tribulationCount = state.tribulationCount || 0;
  // 次数用尽后不可再渡劫
  const countExhausted = tribulationCount >= TRIBULATION_MAX_COUNT;
  const canTribulate = !countExhausted && state.afterlifePoints >= TRIBULATION_COST;
  const canBuyPill = state.afterlifePoints >= TRIBULATION_PILL_COST && chance < 1;

  return (
    <div className="flex flex-col items-center gap-4 pb-2">
      {/* 天雷峰 */}
      <div className="w-full text-center pt-1">
        <div
          className="font-serif font-bold text-3xl sm:text-4xl tracking-[0.28em] text-[#f2ded0]"
          style={{ textShadow: '0 2px 14px rgba(240,121,121,0.55), 0 2px 6px rgba(0,0,0,0.95)' }}
        >
          天 雷 峰
        </div>
        <div className="mt-3 px-2 text-[11px] font-serif leading-relaxed text-[#c99a9a]">
          一旦失败，将会失去所有的永劫点，坍缩点，往生点，是你所有的一切
        </div>
      </div>

      {/* 圆形渡劫钮 */}
      <button
        id="btn-tribulation-attempt"
        onClick={() => {
          if (canTribulate) onTribulate();
        }}
        disabled={!canTribulate}
        className={`flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 font-serif font-bold text-xl tracking-[0.2em] transition-all ${
          canTribulate
            ? 'cursor-pointer active:translate-y-0.5 border-[#8a653f] bg-gradient-to-b from-[#3a2418] to-[#1d1410] text-[#f5e6c8] animate-[tribulationPulse_2.2s_ease-in-out_infinite]'
            : 'cursor-not-allowed border-[#3a332c] bg-[#1a1715] text-[#6b6455]'
        }`}
      >
        渡劫
      </button>

      {/* 当前状态 */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-serif text-[#948a7a]">
        <span>
          渡劫次数{' '}
          <span className="font-mono font-bold text-[#c9a86a]">
            {tribulationCount}/{TRIBULATION_MAX_COUNT}
          </span>
        </span>
        <span>
          成功率 <span className="font-mono font-bold text-[#76d18c]">{pct(chance)}</span>
        </span>
        <span>
          往生点 <span className="font-mono font-bold text-[#d897fa]">{state.afterlifePoints}</span>
        </span>
      </div>

      {/* 渡劫状态说明：未成功前次方不参与收益计算 */}
      <div
        className={`w-full text-center text-[10px] font-serif ${
          tribulationCount > 0 ? 'text-[#76d18c]' : 'text-[#8a7a63]'
        }`}
      >
        {countExhausted
          ? `渡劫次数已满（${TRIBULATION_MAX_COUNT}/${TRIBULATION_MAX_COUNT}）· 单次收益取原值的 ${tribulationCount} 次方`
          : tribulationCount > 0
            ? `已渡劫成功 ${tribulationCount} 次 · 单次收益取原值的 ${tribulationCount} 次方`
            : '尚未渡劫成功 · 次方暂不参与收益计算'}
      </div>

      {/* 渡劫丹小商店 */}
      <div className="w-full rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">渡劫丹</span>
          <span className="text-[10px] font-mono text-[#8a7a63] flex-shrink-0">
            已服 {pills} 颗
          </span>
        </div>
        <div className="text-[10px] font-serif text-[#998e7e] mt-0.5">
          每颗 +{Math.round(TRIBULATION_PILL_BONUS * 100)}% 渡劫概率 · {pct(chance)} →{' '}
          {pct(nextChance)}
        </div>
        <button
          id="btn-tribulation-pill"
          onClick={() => {
            if (canBuyPill) onBuyPill();
          }}
          disabled={!canBuyPill}
          className={`mt-2 w-full py-2 rounded-lg border text-xs font-serif transition-colors ${
            canBuyPill
              ? 'bg-[#241f1a] border-[#4a3a24] text-[#e8cf9a] hover:border-[#8a653f] cursor-pointer active:translate-y-0.5'
              : 'bg-[#1a1715] border-[#2b2721] text-[#6b6455] cursor-not-allowed'
          }`}
        >
          {chance >= 1
            ? '渡劫概率已满'
            : `服用一颗 · ${BigNum.fromNumber(TRIBULATION_PILL_COST).formatChinese(0)} 往生点`}
        </button>
      </div>
    </div>
  );
};
