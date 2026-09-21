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

/* ------------------------------------------------------------------ *
 * 共用件
 * ------------------------------------------------------------------ */

/** 圆形渡劫钮（仅「开始」阶段使用） */
const TribulationButton: React.FC<{ canTribulate: boolean; onStart: () => void }> = ({
  canTribulate,
  onStart,
}) => (
  <button
    id="btn-tribulation-attempt"
    onClick={onStart}
    disabled={!canTribulate}
    className={`flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 font-serif font-bold text-xl tracking-[0.2em] transition-all ${
      canTribulate
        ? 'cursor-pointer active:translate-y-0.5 border-[#8a653f] bg-gradient-to-b from-[#3a2418] to-[#1d1410] text-[#f5e6c8] animate-[tribulationPulse_2.2s_ease-in-out_infinite]'
        : 'cursor-not-allowed border-[#3a332c] bg-[#1a1715] text-[#6b6455]'
    }`}
  >
    渡劫
  </button>
);

/* ------------------------------------------------------------------ *
 * 一 · 开始：渡劫前的决策界面（警告 / 渡劫钮 / 概率 / 渡劫丹商店）
 * ------------------------------------------------------------------ */

interface ReadyModuleProps {
  canTribulate: boolean;
  canBuyPill: boolean;
  pills: number;
  afterlifePoints: number;
  /** 本道雷劫通过率（按当前持有渡劫丹预估） */
  strikeChance: number;
  /** 9 道全过的整体通过率 */
  successChance: number;
  onStart: () => void;
  onBuyPill: () => void;
}

const ReadyModule: React.FC<ReadyModuleProps> = ({
  canTribulate,
  canBuyPill,
  pills,
  afterlifePoints,
  strikeChance,
  successChance,
  onStart,
  onBuyPill,
}) => (
  <div className="w-full flex flex-col items-center gap-4">
    <div className="w-full text-center text-[11px] font-serif leading-relaxed text-[#c99a9a]">
      败则归零：数值 · 修为 · 点数尽失
    </div>

    <TribulationButton canTribulate={canTribulate} onStart={onStart} />

    {/* 决策信息：概率 / 渡劫丹 / 往生点 */}
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-serif text-[#948a7a]">
      <span>
        本道概率 <span className="font-mono font-bold text-[#76d18c]">{pct(strikeChance)}</span>
      </span>
      <span>
        全程通过率{' '}
        <span className="font-mono font-bold text-[#e8b56f]">{pct(successChance)}</span>
      </span>
      <span>
        渡劫丹 <span className="font-mono font-bold text-[#d897fa]">{pills} 颗</span>
      </span>
      <span>
        往生点 <span className="font-mono font-bold text-[#d897fa]">{afterlifePoints}</span>
      </span>
    </div>

    {/* 渡劫丹小商店 */}
    <div className="w-full rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif font-bold text-xs sm:text-sm text-[#ded7cb]">渡劫丹</span>
        <span className="text-[10px] font-mono text-[#8a7a63] flex-shrink-0">持有 {pills} 颗</span>
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
  </div>
);

/* ------------------------------------------------------------------ *
 * 二 · 渡劫中：只显示九道雷劫从天而降的过程
 * ------------------------------------------------------------------ */

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

interface RunningModuleProps {
  /** 已揭晓的逐道结果 */
  revealed: boolean[];
  /** 需要渲染的行数（已降下的 + 正在降下的那一道） */
  strikeRowCount: number;
  /** 本次渡劫开始时的丹药存量：前 stock 道各消耗 1 颗 */
  startPills: number;
}

const RunningModule: React.FC<RunningModuleProps> = ({
  revealed,
  strikeRowCount,
  startPills,
}) => (
  <div className="w-full rounded-lg border border-[#3b3429] bg-[#1c1916] px-3 py-2.5">
    <div className="text-[10px] font-serif text-[#8a7a63] mb-2">{TRIBULATION_STRIKE_COUNT} 道雷劫</div>

    {/* 雷劫列表：一道一行，自上而下一道道降下；未降下的不占位 */}
    <div className="flex flex-col gap-1">
      {Array.from({ length: strikeRowCount }).map((_, i) => {
        const done = i < revealed.length;
        const passed = done ? revealed[i] : false;
        // 本道消耗了 1 颗渡劫丹（紫色描边）：与「本道必过」一致
        const withPill = i < startPills;
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

    <div className="mt-2 text-center text-[11px] font-serif text-[#c9a86a]">
      第 {revealed.length} / {TRIBULATION_STRIKE_COUNT} 道 …
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * 三 · 渡劫后：只显示渡劫效果（成功保留属性 / 失败一切归零）
 * ------------------------------------------------------------------ */

interface ResultModuleProps {
  outcome: TribulationOutcome;
  /** 渡劫次数（成败均计），成功时即收益的次方指数 */
  tribulationCount: number;
}

const ResultModule: React.FC<ResultModuleProps> = ({ outcome, tribulationCount }) => {
  /** 本次渡劫的效果明细 */
  const rows: { label: string; value: string; valueClass: string }[] = [
    {
      label: '雷劫',
      value: `${outcome.strikes.length} / ${TRIBULATION_STRIKE_COUNT} 道`,
      valueClass: 'font-mono text-[#cbbfa9]',
    },
    {
      label: '属性',
      value: outcome.success ? '尽数保留' : '尽归初始',
      valueClass: outcome.success ? 'text-[#9fdc7a]' : 'text-[#f07979]',
    },
    {
      label: outcome.success ? '收益次方' : '历世之迹',
      value: outcome.success
        ? `原值^${tribulationCount}`
        : `渡劫 ${tribulationCount}/${TRIBULATION_MAX_COUNT} 次`,
      valueClass: outcome.success ? 'font-mono text-[#e8b56f]' : 'text-[#d897fa]',
    },
  ];

  return (
    <div className="w-full rounded-lg border border-[#3b3429] bg-[#1c1916] px-3 py-4">
      <div
        className={`text-center font-serif font-bold text-lg sm:text-xl tracking-[0.24em] ${
          outcome.success ? 'text-[#9fdc7a]' : 'text-[#f07979]'
        }`}
      >
        {outcome.success ? '飞 升 成 仙' : '一 切 散 尽'}
      </div>

      <div className="mt-3 flex flex-col gap-1 text-[11px] font-serif">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="text-[#8a7a63]">{row.label}</span>
            <span className={row.valueClass}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 天雷峰·渡劫：按「开始 → 渡劫中 → 渡劫后」三阶段切换，三块 UI 互不干扰
 * ------------------------------------------------------------------ */

/** 渡劫三阶段：ready 开始 / running 渡劫中 / result 渡劫后 */
type TribulationView =
  | { kind: 'ready' }
  | { kind: 'running' }
  | { kind: 'result'; outcome: TribulationOutcome };

export const TribulationModal: React.FC = () => {
  const { state } = useGameData();
  // 点击「渡劫」的瞬间即结算，避免中途关闭逃避失败
  const { handleTribulation: onTribulate, handleBuyTribulationPill: onBuyPill } = useGameActions();

  const pills = state.tribulationPills || 0;
  // 渡劫次数（成败均计）即收益的次方指数
  const tribulationCount = state.tribulationCount || 0;
  const canTribulate =
    tribulationCount < TRIBULATION_MAX_COUNT && state.afterlifePoints >= TRIBULATION_COST;
  const canBuyPill = state.afterlifePoints >= TRIBULATION_PILL_COST;

  // 渡劫过程：revealed 为已揭晓的逐道结果
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [outcome, setOutcome] = useState<TribulationOutcome | null>(null);
  /** 本次渡劫开始时的丹药存量快照：点击瞬间 state 已被扣减，过程需按快照展示本道是否耗丹 */
  const [startPills, setStartPills] = useState(0);
  const timerRef = useRef<number | null>(null);

  const finished = outcome !== null && revealed.length >= outcome.strikes.length;

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

  /** 三阶段互斥：未渡 → ready；逐道降下 → running；出结果 → result */
  const view: TribulationView =
    outcome === null
      ? { kind: 'ready' }
      : finished
        ? { kind: 'result', outcome }
        : { kind: 'running' };

  /**
   * 雷劫列表行数：只渲染已降下的雷劫；正在降下的那一道也占一行（显示进度条）。
   * 上限即本次实际降下的道数，避免结尾多出一行空转。
   */
  const strikeRowCount = Math.min(
    revealed.length + (running ? 1 : 0),
    outcome?.strikes.length ?? revealed.length
  );

  /**
   * 「开始」阶段的两个概率：每道雷劫消耗 1 颗渡劫丹，
   * 故概率按当前持有丹数预估——前 s 道必过，其余每道 50%。
   */
  const strikeChance = getTribulationStrikeChance(pills > 0);
  const successChance = getTribulationSuccessChance(pills);

  return (
    <div className="flex flex-col items-center gap-4 pb-2">
      {/* 天雷峰：三阶段共用的标题 */}
      <div className="w-full text-center pt-1">
        <div
          className="font-serif font-bold text-3xl sm:text-4xl tracking-[0.28em] text-[#f2ded0]"
          style={{ textShadow: '0 2px 14px rgba(240,121,121,0.55), 0 2px 6px rgba(0,0,0,0.95)' }}
        >
          天 雷 峰
        </div>
      </div>

      {view.kind === 'ready' && (
        <ReadyModule
          canTribulate={canTribulate}
          canBuyPill={canBuyPill}
          pills={pills}
          afterlifePoints={state.afterlifePoints}
          strikeChance={strikeChance}
          successChance={successChance}
          onStart={startTribulation}
          onBuyPill={onBuyPill}
        />
      )}

      {view.kind === 'running' && (
        <RunningModule
          revealed={revealed}
          strikeRowCount={strikeRowCount}
          startPills={startPills}
        />
      )}

      {view.kind === 'result' && (
        <ResultModule outcome={view.outcome} tribulationCount={tribulationCount} />
      )}
    </div>
  );
};
