import React from 'react';

import templeBg from '../assets/images/stone_temple_bg_1789732896118.jpg';

/** 背景：古刹石纹 + 暗色渐变压暗 */
export const AppBackground: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden mix-blend-luminosity">
    <img
      src={templeBg}
      alt="Ancient stone temple background"
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover object-center filter contrast-125 brightness-75"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-[#141210]/95 via-[#141210]/90 to-[#141210]" />
  </div>
);
