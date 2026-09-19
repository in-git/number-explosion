import React, { useEffect, useRef, useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { FloatingText } from '../types';

interface CoreNumberDisplayProps {
  currentValue: BigNum;
  floatingTexts: FloatingText[];
  onClick: () => void;
}

/** 按压反馈时长 */
const PRESS_FEEDBACK_MS = 80;
/** 触摸后浏览器补发 click 的抑制窗口 */
const TOUCH_CLICK_GRACE_MS = 700;

export const CoreNumberDisplay: React.FC<CoreNumberDisplayProps> = ({
  currentValue,
  floatingTexts,
  onClick,
}) => {
  // 触摸后浏览器会补发一次 click，需在此期间忽略，避免同一次点击被计两次
  const lastTouchAt = useRef(0);
  const pressTimer = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(
    () => () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    },
    []
  );

  const flashPressed = () => {
    setIsPressed(true);
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setIsPressed(false), PRESS_FEEDBACK_MS);
  };

  const trigger = () => {
    flashPressed();
    onClick();
  };

  // 多指同时按下：每个新增触点各自算一次点击
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchAt.current = Date.now();
    const touches = e.changedTouches.length || 1;
    for (let i = 0; i < touches; i++) {
      trigger();
    }
  };

  const handleClick = () => {
    if (Date.now() - lastTouchAt.current < TOUCH_CLICK_GRACE_MS) return;
    trigger();
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pt-6 pb-4">
      {/* Heavy carved stone tablet frame */}
      <div
        id="core-number-tablet"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        className={`relative cursor-pointer overflow-hidden select-none touch-manipulation transition-all duration-100 rounded-xl
          bg-[#1e1c19] border-2 border-[#38332b] shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)]
          hover:border-[#52493c] active:translate-y-1 active:shadow-[0_4px_12px_rgba(0,0,0,0.9)]
          ${isPressed ? 'translate-y-1 scale-[0.99] border-[#6b5f4d]' : ''}
        `}
      >
        {/* Subtle stone texture & ink wash grain overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none bg-repeat mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(#d5cebe 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Incised decorative border markings like an ancient stone stele */}
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#332e26] rounded-lg" />
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#6d614f]" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#6d614f]" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#6d614f]" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#6d614f]" />

        {/* Central numeric display area */}
        <div className="relative z-10 flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center min-h-[170px] sm:min-h-[210px]">
          <div className="text-xs sm:text-sm tracking-[0.25em] text-[#8c8273] font-serif mb-2 flex items-center gap-2">
            <span className="w-6 h-[1px] bg-[#4a4235]" />
            <span>太 虚 衍 化 · 本 源 数 值</span>
            <span className="w-6 h-[1px] bg-[#4a4235]" />
          </div>

          {/* Giant Number Display in Chinese large unit notation */}
          <div
            id="giant-number-text"
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#f2ede4] font-serif transition-transform duration-75 break-words drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{
              fontFamily: "'Noto Serif SC', 'Songti SC', SimSun, serif",
              textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 1px rgba(255,255,255,0.2)',
            }}
          >
            {currentValue.formatChinese(2)}
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs tracking-wider text-[#736a5c]">
            <span className="px-2 py-0.5 rounded bg-[#2a2621] border border-[#3e372e] text-[#a69b89]">
              点我
            </span>
          </div>

          {/* Concentrated Floating Visual Effects on top number */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
            {floatingTexts.map((item) => {
              // Radial scattering based on item's offsetAngle and distance
              const rad = (item.offsetAngle * Math.PI) / 180;
              const x = Math.cos(rad) * item.distance;
              const y = Math.sin(rad) * item.distance - 40; // float upwards

              let colorClass = 'text-[#d6cec0]';

              if (item.type === 'crit-combo') {
                colorClass = 'text-[#f59e0b] font-black drop-shadow-[0_2px_6px_rgba(0,0,0,1)]';
              } else if (item.type === 'crit') {
                colorClass = 'text-[#ef4444] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]';
              } else if (item.type === 'combo') {
                colorClass = 'text-[#06b6d4] font-bold';
              }

              return (
                <span
                  key={item.id}
                  className={`absolute z-30 pointer-events-none font-serif whitespace-nowrap ${colorClass}`}
                  style={{
                    fontSize: '12px',
                    transform: `translate(${x}px, ${y}px)`,
                    animation: 'floatUp 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
