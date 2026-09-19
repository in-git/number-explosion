import React from 'react';

import monkPortrait from '../assets/images/monk_cultivator_1789732911134.jpg';

/** 顶部标题条：道号（重修道途入口已移至设置面板） */
export const AppHeader: React.FC = () => (
  <header className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-4 pb-1 flex items-center justify-between border-b border-[#2d2822]">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#4d4233] bg-[#1a1714] shadow-md flex-shrink-0">
        <img
          src={monkPortrait}
          alt="Elderly monk in linen robes"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale contrast-125"
        />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-[0.2em] text-[#ede5d8]">
          数值爆炸
        </h1>
        <div className="text-[11px] text-[#857969] tracking-wider">
          青石枯荣 · 天道参玄
        </div>
      </div>
    </div>
  </header>
);
