import React from 'react';

/** 长按首次连发延迟（ms） */
const PRESS_DELAY_MS = 400;
/** 长按连发间隔（ms） */
const PRESS_INTERVAL_MS = 110;

interface UpgradeButtonProps {
  children: React.ReactNode;
  id?: string;
  /** 不可购买 / 不可升级 / 已满级 */
  disabled?: boolean;
  /** 单击回调（一次性购买，如永劫殿/解锁） */
  onClick?: () => void;
  /**
   * 按压回调（可重复购买，如数值殿/永劫殿升级）：按下立即触发一次，长按可持续连发，
   * 与 onClick 互斥——传入 onPress 时忽略 onClick
   */
  onPress?: () => void;
  ariaLabel?: string;
  className?: string;
  /** 色调：gold 金色（默认，升级/购买）；green 绿色（解锁）；gray 灰色（常态操作） */
  tone?: 'gold' | 'green' | 'gray';
}

const BASE =
  'inline-flex items-center justify-end text-right min-w-[100px] px-2.5 py-1.5 rounded-none text-[11px] sm:text-xs font-serif font-bold tracking-wide whitespace-nowrap flex-shrink-0 bg-transparent border-0 transition-colors';
// 金黄色文本：可用态明亮金，禁用态暗金（仍可区分，但统一为金色调）
const ACTIVE =
  'text-[#e8c46a] underline decoration-1 underline-offset-4 cursor-pointer hover:text-[#f5dd9a]';
// 绿色文本：解锁类型的可用态
const ACTIVE_GREEN =
  'text-[#76d18c] underline decoration-1 underline-offset-4 cursor-pointer hover:text-[#a3e8b3]';
// 灰色文本：常态操作的可用态
const ACTIVE_GRAY =
  'text-[#9a9286] underline decoration-1 underline-offset-4 cursor-pointer hover:text-[#c9c0b0]';
const DISABLED = 'text-[#5b5548] underline decoration-1 underline-offset-4 cursor-default';

/** 通用升级 / 购买按钮：无背景色、无前置图标；支持单击与长按连发两种模式 */
export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  children,
  id,
  disabled = false,
  onClick,
  onPress,
  ariaLabel,
  className = '',
  tone = 'gold',
}) => {
  // 长按连发模式（onPress）：始终持有最新回调，保证连发时使用最新消耗
  const pressRef = React.useRef(onPress);
  pressRef.current = onPress;
  const delayRef = React.useRef<number | null>(null);
  const repeatRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (delayRef.current !== null) window.clearTimeout(delayRef.current);
    if (repeatRef.current !== null) window.clearInterval(repeatRef.current);
    delayRef.current = null;
    repeatRef.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  const toneClass = disabled
    ? DISABLED
    : tone === 'green'
      ? ACTIVE_GREEN
      : tone === 'gray'
        ? ACTIVE_GRAY
        : ACTIVE;

  const start = () => {
    if (disabled) return;
    pressRef.current?.();
    delayRef.current = window.setTimeout(() => {
      repeatRef.current = window.setInterval(() => {
        if (!pressRef.current) return;
        pressRef.current();
      }, PRESS_INTERVAL_MS);
    }, PRESS_DELAY_MS);
  };

  if (onPress) {
    return (
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        // 移动端长按弹出菜单 / 文本选择会中断连发，予以阻止
        onContextMenu={(e) => e.preventDefault()}
        className={`${BASE} select-none touch-none ${toneClass} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${BASE} ${toneClass} ${className}`}
    >
      {children}
    </button>
  );
};
