import React from 'react';
import { BigNum } from '../utils/bigNumber';
import { getNearbyTitleRanks, getTitle } from '../utils/title';
import { useGameData } from '../context/GameContext';

/** 已达成 / 当前 / 未达成 三种时间线节点样式 */
const nodeClass = (current: boolean, achieved: boolean): string => {
  if (current) {
    return 'h-3.5 w-3.5 border-[#e8c46a] bg-[#f7e6b4] shadow-[0_0_10px_rgba(232,196,106,0.9)]';
  }
  if (achieved) {
    return 'h-2.5 w-2.5 border-[#6b5a3f] bg-[#8a7452]';
  }
  return 'h-2.5 w-2.5 border-[#4a4235] bg-[#1a1715]';
};

/** 称号时间线：自凡人起逐档向上，并标出自己所在的位置 */
export const TitleModal: React.FC = () => {
  const { state } = useGameData();
  const title = getTitle(state);
  const ranks = getNearbyTitleRanks(state);
  const highestValue = BigNum.fromData(state.highestValue);

  return (
    <div className="flex flex-col gap-3">
      {/* 当前位置概要 */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] font-serif tracking-[0.2em] text-[#8a7a63]">当 前 称 号</div>
          <div className="text-[10px] font-mono text-[#6f6656] mt-0.5 truncate">
            历世最高数值 {highestValue.formatChinese(2)}
          </div>
        </div>
        <span
          className="font-serif font-bold text-lg sm:text-xl whitespace-nowrap flex-shrink-0"
          style={{ color: title.color, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
        >
          {title.name}
        </span>
      </div>

      {/* 时间线 */}
      <div className="flex flex-col">
        {ranks.map((r, idx) => (
          <div key={`${idx}-${r.name}`} className="flex items-center gap-3">
            {/* 节点列：上下半段连线 + 节点圆点 */}
            <div className="relative flex h-14 w-4 flex-shrink-0 items-center justify-center">
              {idx > 0 && (
                <span className="absolute top-0 h-1/2 w-[2px] bg-[#3b3429]" aria-hidden />
              )}
              {idx < ranks.length - 1 && (
                <span className="absolute bottom-0 h-1/2 w-[2px] bg-[#3b3429]" aria-hidden />
              )}
              <span
                className={`relative rounded-full border-2 transition-all ${nodeClass(
                  r.current,
                  r.achieved
                )}`}
              />
            </div>

            {/* 境界信息 */}
            <div
              className={`flex flex-1 min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                r.current
                  ? 'bg-[#241f16] border-[#6b5a3f]'
                  : r.achieved
                    ? 'bg-[#1f1d1a] border-[#3b3429]'
                    : 'bg-[#1a1816] border-[#2b2721] opacity-70'
              }`}
            >
              <span
                className={`font-serif font-bold text-sm truncate ${
                  r.current || r.achieved ? '' : 'opacity-80'
                }`}
                style={{ color: r.color }}
              >
                {r.name}
              </span>
              <span className="font-mono text-[10px] text-[#8a7a63] flex-shrink-0">
                {r.requiredExponent === null
                  ? '起点'
                  : `≥ ${new BigNum(1, r.requiredExponent).formatChinese(0)}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
