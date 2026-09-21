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
  getTribulationSuccessChance,
  resolveTribulation,
} from '../utils/gameMath';

/** 百分比文案：≥10% 取整，≥1% 保留 1 位，再小保留 2 位（小概率不被四舍五入成 0%） */
const pct = (ratio: number): string => {
  const v = ratio * 100;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${v.toFixed(1)}%`;
  return `${v.toFixed(2)}%`;
};

/** 每道雷劫的行样式：待降 / 已过 / 未过；本道消耗了渡劫丹的以紫色描边标记 */
const strikeRowClass = (done: boolean, passed: boolean, withPill: boolean): string => {
  if (!done) {
    // 待降：无丹为灰，有丹为紫（本道必过）
    return withPill
      ? 'border-[#7b52a8] bg-[#241a2e] text-[#8a7ab0]'
      : 'border-[#332e27] bg-[#232019] text-[#5f5749]';
  }
  const tone = passed ? 'bg-[#22301a] text-[#9fdc7a]' : 'bg-[#2c1a1a] text-[#f07979]';
  const border = withPill ? 'border-[#7b52a8]' : passed ? 'border-[#3f5a2f]' : 'border-[#7a3a3a]';
  return `${tone} ${border}`;
};

/** 天雷峰·渡劫：大标题 + 警告 + 圆形渡劫钮 + 九道雷劫过程 + 渡劫丹小商店 */
export const TribulationModal: React.FC = () => {
  const { state } = useGameData();
  // 点击「渡劫」的瞬间即结算，避免中途关闭逃避失败
  const { handleTribulation: onTribulate, handleBuyTribulationPill: onBuyPill } = useGameActions();

  const pills = state.tribulationPills || 0;
  // 渡劫次数（= 成功次数）即收益的次方指数
  const tribulationCount = state.tribulationCount || 0;
  const countExhausted = tribulationCount >= TRIBULATION_MAX_COUNT;

  const canTribulate = !countExhausted && state.afterlifePoints >= TRIBULATION_COST;
  const canBuyPill = state.afterlifePoints >= TRIBULATION_PILL_COST;

  // 渡劫过程：strikeResults 为已揭晓的逐道结果
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [outcome, setOutcome] = useState<TribulationOutcome | null>(null);
  /** 本次渡劫开始时的丹药存量快照：点击瞬间 state 已被扣减，过程展示需按快照逐道递减 */
  const [startPills, setStartPills] = useState(0);
  const timerRef = useRef<number | null>(null);

  /** 第 i 道雷劫是否消耗了 1 颗渡劫丹（前 stock 道各消耗 1 颗，与 resolveTribulation 一致） */
  const strikeUsesPill = (i: number) => i < startPills;

  /** 已揭晓的道数 → 本次已消耗 / 本次剩余渡劫丹 */
  const pillsUsedInRun = Math.min(revealed.length, startPills);
  const pillsLeftInRun = Math.max(0, startPills - pillsUsedInRun);

  /**
   * 本道雷劫的通过率：每道雷劫消耗 1 颗渡劫丹，故概率须按「本道是否还有丹可用」逐道重新计算，
   * 而不是全程取一个固定值（只有 1 颗丹时，仅第 1 道必过，其余 8 道仍是 50%）。
   * - 渡劫进行中：按本次剩余丹数算
   * - 尚未开始：按当前持有丹数预估
   */
  const strikeChance = getTribulationStrikeChance(running ? pillsLeftInRun > 0 : pills > 0);

  /** 本次渡劫可用的渡劫丹总数（过程内取开始时的快照，否则取当前持有） */
  const stockForRun = running ? startPills : pills;

  /**
   * 全程通过率 = 9 道雷劫全部通过的概率（这才是"真正通过的概率"）。
   * 前 s 道由渡劫丹保过，剩余 9 − s 道须各自赌一次，故 = 0.5^(9 − s)。
   * 例：3 颗丹 → 后 6 道各 50% → 0.5^6 ≈ 1.6%
   */
  const successChance = getTribulationSuccessChance(stockForRun);

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
    setStartPills(pills);
    onTribulate(result);
    setOutcome(result);
    setRevealed([]);
    setRunning(true);
  };

  const finished = outcome !== null && revealed.length >= outcome.strikes.length;
  /**
   * 雷劫列表行数：只渲染已降下的雷劫；正在降下的那一道也占一行（显示进度条）。
   * 上限即本次实际降下的道数，避免结尾多出一行空转。
   */
  const strikeRowCount = Math.min(
    revealed.length + (running ? 1 : 0),
    outcome?.strikes.length ?? revealed.length
  );
  /** 本次渡劫消耗 / 剩余的渡劫丹（过程内按已揭晓道数实时递减，结束后取最终值） */
  const pillsUsed = running ? pillsUsedInRun : outcome?.pillsUsed ?? 0;
  const pillsLeft = running ? pillsLeftInRun : pills;

  /**
   * 只在「渡劫前」显示的决策信息：概率 / 渡劫丹 / 状态说明 / 渡劫丹商店。
   * 一旦开始渡劫，过程中与结束后都不显示，屏上只留雷劫过程与结果。
   */
  const showPrepInfo = outcome === null;

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
          败则尽失：永劫点 · 坍缩点 · 往生点
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
            {TRIBULATION_STRIKE_COUNT} 道雷劫
          </div>
          {/* 雷劫列表：一道一行，自上而下一道道降下；未降下的不占位 */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: strikeRowCount }).map((_, i) => {
              const done = i < revealed.length;
              const passed = done ? revealed[i] : false;
              // 本道消耗了 1 颗渡劫丹（紫色描边）：与「本道必过」一致
              const withPill = strikeUsesPill(i);
              return (
                <div
                  key={i}
                  title={withPill ? '耗丹 1 · 必过' : `无丹 · ${pct(TRIBULATION_STRIKE_CHANCE)}`}
                  className={`flex h-6 items-center gap-2 rounded border px-2 ${strikeRowClass(
                    done,
                    passed,
                    withPill
                  )}`}
                >
                  <span className="whitespace-nowrap font-serif text-[11px] font-bold">
                    第 {i + 1} 道
                  </span>
                  {withPill && (
                    <span className="whitespace-nowrap rounded bg-[#2b1f38] px-1 text-[9px] font-serif font-normal text-[#c39bf0]">
                      耗丹 1
                    </span>
                  )}
                  {done ? (
                    <span className="ml-auto w-4 text-right font-mono text-[11px] font-bold">
                      {passed ? '✓' : '✕'}
                    </span>
                  ) : (
                    /* 正在降下的这一道：按揭晓间隔走满的计时进度条 */
                    <span className="relative ml-auto h-1.5 min-w-0 flex-1 overflow-hidden rounded bg-[#3a332c]">
                      <span
                        className={`absolute inset-y-0 left-0 w-full origin-left ${
                          withPill ? 'bg-[#a06fd8]' : 'bg-[#c9a86a]'
                        }`}
                        style={{
                          animation: `strikeProgress ${TRIBULATION_STRIKE_INTERVAL_MS}ms linear forwards`,
                        }}
                      />
                    </span>
                  )}
                </div>
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
                ? `飞升成仙 · ${outcome.strikes.length}/${TRIBULATION_STRIKE_COUNT} 道全过`
                : `第 ${outcome.strikes.length} 道未扛住 · 一切散尽`}
          </div>
          {/* 渡劫丹消耗明细：每道雷劫消耗 1 颗，逐道递减 */}
          <div className="mt-1.5 text-center text-[10px] font-serif text-[#8a7a63]">
            本次耗丹 <span className="font-mono font-bold text-[#d897fa]">{pillsUsed}</span> · 余{' '}
            <span className="font-mono font-bold text-[#d897fa]">{pillsLeft}</span> 颗
          </div>
        </div>
      )}

      {/* 当前状态 */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-serif text-[#948a7a]">
        {/* 概率与渡劫丹：仅渡劫前显示 */}
        {showPrepInfo && (
          <>
            <span>
              本道概率{' '}
              <span className="font-mono font-bold text-[#76d18c]">{pct(strikeChance)}</span>
            </span>
            <span>
              全程通过率{' '}
              <span className="font-mono font-bold text-[#e8b56f]">{pct(successChance)}</span>
            </span>
            <span>
              渡劫丹 <span className="font-mono font-bold text-[#d897fa]">{pills} 颗</span>
            </span>
          </>
        )}
        <span>
          往生点{' '}
          <span className="font-mono font-bold text-[#d897fa]">{state.afterlifePoints}</span>
        </span>
      </div>

      {/* 渡劫状态说明 + 渡劫丹小商店：仅渡劫前显示 */}
      {showPrepInfo && (
        <>
          {/* 渡劫状态说明 */}
          <div
            className={`w-full text-center text-[10px] font-serif ${
              tribulationCount > 0 ? 'text-[#76d18c]' : 'text-[#8a7a63]'
            }`}
          >
            {countExhausted
              ? `渡劫已满 ${TRIBULATION_MAX_COUNT}/${TRIBULATION_MAX_COUNT} · 收益 = 原值^${tribulationCount}`
              : tribulationCount > 0
                ? `已渡劫 ${tribulationCount} 次 · 收益 = 原值^${tribulationCount}`
                : `${TRIBULATION_STRIKE_COUNT} 道全过方成 · 每道耗丹 1 必过，无丹 ${pct(TRIBULATION_STRIKE_CHANCE)}`}
          </div>

          {/* 渡劫丹小商店 */}
          <div className="w-full rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">
                渡劫丹
              </span>
              <span className="text-[10px] font-mono text-[#8a7a63] flex-shrink-0">
                持有 {pills} 颗
              </span>
            </div>
            <div className="text-[10px] font-serif text-[#998e7e] mt-0.5">
              1 颗 = 1 道必过 · 满 {TRIBULATION_STRIKE_COUNT} 颗必成
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
              购买一颗 · {BigNum.fromNumber(TRIBULATION_PILL_COST).formatChinese(0)} 往生点
            </button>
          </div>
        </>
      )}
    </div>
  );
};
