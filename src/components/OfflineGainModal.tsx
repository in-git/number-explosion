import React, { useEffect } from 'react';
import { BigNum } from '../utils/bigNumber';
import { formatDuration } from '../utils/serverTime';
import { OfflineGainReport } from '../types';

interface OfflineGainModalProps {
  /** 挂机收益报告：null 时不展示 */
  report: OfflineGainReport | null;
  onClose: () => void;
}

/** 挂机收益弹窗：离线（关闭页面）或切后台回来后，展示本次挂机的离线收益 */
export const OfflineGainModal: React.FC<OfflineGainModalProps> = ({ report, onClose }) => {
  // ESC / 遮罩点击关闭
  useEffect(() => {
    if (!report) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [report, onClose]);

  if (!report) return null;

  const gain = BigNum.fromData(report.gain);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs modal-scroll"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto bg-[#1a1715] border-2 border-[#473e32] rounded-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#302921] rounded-lg" />

        {/* Title */}
        <div className="text-center pb-3 mb-3 border-b border-[#362f25]">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#9c8e7a] mb-1">
            —— 闭 关 归 来 ——
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-serif text-[#ebdcc5] tracking-wider">
            离 线 参 玄
          </h3>
        </div>

        {/* 离线时长 */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-serif mb-3">
          <span className="text-[#7a6f5e]">离线时长</span>
          <span className="font-mono text-[#d1c6b4]">{formatDuration(report.durationMs)}</span>
        </div>

        {/* 收益 */}
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3 mb-3 text-center">
          <div className="text-[11px] font-serif text-[#8fa6bd] mb-1">自动行功入账</div>
          <div className="text-2xl font-bold font-mono text-[#e8c97a]">
            +{gain.formatChinese(2)}
          </div>
        </div>

        {/* 截断提示 */}
        {(report.truncatedByMax || report.truncatedByCap) && (
          <div className="rounded-lg border border-[#4a3327] bg-[#221a15] px-3 py-2 mb-3 text-[10px] font-serif text-[#b08a6f] text-center leading-relaxed">
            {report.truncatedByMax && <div>离线超过 1 天 · 已按上限结算</div>}
            {report.truncatedByCap && <div>数值已达上限 · 超出部分未能入账</div>}
          </div>
        )}

        {/* Action */}
        <div className="flex justify-center pt-2 border-t border-[#362f25]">
          <button
            onClick={onClose}
            className="px-8 py-2 rounded text-xs font-serif font-bold text-[#f5ebd7] bg-[#543b23] hover:bg-[#694a2c] border border-[#8a653f] shadow-[0_4px_16px_rgba(0,0,0,0.6)] active:translate-y-0.5 cursor-pointer transition-all"
          >
            收 下
          </button>
        </div>
      </div>
    </div>
  );
};
