import React, { useEffect, useState } from 'react';
import { useModals } from '../context/GameContext';

/** 距可关闭的秒数 */
const LOCK_SECONDS = 3;

/** 首屏警示文案 */
const MESSAGE = '没有足够的数值，请勿渡劫，\n那里的世界，远比你想象中的复杂。';

/**
 * 首次进入游戏的渡劫警示：
 * - 进入即弹，3 秒后才出现关闭按钮；
 * - 3 秒内遮罩点击 / ESC / 按钮均不可关闭，须读毕方可离开。
 */
export const FirstEntryModal: React.FC = () => {
  const modals = useModals();
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS);
  const canClose = secondsLeft <= 0;

  useEffect(() => {
    if (!modals.firstEntry.isOpen) return;
    // 每次打开重置倒计时
    setSecondsLeft(LOCK_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [modals.firstEntry.isOpen]);

  if (!modals.firstEntry.isOpen) return null;

  return (
    // 遮罩不绑定 onClose：3 秒内点击遮罩不可关闭
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-md flex flex-col bg-[#141210] border-2 border-[#473e32] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none">
        {/* 内容区 */}
        <div className="flex-1 px-5 py-8 text-center">
          <div className="text-[11px] font-serif text-[#807565] mb-5 tracking-[0.2em]">
            —— 初 入 江 湖 ——
          </div>
          <p className="text-[15px] sm:text-base font-serif leading-loose text-[#ebdcc5] whitespace-pre-line">
            {MESSAGE}
          </p>
        </div>

        {/* 底栏：倒计时 + 关闭按钮（未到时禁用） */}
        <div className="px-4 py-3 border-t border-[#362f25] bg-[#1a1715] flex items-center justify-between gap-3">
          <span className="text-[11px] font-serif text-[#807565]">
            {canClose ? '已可读毕 · 闭之即可' : `${secondsLeft} 秒后可关闭`}
          </span>
          <button
            disabled={!canClose}
            onClick={modals.firstEntry.close}
            aria-label="关闭"
            className={`text-sm font-serif tracking-widest px-4 py-1.5 rounded-lg border transition-colors ${
              canClose
                ? 'border-[#473e32] text-[#ebdcc5] hover:bg-[#2a2520] cursor-pointer'
                : 'border-[#2a2520] text-[#5a5247] cursor-not-allowed'
            }`}
          >
            关 闭
          </button>
        </div>
      </div>
    </div>
  );
};
