import React from 'react';
import { BigNum } from '../utils/bigNumber';

interface RebirthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentValue: BigNum;
  currentRebirthCount: number;
}

export const RebirthModal: React.FC<RebirthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentRebirthCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs modal-scroll">
      <div className="relative w-full max-w-md my-auto bg-[#1a1715] border-2 border-[#473e32] rounded-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none">
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#302921] rounded-lg" />

        {/* Title */}
        <div className="text-center pb-3 mb-3 border-b border-[#362f25]">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#9c8e7a] mb-1">
            —— 兵 解 转 世 ——
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-serif text-[#ebdcc5] tracking-wider">
            确 认 重 生
          </h3>
        </div>

        {/* 简要说明 */}
        <div className="space-y-1.5 text-[11px] font-serif mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">所得</span>
            <span className="font-mono text-[#5fa8e6]">+1 点重生值（永久）</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">代价</span>
            <span className="text-[#e0a8a8] text-right">
              所有升级和当前数值清零
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">次数</span>
            <span className="font-mono text-[#d1c6b4]">已重生 {currentRebirthCount} 次</span>
          </div>
        </div>

        {/* 说明：重生不再改变基础属性 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2 mb-4">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1">须知</div>
          <div className="text-[11px] font-mono text-[#cbbfa9] leading-relaxed">
            重生获得 1 点重生值
            <br />
            基础属性只可在重生商店中购买提升
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#362f25]">
          <button
            id="btn-modal-close-rebirth"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-serif text-[#a69c8c] bg-[#241f1a] hover:bg-[#2e2821] border border-[#3b3429] cursor-pointer transition-colors"
          >
            关闭
          </button>
          <button
            id="btn-modal-confirm-rebirth"
            onClick={onConfirm}
            className="px-5 py-2 rounded text-xs font-serif font-bold text-[#f5ebd7] bg-[#543b23] hover:bg-[#694a2c] border border-[#8a653f] shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer active:translate-y-0.5 transition-all"
          >
            转世重生
          </button>
        </div>
      </div>
    </div>
  );
};
