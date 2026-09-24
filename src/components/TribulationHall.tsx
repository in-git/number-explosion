import React, { useEffect, useRef, useState } from 'react';
import { useGameActions, useGameData } from '../context/GameContext';
import {
  getResetPillDurationMs,
  getAutoRebirthPoints,
  getAutoRebirthIntervalMs,
  TRIBULATION_POINT_INTERVAL_MS,
  TRIBULATION_POINT_GAIN,
} from '../utils/gameMath';
import { UpgradeButton } from './UpgradeButton';

/** 毫秒 → 秒文案：整数不带小数，否则保留 1 位 */
const sec = (ms: number): string => {
  const s = ms / 1000;
  return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
};

/** 耗时文案：按量级自动取「天 / 小时 / 分钟 / 秒」，只保留最大的一级单位 */
const durText = (ms: number): string => {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec % 86400 === 0) return `${totalSec / 86400}天`;
  if (totalSec % 3600 === 0) return `${totalSec / 3600}小时`;
  if (totalSec % 60 === 0) return `${totalSec / 60}分钟`;
  return `${totalSec}秒`;
};

/** 剩余时间文案：只保留最大的两级单位 */
const remainText = (ms: number): string => {
  let rest = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(rest / 86400);
  rest -= d * 86400;
  const h = Math.floor(rest / 3600);
  rest -= h * 3600;
  const m = Math.floor(rest / 60);
  const s = rest - m * 60;
  if (d > 0) return `${d}天${h}小时`;
  if (h > 0) return `${h}小时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
};

/**
 * 周期产出卡：左侧名称、右侧剩余秒数，下方进度条与说明。
 * 进度以存档进度为基准按真实时间插值（存档每 1s 结算一次），避免跳动。
 */
const CycleCard: React.FC<{
  name: string;
  /** 主数字（大字展示，如持有量 / 本次所得） */
  value: string;
  /** 次要说明（一行短标签，如 +1/10s） */
  hint: string;
  intervalMs: number;
  progressMs: number;
}> = ({ name, value, hint, intervalMs, progressMs }) => {
  const [displayMs, setDisplayMs] = useState(Math.min(intervalMs, progressMs));
  const baseRef = useRef({ progress: Math.min(intervalMs, progressMs), at: performance.now() });
  const progressRef = useRef(progressMs);
  progressRef.current = progressMs;

  useEffect(() => {
    const p = Math.min(intervalMs, progressMs);
    baseRef.current = { progress: p, at: performance.now() };
    setDisplayMs(p);
  }, [progressMs, intervalMs]);

  useEffect(() => {
    const start = Math.min(intervalMs, progressRef.current);
    baseRef.current = { progress: start, at: performance.now() };
    setDisplayMs(start);
    let raf = 0;
    const tick = () => {
      const { progress: base, at } = baseRef.current;
      const next = Math.min(intervalMs, base + (performance.now() - at));
      // 量化到 100ms：否则每帧都 setState（60 次/秒），整页跟着重渲染
      const quantized = Math.min(intervalMs, Math.round(next / 100) * 100);
      setDisplayMs((prev) => (prev === quantized ? prev : quantized));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs]);

  const ratio = intervalMs > 0 ? Math.min(1, displayMs / intervalMs) : 0;
  const remainSec = Math.ceil(Math.max(0, intervalMs - displayMs) / 1000);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#383229] bg-[#1c1a17] px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="whitespace-nowrap font-serif text-xs font-bold text-[#ded7cb]">
          {name}
        </span>
        <span className="font-mono text-xs font-bold leading-none">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-[#2f2b25]">
        <div className="h-full rounded bg-[#e8c46a]" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-[#8a7a63]">
        <span>{hint}</span>
        <span>{remainSec}s</span>
      </div>
    </div>
  );
};

interface PillItemProps {
  /** 按钮 id */
  id: string;
  /** 丹种：数值重置丹（1 分钟）/ 永劫重置丹（3 分钟）/ 坍缩重置丹（20 分钟） */
  pill: 'value' | 'rebirth' | 'collapse';
  /** 丹名 */
  name: string;
  /** 存量 */
  pills: number;
  /** 已炼成的炉数（决定本炉耗时） */
  craftCount: number;
  /** 本炉已投入的时间（ms） */
  progressMs: number;
  /** 是否正在炼制 */
  crafting: boolean;
  onCraft: () => void;
}

/** 列表中的一炉丹：左侧名字与行内进度条，右侧一个按钮 */
const PillItem: React.FC<PillItemProps> = ({
  id,
  pill,
  name,
  pills,
  craftCount,
  progressMs,
  crafting,
  onCraft,
}) => {
  const duration = getResetPillDurationMs(pill);
  const progress = crafting ? Math.min(duration, progressMs) : 0;

  /** 进度条平滑：以存档进度为基准按真实时间插值（存档每 1s 结算一次） */
  const [displayMs, setDisplayMs] = useState(progress);
  const baseRef = useRef({ progress, at: performance.now() });
  // 供 rAF 读取最新存档进度（不进依赖，避免基准被反复重置）
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    baseRef.current = { progress, at: performance.now() };
    setDisplayMs(progress);
  }, [progress]);

  useEffect(() => {
    if (!crafting) return;
    // 开炉瞬间重置插值基准：否则会沿用陈旧时间戳，进度条会瞬间跳满再回落（闪烁）
    const start = progressRef.current;
    baseRef.current = { progress: start, at: performance.now() };
    setDisplayMs(start);
    let raf = 0;
    const tick = () => {
      const { progress: base, at } = baseRef.current;
      const next = Math.min(duration, base + (performance.now() - at));
      // 量化到 100ms：避免每帧 setState 拖慢整页
      const quantized = Math.min(duration, Math.round(next / 100) * 100);
      setDisplayMs((prev) => (prev === quantized ? prev : quantized));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [crafting, duration]);

  const ratio = duration > 0 ? Math.min(1, displayMs / duration) : 0;
  const remain = remainText(Math.max(0, duration - displayMs));

  // 常态统一灰调；炼制中整体转黄（丹名 / 进度条 / 信息 / 按钮）
  const nameColor = crafting ? 'text-[#e8c46a]' : 'text-[#ded7cb]';
  const barColor = crafting ? 'bg-[#e8c46a]' : 'bg-[#8f8574]';
  const infoColor = crafting ? 'text-[#e8b56f]' : 'text-[#8a7a63]';

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 transition-colors ${
        crafting ? 'border-[#4a3f2c] bg-[#211f1c]' : 'border-[#383229] bg-[#1c1a17]'
      }`}
    >
      {/* 上方：丹名 + 炼制按钮 */}
      <div className="flex items-center gap-2">
        <span className={`whitespace-nowrap font-serif text-xs font-bold ${nameColor}`}>
          {name}
        </span>
        <div className="flex-1" />
        {crafting ? (
          <UpgradeButton disabled tone="gold" className="min-w-0! text-[#e8c46a]!">
            炼制中
          </UpgradeButton>
        ) : (
          <UpgradeButton id={id} onClick={onCraft} tone="gray" ariaLabel="炼制" className="min-w-0!">
            炼 制
          </UpgradeButton>
        )}
      </div>

      {/* 进度条 */}
      <div className="h-1.5 w-full overflow-hidden rounded bg-[#2f2b25]">
        <div className={`h-full rounded ${barColor}`} style={{ width: `${ratio * 100}%` }} />
      </div>

      {/* 炼制信息：置于卡片最下方 */}
      <div className={`font-mono text-[10px] ${infoColor}`}>
        {pills} 颗 · 第 {craftCount + 1} 炉 {durText(duration)}
        {crafting ? ` · 剩余 ${remain}` : ''}
      </div>
    </div>
  );
};

/**
 * 渡劫殿：渡劫成功（飞升成仙）后开启。
 * 炼制重置丹（数值重置丹 / 永劫重置丹 / 坍缩重置丹）：点击「炼制」即开炉，炼制中不可操作；
 * 耗时恒定不累加：数值重置丹每炉 1 分钟，永劫重置丹每炉 3 分钟，坍缩重置丹每炉 20 分钟。
 */
export const TribulationHall: React.FC = () => {
  const { state, currentBigNum: currentValue } = useGameData();
  const {
    handleCraftValueResetPill: onCraftValue,
    handleCraftRebirthResetPill: onCraftRebirth,
    handleCraftCollapseResetPill: onCraftCollapse,
  } = useGameActions();

  // 渡劫点：每 10s 产出 15 点；自动永劫结算周期：30s 起，每产出一次 +5s，180s 封顶
  const tribulationPoints = Math.max(0, state.tribulationPoints || 0);
  const nextRebirthPoints = getAutoRebirthPoints(currentValue, state);
  const autoRebirthIntervalMs = getAutoRebirthIntervalMs(state.autoRebirthCount || 0);

  return (
    <div className="flex flex-col gap-2">
      <CycleCard
        name="渡 劫 点"
        value={`${tribulationPoints}`}
        hint={`+${TRIBULATION_POINT_GAIN} / ${sec(TRIBULATION_POINT_INTERVAL_MS)}`}
        intervalMs={TRIBULATION_POINT_INTERVAL_MS}
        progressMs={Math.max(0, state.tribulationPointProgressMs || 0)}
      />
      <CycleCard
        name="永 劫 点"
        value={`+${nextRebirthPoints}`}
        hint={`周期 ${sec(autoRebirthIntervalMs)}`}
        intervalMs={autoRebirthIntervalMs}
        progressMs={Math.max(0, state.autoRebirthProgressMs || 0)}
      />

      <PillItem
        id="btn-craft-value-reset"
        pill="value"
        name="数 值 重 置 丹"
        pills={Math.max(0, state.valueResetPills || 0)}
        craftCount={Math.max(0, state.valueResetCraftCount || 0)}
        progressMs={Math.max(0, state.valueResetProgressMs || 0)}
        crafting={!!state.valueResetCrafting}
        onCraft={onCraftValue}
      />
      <PillItem
        id="btn-craft-rebirth-reset"
        pill="rebirth"
        name="永 劫 重 置 丹"
        pills={Math.max(0, state.rebirthResetPills || 0)}
        craftCount={Math.max(0, state.rebirthResetCraftCount || 0)}
        progressMs={Math.max(0, state.rebirthResetProgressMs || 0)}
        crafting={!!state.rebirthResetCrafting}
        onCraft={onCraftRebirth}
      />
      <PillItem
        id="btn-craft-collapse-reset"
        pill="collapse"
        name="坍 缩 重 置 丹"
        pills={Math.max(0, state.collapseResetPills || 0)}
        craftCount={Math.max(0, state.collapseResetCraftCount || 0)}
        progressMs={Math.max(0, state.collapseResetProgressMs || 0)}
        crafting={!!state.collapseResetCrafting}
        onCraft={onCraftCollapse}
      />
    </div>
  );
};
