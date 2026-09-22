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

/**
 * 拆出数值与单位两部分。
 * formatChinese 的输出形如：`100.00 万`（中文单位，空格分隔）、`1.23a`（字母单位，紧贴数字）、
 * `1,234`（万以下无单位）、`1.23 × 10^100`（超大数退化为科学计数法）。
 * 单位要单独放在另一行展示，故需拆开。
 */
function splitChineseUnit(text: string): { value: string; unit: string } {
  const spaced = /^(\S+)\s+(.+)$/.exec(text);
  if (spaced) return { value: spaced[1], unit: spaced[2] };
  const alpha = /^([\d,.]+)([a-z]+)$/.exec(text);
  if (alpha) return { value: alpha[1], unit: alpha[2] };
  return { value: text, unit: '' };
}

export const CoreNumberDisplay: React.FC<CoreNumberDisplayProps> = ({
  currentValue,
  floatingTexts,
  onClick,
}) => {
  // 触摸后浏览器会补发一次 click，需在此期间忽略，避免同一次点击被计两次
  const lastTouchAt = useRef(0);
  const pressTimer = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  // 数值与单位分开展示：巨型数字只留数值，单位单独置于其下一行
  const { value: valueText, unit: unitText } = splitChineseUnit(currentValue.formatChinese(2));

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
    <div className="relative w-full max-w-md mx-auto px-4 pt-6 pb-4">
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

        {/* Central numeric display area（固定高度，避免数值长度变化导致主页抖动） */}
        <div className="relative z-10 flex h-[215px] sm:h-[260px] md:h-[300px] flex-col items-center justify-center px-4 text-center">
          <div className="relative text-xs sm:text-sm tracking-[0.25em] text-[#8c8273] font-serif mb-2 flex items-center gap-2">
            <span className="w-6 h-[1px] bg-[#4a4235]" />
            <span>以 数 证 道 ， 一 指 飞 升</span>
            <span className="w-6 h-[1px] bg-[#4a4235]" />

            {/* 浮动文本：挂在本行（相对定位）上，以本行为基准向上飘，
                不再压在巨型数字上 */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
              {floatingTexts.map((item) => {
                // Radial scattering based on item's offsetAngle and distance
                const rad = (item.offsetAngle * Math.PI) / 180;
                const x = Math.cos(rad) * item.distance;
                const y = Math.sin(rad) * item.distance - 40; // float upwards

                let colorClass = 'text-[#d6cec0]';

                // 暴击红色显示（连击与暴击互斥，不存在两者同时触发）
                if (item.type === 'crit') {
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

          {/* Giant Number Display in Chinese large unit notation
              宽度固定为整行并居中：数值位数变化时不再左右晃动；
              tabular-nums 让每个数字等宽，消除自动连点时的逐帧微抖 */}
          <div className="flex w-full justify-center">
            <div
              id="giant-number-text"
              className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-[#f2ede4] font-mono tabular-nums transition-transform duration-75 break-words drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 1px rgba(255,255,255,0.2)',
              }}
            >
              {valueText}
            </div>
          </div>

          {/* 单位行（原「点我」位置）：红色 3xl，数量级一眼可辨；
              固定行高，避免单位出现/消失（跨过万位）时主页抖动 */}
          <div className="mt-3 flex h-9 items-center justify-center">
            {unitText && (
              <span className="text-3xl font-serif font-bold text-[#ef4444] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {unitText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
