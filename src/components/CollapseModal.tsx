import React from 'react';
import { Orbit, X } from 'lucide-react';
import { COLLAPSE_COST } from '../utils/gameMath';

interface CollapseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentRebirthPoints: number;
  currentCollapsePoints: number;
  collapseGain: number;
}

export const CollapseModal: React.FC<CollapseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentRebirthPoints,
  currentCollapsePoints,
  collapseGain,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#141217] border-2 border-[#433054] rounded-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.98)] select-none">
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#2b1e36] rounded-lg" />

        {/* Title */}
        <div className="text-center pb-3 mb-4 border-b border-[#2d1e38]">
          <div className="text-xs font-serif tracking-[0.3em] text-[#9a7ba6] mb-1">
            —— 鸿 蒙 寂 灭 · 万 象 坍 缩 ——
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#ebd6f5] tracking-wider">
            太 虚 入 寂 · 确 认 坍 缩
          </h3>
        </div>

        {/* Status */}
        <div className="bg-[#1e1724] border border-[#3b2747] rounded-lg p-3 mb-4 flex items-center justify-around text-center">
          <div>
            <div className="text-[11px] text-[#8e749c] font-serif">消耗重生值</div>
            <div className="text-lg font-bold font-mono text-[#e3a8fa]">
              {COLLAPSE_COST} 点 (拥有:{' '}
              <span className="text-[#5fa8e6]">{currentRebirthPoints}</span>)
            </div>
          </div>
          <div className="w-[1px] h-8 bg-[#3b2545]" />
          <div>
            <div className="text-[11px] text-[#8e749c] font-serif">本次坍缩增长</div>
            <div className="text-lg font-bold font-mono text-[#d6c5e6]">
              +{collapseGain} 重 (现拥有: {currentCollapsePoints}重)
            </div>
          </div>
        </div>

        {/* Points breakdown */}
        <div className="space-y-4 text-xs font-serif leading-relaxed mb-6">
          {/* Benefits */}
          <div className="bg-[#211529] border border-[#432357] rounded-lg p-3">
            <div className="text-[#bf7ee6] font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <Orbit size={14} />
              <span>坍缩的作用与收益（太虚神则）</span>
            </div>
            <ul className="space-y-1.5 text-[#dac0ed] list-disc list-inside">
              <li>
                <span className="font-bold">凝练太虚坍缩神位</span>：初始获得1点坍缩，随后以2的等差数列递进增长（本次可获 <span className="font-bold text-white">+{collapseGain}</span> 重）。
              </li>
              <li>
                <span className="font-bold">坍缩神位永存</span>：坍缩层数可用于坍缩商店翻倍数值上限，与每次点击所得数值无关。
              </li>
              <li>
                <span className="font-bold">大道永驻</span>：坍缩层数永久凝练，即便转世轮回亦不可磨灭。
              </li>
            </ul>
          </div>

          {/* Side effects */}
          <div className="bg-[#241318] border border-[#4a1c29] rounded-lg p-3">
            <div className="text-[#de6d86] font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <X size={14} />
              <span>坍缩的代价与副作用（鸿蒙洗礼）</span>
            </div>
            <ul className="space-y-1.5 text-[#e8a2b2] list-disc list-inside">
              <li>
                <span className="font-bold">献祭 {COLLAPSE_COST} 点重生值</span>
                ：作为开启太虚坍缩的祭品，{COLLAPSE_COST} 点珍贵的重生点数将悉数消耗。
              </li>
              <li>
                <span className="font-bold">当前数值全部归零</span>：一切元气回归太虚奇点，从初生之态再起征程。
              </li>
              <li>
                <span className="font-bold">所有功法层级全重置</span>：升级与封印全部重归初始，以更高的天道法则重新构筑。
              </li>
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2d1e38]">
          <button
            id="btn-modal-close-collapse"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-serif text-[#a38cae] bg-[#22182b] hover:bg-[#2e1f3a] border border-[#3b2b47] cursor-pointer transition-colors"
          >
            关闭
          </button>
          <button
            id="btn-modal-confirm-collapse"
            onClick={onConfirm}
            className="px-5 py-2 rounded text-xs font-serif font-bold text-[#faf0ff] bg-[#53246e] hover:bg-[#682e8a] border border-[#833cae] shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer active:translate-y-0.5 transition-all"
          >
            太虚坍缩·万象归一
          </button>
        </div>
      </div>
    </div>
  );
};
