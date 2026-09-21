import React from 'react';
import { useModals } from '../context/GameContext';

/**
 * 通关提示：数值首次达到 1ssr（字母档位顶点）时弹出一次。
 * - 可随时关闭（遮罩 / 按钮 / ESC 均可），不影响任何其他功能
 * - 「已通关」为存档属性，渡劫失败 / 永劫 / 坍缩都不会复位
 */
export const GameClearedModal: React.FC = () => {
  const modals = useModals();

  if (!modals.cleared.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={modals.cleared.close}
    >
      <div
        className="relative w-[90%] max-w-md flex flex-col bg-[#141210] border-2 border-[#7a6533] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 px-5 py-8 text-center">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#8a7a63]">
            —— 终 有 一 日 · 再 无 可 越 ——
          </div>

          <div
            className="mt-4 font-serif font-bold text-3xl sm:text-4xl tracking-[0.24em] text-[#f2dfae]"
            style={{ textShadow: '0 2px 18px rgba(232,196,106,0.6), 0 2px 6px rgba(0,0,0,0.95)' }}
          >
            已 通 关
          </div>

          <p className="mt-5 text-[12px] sm:text-[13px] font-serif leading-loose text-[#cbbfa9]">
            数值已臻至
            <span className="mx-1 font-mono font-bold text-[#e8c46a]">1ssr</span>
            字母档位之巅，此界再无可越之峰。
          </p>

          <p className="mt-2 text-[11px] font-serif leading-loose text-[#8a7a63]">
            「已通关」记入存档属性，渡劫失败、永劫、坍缩皆不会抹去，
            并会随成绩同步至排行榜。
          </p>
        </div>

        <div className="px-4 py-3 border-t border-[#362f25] bg-[#1a1715] flex justify-end">
          <button
            id="btn-cleared-close"
            onClick={modals.cleared.close}
            aria-label="关闭"
            className="text-sm font-serif tracking-widest px-5 py-1.5 rounded-lg border border-[#7a6533] text-[#f2dfae] hover:bg-[#2a2520] cursor-pointer transition-colors"
          >
            关 闭
          </button>
        </div>
      </div>
    </div>
  );
};
