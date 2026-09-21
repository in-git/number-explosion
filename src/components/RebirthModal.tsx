import React from 'react';
import { BigNum } from '../utils/bigNumber';
import { REBIRTH_THRESHOLD } from '../config';
import { getRebirthPointsFromValue } from '../utils/gameMath';

interface RebirthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentValue: BigNum;
  currentRebirthCount: number;
  /** 「永劫爆炸」加成：每 100 万数值额外 +0.2 × 等级 */
  rebirthPointBonus: number;
  /** 当前已持有的永劫点数（用于计算获取上限） */
  currentRebirthPoints: number;
  /** 当前永劫点获取上限（由往生殿「永劫点上限」等级决定） */
  rebirthPointsCap: number;
}

export const RebirthModal: React.FC<RebirthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentValue,
  currentRebirthCount,
  rebirthPointBonus,
  currentRebirthPoints,
  rebirthPointsCap,
}) => {
  if (!isOpen) return null;

  // 所得永劫点数 = 数值 ÷ 100 万 + 「永劫爆炸」加成
  const gainFromValue = getRebirthPointsFromValue(currentValue);
  const rawGain = gainFromValue + rebirthPointBonus;
  // 获取上限：(数值 + 加成) ÷ 100 万 超过上限时，所得即为上限
  const totalGain = Math.min(rawGain, rebirthPointsCap);
  const cappedByHighGain = rawGain > rebirthPointsCap;
  // 门槛：数值必须 ≥ 100 万
  const canRebirth = currentValue.gte(REBIRTH_THRESHOLD);

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
            确 认 永 劫
          </h3>
        </div>

        {/* 简要说明 */}
        <div className="space-y-1.5 text-[11px] font-serif mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">所得</span>
            <span className="font-mono text-[#5fa8e6]">
              +{BigNum.fromNumber(totalGain).formatChinese(1)} 点永劫值
            </span>
          </div>
          {rebirthPointBonus > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#7a6f5e]">加成</span>
              <span className="font-mono text-[#8fd0a0]">
                +{BigNum.fromNumber(rebirthPointBonus).formatChinese(1)} 点永劫值
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">次数</span>
            <span className="font-mono text-[#d1c6b4]">
              已永劫 {BigNum.fromNumber(currentRebirthCount).formatChinese(0)} 次
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">当前持有</span>
            <span className="font-mono text-[#d1c6b4]">
              {BigNum.fromNumber(currentRebirthPoints).formatChinese(1)} 点
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7a6f5e]">单次上限</span>
            <span className="font-mono text-[#d1c6b4]">
              {BigNum.fromNumber(rebirthPointsCap).formatChinese(0)} 点
            </span>
          </div>
          {cappedByHighGain && (
            <div className="text-[10px] text-[#d99797] font-serif text-right">
              (数值 + 加成) 折算已超过上限，本次所得以上限为准
            </div>
          )}
        </div>

        {/* 说明：永劫不再改变基础属性 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2 mb-4">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1">须知</div>
          <div className="text-[11px] font-mono text-[#cbbfa9] leading-relaxed">
            将会重置数值殿的所有升级
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
            disabled={!canRebirth}
            className={`px-5 py-2 rounded text-xs font-serif font-bold border shadow-[0_4px_16px_rgba(0,0,0,0.6)] active:translate-y-0.5 transition-all ${
              canRebirth
                ? 'text-[#f5ebd7] bg-[#543b23] hover:bg-[#694a2c] border-[#8a653f] cursor-pointer'
                : 'text-[#6b6455] bg-[#171513] border-[#2b2721] cursor-not-allowed'
            }`}
          >
            {canRebirth ? '转世永劫' : `数值需满 ${REBIRTH_THRESHOLD.formatChinese(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
