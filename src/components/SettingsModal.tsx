import React, { useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { useGameActions, useGameData, useModals } from '../context/GameContext';

/** 点数默认值 */
const DEFAULT_POINTS = '100';

/** 解析点数输入：非法或负数无效 */
function parsePoints(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** 快捷设置项：0 / 10万 / 500万 / 1亿 */
const PRESETS: { label: string; value: number }[] = [
  { label: '0', value: 0 },
  { label: '10w', value: 100000 },
  { label: '500w', value: 5000000 },
  { label: '1亿', value: 100000000 },
];

export const SettingsModal: React.FC = () => {
  const { currentBigNum: currentValue } = useGameData();
  const {
    debugSetValue: onSetValue,
    debugSetRebirthPoints: onSetRebirthPoints,
    debugSetCollapsePoints: onSetCollapsePoints,
    resetAfterlifeUpgrades: onResetAfterlifeUpgrades,
    resetCollapseUpgrades: onResetCollapseUpgrades,
    resetRebirthUpgrades: onResetRebirthUpgrades,
    resetProgress: onResetProgress,
  } = useGameActions();
  const modals = useModals();
  const isOpen = modals.settings.isOpen;
  const onClose = modals.settings.close;

  const [input, setInput] = useState('');
  const [rebirthInput, setRebirthInput] = useState(DEFAULT_POINTS);
  const [collapseInput, setCollapseInput] = useState(DEFAULT_POINTS);

  if (!isOpen) return null;

  // 快捷项直接生效并关闭
  const applyPreset = (value: number) => {
    onSetValue(BigNum.fromNumber(value));
    onClose();
  };

  const applyInput = () => {
    const raw = input.trim();
    if (raw === '') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onSetValue(BigNum.fromNumber(n));
    setInput('');
    onClose();
  };

  /** 永劫点数 / 坍缩点数：输入框默认 100，设置后立即生效并关闭 */
  const applyRebirth = () => {
    const n = parsePoints(rebirthInput);
    if (n === null) return;
    onSetRebirthPoints(n);
    setRebirthInput(DEFAULT_POINTS);
    onClose();
  };

  const applyCollapse = () => {
    const n = parsePoints(collapseInput);
    if (n === null) return;
    onSetCollapsePoints(n);
    setCollapseInput(DEFAULT_POINTS);
    onClose();
  };

  const pointFields = [
    {
      id: 'rebirth',
      title: '永劫点数',
      value: rebirthInput,
      onChange: setRebirthInput,
      onApply: applyRebirth,
    },
    {
      id: 'collapse',
      title: '坍缩点数',
      value: collapseInput,
      onChange: setCollapseInput,
      onApply: applyCollapse,
    },
  ];

  const handleReset = () => {
    if (window.confirm('是否重置所有修炼进度归零？')) {
      onResetProgress();
      onClose();
    }
  };

  /** 单项重置：二次确认后执行（不关闭面板，便于连续重置多项） */
  const handleUpgradeReset = (label: string, action: () => void) => {
    if (window.confirm(`确定重置${label}升级？等级将归零，且不返还已消耗的点数。`)) {
      action();
    }
  };

  /** 各殿升级重置入口 */
  const upgradeResetFields: { id: string; title: string; action: () => void }[] = [
    { id: 'afterlife', title: '往生殿', action: onResetAfterlifeUpgrades },
    { id: 'collapse', title: '坍缩殿', action: onResetCollapseUpgrades },
    { id: 'rebirth', title: '永劫殿', action: onResetRebirthUpgrades },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs modal-scroll">
      <div className="relative w-full max-w-md my-auto bg-[#1a1715] border-2 border-[#473e32] rounded-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none">
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#302921] rounded-lg" />

        {/* Title */}
        <div className="text-center pb-3 mb-3 border-b border-[#362f25]">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#9c8e7a] mb-1">
            —— 逆 天 改 命 · 慎 之 又 慎 ——
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-serif text-[#ebdcc5] tracking-wider">
            设 置 面 板
          </h3>
        </div>

        {/* 当前数值 */}
        <div className="space-y-1.5 text-[11px] font-serif mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">当前数值</span>
            <span className="font-mono text-[#d1c6b4]">{currentValue.formatChinese(2)}</span>
          </div>
        </div>

        {/* 任意数值输入 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5 mb-3">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">自定义数值（可输入任意数）</div>
          <div className="flex items-center gap-2">
            <input
              id="settings-value-input"
              type="number"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如 1234567"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0f1216] border border-[#2c3440] text-sm text-[#e3ded4] font-mono outline-none focus:border-[#5b8db8] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              id="btn-settings-apply"
              onClick={applyInput}
              className="px-4 py-2 rounded-lg bg-[#1f3a4d] border border-[#2f5a73] hover:border-[#4a8db8] active:translate-y-0.5 text-xs font-serif text-[#cfe4f2] cursor-pointer"
            >
              设置
            </button>
          </div>
        </div>

        {/* 永劫点数 / 坍缩点数：仅标题 + 输入框（默认 100） */}
        <div className="space-y-2 mb-3">
          {pointFields.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5"
            >
              <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">{f.title}</div>
              <div className="flex items-center gap-2">
                <input
                  id={`settings-${f.id}-points-input`}
                  type="number"
                  inputMode="numeric"
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0f1216] border border-[#2c3440] text-sm text-[#e3ded4] font-mono outline-none focus:border-[#5b8db8] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  id={`btn-settings-apply-${f.id}-points`}
                  onClick={f.onApply}
                  className="px-4 py-2 rounded-lg bg-[#1f3a4d] border border-[#2f5a73] hover:border-[#4a8db8] active:translate-y-0.5 text-xs font-serif text-[#cfe4f2] cursor-pointer"
                >
                  设置
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 快捷选择 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5 mb-3">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">快捷设定</div>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.value)}
                className="px-2 py-2 rounded-lg bg-[#241f1a] border border-[#3b3429] hover:border-[#8a653f] active:translate-y-0.5 text-sm font-serif text-[#ded7cb] cursor-pointer transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 重置各殿升级：等级归零，不返还已消耗点数 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5 mb-3">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">重置升级</div>
          <div className="text-[10px] font-mono text-[#8f8574] leading-relaxed mb-2">
            将对应殿的升级等级归零 · 不返还已消耗点数
          </div>
          <div className="grid grid-cols-3 gap-2">
            {upgradeResetFields.map((f) => (
              <button
                key={f.id}
                id={`btn-settings-reset-${f.id}`}
                onClick={() => handleUpgradeReset(f.title, f.action)}
                className="px-2 py-2 rounded-lg bg-[#241f1a] border border-[#3b3429] hover:border-[#8a653f] active:translate-y-0.5 text-xs font-serif text-[#ded7cb] cursor-pointer transition-colors"
              >
                重置{f.title}
              </button>
            ))}
          </div>
        </div>

        {/* 重修道途（原顶部入口迁移至此） */}
        <div className="rounded-lg border border-[#5a2f2f] bg-[#211818] px-2.5 py-2.5 mb-4">
          <div className="text-[11px] font-serif text-[#bd8f8f] mb-1.5">重修道途</div>
          <div className="text-[11px] font-mono text-[#cbbfa9] leading-relaxed mb-2">
            清空存档与全部进度，不可恢复
          </div>
          <button
            id="btn-settings-reset"
            onClick={handleReset}
            className="w-full px-3 py-2 rounded-lg bg-[#3d1f1f] border border-[#7a3a3a] hover:border-[#b25454] active:translate-y-0.5 text-xs font-serif text-[#e8c4c4] cursor-pointer transition-colors"
          >
            重修道途（重置进度）
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#362f25]">
          <button
            id="btn-modal-close-settings"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-serif text-[#a69c8c] bg-[#241f1a] hover:bg-[#2e2821] border border-[#3b3429] cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
