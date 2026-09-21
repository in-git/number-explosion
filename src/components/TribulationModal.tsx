import React, { useEffect, useRef, useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { useGameActions, useGameData } from '../context/GameContext';
import {
  TRIBULATION_COST,
  TRIBULATION_MAX_COUNT,
  TRIBULATION_PILL_COST,
  TRIBULATION_STRIKE_CHANCE,
  TRIBULATION_STRIKE_COUNT,
  TRIBULATION_STRIKE_INTERVAL_MS,
  TribulationOutcome,
  getTribulationStrikeChance,
  resolveTribulation,
} from '../utils/gameMath';

/** 百分比文案 */
const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** 天雷峰·渡劫：大标题 + 警告 + 圆形渡劫钮 + 九道雷劫过程 + 渡劫丹小商店 */
export const TribulationModal: React.FC = () => {
  const { state } = useGameData();
  // 点击「渡劫」的瞬间即结算，避免中途关闭逃避失败
  const { handleTribulation: onTribulate, handleBuyTribulationPill: onBuyPill } = useGameActions();

  const pills = state.tribulationPills || 0;
  // 渡劫次数（= 成功次数）即收益的次方指数
  const tribulationCount = state.tribulationCount || 0;
  const countExhausted = tribulationCount >= TRIBULATION_MAX_COUNT;

  // 当前渡劫概率：持丹的雷劫必定通过，否则 50%
  const hasPill = pills > 0;
  const strikeChance = getTribulationStrikeChance(hasPill);
  const canTribulate = !countExhausted && state.afterlifePoints >= TRIBULATION_COST;
  const canBuyPill = state.afterlifePoints >= TRIBULATION_PILL_COST;

  // 渡劫过程：strikeResults 为已揭晓的逐道结果
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [outcome, setOutcome] = useState<TribulationOutcome | null>(null);
  const timerRef = useRef<number | null>(null);

  // 每 3 秒降下一道雷劫；全部揭晓后结束
  useEffect(() => {
    if (!running || !outcome) return;
    if (revealed.length >= outcome.strikes.length) {
      setRunning(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setRevealed((prev) => [...prev, outcome.strikes[prev.length]]);
    }, TRIBULATION_STRIKE_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [running, outcome, revealed]);

  /** 点击渡劫：先结算（立刻扣费/判定），再按 3 秒一道展示过程 */
  const startTribulation = () => {
    if (!canTribulate || running) return;
    const result = resolveTribulation(pills);
    onTribulate(result);
    setOutcome(result);
    setRevealed([]);
    setRunning(true);
  };

  const finished = outcome !== null && revealed.length >= outcome.strikes.length;

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
        onClick={startTribulation}
        disabled={!canTribulate || running}
        className={`flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 font-serif font-bold text-xl tracking-[0.2em] transition-all ${
          canTribulate && !running
            ? 'cursor-pointer active:translate-y-0.5 border-[#8a653f] bg-gradient-to-b from-[#3a2418] to-[#1d1410] text-[#f5e6c8] animate-[tribulationPulse_2.2s_ease-in-out_infinite]'
            : 'cursor-not-allowed border-[#3a332c] bg-[#1a1715] text-[#6b6455]'
        }`}
      >
        {running ? '渡劫中' : '渡劫'}
      </button>

      {/* 九道雷劫过程 */}
      {outcome && (
        <div className="w-full rounded-lg border border-[#3b3429] bg-[#1c1916] px-3 py-2.5">
          <div className="text-[10px] font-serif text-[#8a7a63] mb-2">
            九道雷劫 · 每道 {TRIBULATION_STRIKE_INTERVAL_MS / 1000} 秒
          </div>
          <div className="flex items-center justify-between gap-1">
            {Array.from({ length: TRIBULATION_STRIKE_COUNT }).map((_, i) => {
              const done = i < revealed.length;
              const passed = done ? revealed[i] : false;
              return (
                <span
                  key={i}
                  className={`flex h-6 flex-1 items-center justify-center rounded border font-mono text-[11px] font-bold ${
                    !done
                      ? 'border-[#332e27] bg-[#232019] text-[#5f5749]'
                      : passed
                        ? 'border-[#3f5a2f] bg-[#22301a] text-[#9fdc7a]'
                        : 'border-[#7a3a3a] bg-[#2c1a1a] text-[#f07979]'
                  }`}
                >
                  {done ? (passed ? '✓' : '✕') : i + 1}
                </span>
              );
            })}
          </div>
          <div
            className={`mt-2 text-center text-[11px] font-serif ${
              finished
                ? outcome.success
                  ? 'text-[#9fdc7a]'
                  : 'text-[#f07979]'
                : 'text-[#c9a86a]'
            }`}
          >
            {!finished
              ? `第 ${revealed.length} / ${TRIBULATION_STRIKE_COUNT} 道 …`
              : outcome.success
                ? `飞升成仙 · 渡劫 ${outcome.strikes.length}/${TRIBULATION_STRIKE_COUNT} 道全过`
                : `第 ${outcome.strikes.length} 道雷劫未能扛住 · 一切散尽`}
          </div>
        </div>
      )}

      {/* 当前状态 */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-serif text-[#948a7a]">
        <span>
          渡劫次数{' '}
          <span className="font-mono font-bold text-[#c9a86a]">
            {tribulationCount}/{TRIBULATION_MAX_COUNT}
          </span>
        </span>
        <span>
          渡劫概率 <span className="font-mono font-bold text-[#76d18c]">{pct(strikeChance)}</span>
        </span>
        <span>
          渡劫丹 <span className="font-mono font-bold text-[#d897fa]">{pills} 颗</span>
        </span>
        <span>
          往生点 <span className="font-mono font-bold text-[#d897fa]">{state.afterlifePoints}</span>
        </span>
      </div>

      {/* 渡劫状态说明 */}
      <div
        className={`w-full text-center text-[10px] font-serif ${
          tribulationCount > 0 ? 'text-[#76d18c]' : 'text-[#8a7a63]'
        }`}
      >
        {countExhausted
          ? `渡劫次数已满（${TRIBULATION_MAX_COUNT}/${TRIBULATION_MAX_COUNT}）· 单次收益取原值的 ${tribulationCount} 次方`
          : tribulationCount > 0
            ? `已渡劫成功 ${tribulationCount} 次 · 单次收益取原值的 ${tribulationCount} 次方`
            : `尚未渡劫成功 · 每道雷劫 ${pct(TRIBULATION_STRIKE_CHANCE)}，持丹则必过`}
      </div>

      {/* 渡劫丹小商店 */}
      <div className="w-full rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">渡劫丹</span>
          <span className="text-[10px] font-mono text-[#8a7a63] flex-shrink-0">
            持有 {pills} 颗
          </span>
        </div>
        <div className="text-[10px] font-serif text-[#998e7e] mt-0.5">
          每道雷劫消耗 1 颗即可必定通过 · 无丹时该道仅 {pct(TRIBULATION_STRIKE_CHANCE)}
        </div>
        <button
          id="btn-tribulation-pill"
          onClick={() => {
            if (canBuyPill && !running) onBuyPill();
          }}
          disabled={!canBuyPill || running}
          className={`mt-2 w-full py-2 rounded-lg border text-xs font-serif transition-colors ${
            canBuyPill && !running
              ? 'bg-[#241f1a] border-[#4a3a24] text-[#e8cf9a] hover:border-[#8a653f] cursor-pointer active:translate-y-0.5'
              : 'bg-[#1a1715] border-[#2b2721] text-[#6b6455] cursor-not-allowed'
          }`}
        >
          购买一颗 · {BigNum.fromNumber(TRIBULATION_PILL_COST).formatChinese(0)} 往生点
        </button>
      </div>
    </div>
  );
};
