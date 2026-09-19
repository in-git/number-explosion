import React from 'react';

interface UpgradeButtonProps {
  /** 消耗文案（如「1 点」）或状态文案（如「已臻圆满」） */
  children: React.ReactNode;
  id?: string;
  /** 不可购买 / 不可升级 / 已满级 */
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  /** 色调：gold 金色（默认，升级/购买）；green 绿色（解锁） */
  tone?: 'gold' | 'green';
}

const BASE =
  'inline-flex items-center justify-end text-right min-w-[100px] px-2.5 py-1.5 rounded-none text-[11px] sm:text-xs font-serif font-bold tracking-wide whitespace-nowrap flex-shrink-0 bg-transparent border-0 transition-colors';
// 金黄色文本：可用态明亮金，禁用态暗金（仍可区分，但统一为金色调）
const ACTIVE =
  'text-[#e8c46a] underline decoration-1 underline-offset-4 cursor-pointer hover:text-[#f5dd9a]';
// 绿色文本：解锁类型的可用态
const ACTIVE_GREEN =
  'text-[#76d18c] underline decoration-1 underline-offset-4 cursor-pointer hover:text-[#a3e8b3]';
const DISABLED = 'text-[#5b5548] cursor-default';

/** 通用升级 / 购买按钮：无背景色、无前置图标*/
export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  children,
  id,
  disabled = false,
  onClick,
  ariaLabel,
  className = '',
  tone = 'gold',
}) => (
  <button
    type="button"
    id={id}
    disabled={disabled}
    onClick={onClick}
    aria-label={ariaLabel}
    className={`${BASE} ${
      disabled ? DISABLED : tone === 'green' ? ACTIVE_GREEN : ACTIVE
    } ${className}`}
  >
    {children}
  </button>
);
