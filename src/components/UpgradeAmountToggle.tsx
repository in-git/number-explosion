import React from 'react';
import type { UpgradeAmountMode } from '../utils/gameMath';

/** 模式 → 按钮文案 */
const LABEL: Record<UpgradeAmountMode, string> = {
  '1': '1',
  half: '一半',
  max: 'max',
};

/** 模式 → 悬浮说明 */
const HINT: Record<UpgradeAmountMode, string> = {
  '1': '升级量 1：每次购买 1 次',
  half: '升级量 一半：每次购买「买不动」的一半',
  max: '升级量 max：每次直接买到买不动',
};

interface UpgradeAmountToggleProps {
  id: string;
  mode: UpgradeAmountMode;
  onToggle: () => void;
  /** 各殿按钮尺寸略有差异，在此覆盖（如 "px-2 py-0.5 text-[10px]"） */
  className?: string;
}

/**
 * 「一键升级 / 一键购买」升级量开关：1 → 一半 → max 循环，全局共用。
 * 任意一殿切换后，所有殿的购买按钮「次数」一并联动；下方按钮按当前模式结算。
 * 自带 ml-auto，始终贴在所在行的最右侧。
 */
export const UpgradeAmountToggle: React.FC<UpgradeAmountToggleProps> = ({
  id,
  mode,
  onToggle,
  className = '',
}) => (
  <button
    id={id}
    onClick={onToggle}
    aria-pressed={mode !== '1'}
    title={`${HINT[mode]} · 点击切换`}
    className={`ml-auto flex-shrink-0 cursor-pointer rounded border font-serif transition-colors ${className} ${
      mode === '1'
        ? 'text-[#e8c46a] border-[#4a3f2c] bg-[#2a2620] hover:border-[#6b5e4c] hover:text-[#f5dd9a]'
        : 'text-[#ffd98a] border-[#8a653f] bg-[#3b3327] hover:text-[#ffe9b0]'
    }`}
  >
    {LABEL[mode]}
  </button>
);
