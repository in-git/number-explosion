import React from 'react';
import { useGameActions, useModals } from '../context/GameContext';

/**
 * 重修道途：二次确认弹窗。
 * 与「修改数据」里的各殿重置不同，此项会清空存档与全部进度且不可恢复，
 * 故单列一档，必须点「确认重修」才执行（取消 / 点遮罩即放弃）。
 */
export const ResetConfirmModal: React.FC = () => {
  const modals = useModals();
  const { resetProgress } = useGameActions();

  if (!modals.resetConfirm.isOpen) return null;

  /** 确认重修：先关掉弹窗，再执行重置（重置会重载页面） */
  const onConfirm = () => {
    modals.resetConfirm.close();
    resetProgress();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={modals.resetConfirm.close}
    >
      <div
        className="relative w-[90%] max-w-md flex flex-col bg-[#141210] border-2 border-[#7a3a3a] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 px-5 py-7 text-center">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#8a7a63]">
            —— 一 身 道 行 · 尽 归 尘 土 ——
          </div>

          <div
            className="mt-4 font-serif font-bold text-2xl sm:text-3xl tracking-[0.24em] text-[#f2d0d0]"
            style={{ textShadow: '0 2px 18px rgba(232,106,106,0.55), 0 2px 6px rgba(0,0,0,0.95)' }}
          >
            重 修 道 途
          </div>

          <p className="mt-5 text-[12px] sm:text-[13px] font-serif leading-loose text-[#cbbfa9]">
            将清空存档与全部进度——数值、各殿等级、点数、账号登录状态等，
            并立即重载页面至全新开局。
          </p>

          <p className="mt-2 text-[12px] font-serif font-bold leading-loose text-[#c9867a]">
            此操作不可恢复，确定要继续吗？
          </p>
        </div>

        <div className="px-4 py-3 border-t border-[#362f25] bg-[#1a1715] flex items-center justify-end gap-2">
          <button
            id="btn-reset-cancel"
            onClick={modals.resetConfirm.close}
            aria-label="取消"
            className="text-sm font-serif tracking-widest px-4 py-1.5 rounded-lg border border-[#3b3429] bg-[#241f1a] text-[#a69c8c] hover:bg-[#2e2821] cursor-pointer transition-colors"
          >
            取 消
          </button>
          <button
            id="btn-reset-confirm"
            onClick={onConfirm}
            aria-label="确认重修"
            className="text-sm font-serif tracking-widest px-4 py-1.5 rounded-lg bg-[#3d1f1f] border border-[#7a3a3a] text-[#e8c4c4] hover:border-[#b25454] active:translate-y-0.5 cursor-pointer transition-colors"
          >
            确 认 重 修
          </button>
        </div>
      </div>
    </div>
  );
};
