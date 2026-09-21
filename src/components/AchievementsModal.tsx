import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BigNum } from '../utils/bigNumber';
import { ACHIEVEMENTS, AchievementDef } from '../config';
import { formatDuration } from '../utils/serverTime';
import { ModalShell } from './ModalShell';
import { useGameData, useModals } from '../context/GameContext';

/** 成就分类：点击 / 时长 / 渡劫次数 */
type CategoryId = 'click' | 'playTime' | 'tribulation';

const CATEGORIES: { id: CategoryId; label: string; desc: string }[] = [
  { id: 'click', label: '点 击', desc: '历世累计点击次数 · 永不清零' },
  { id: 'playTime', label: '时 长', desc: '累计游玩时长 · 不计离线与后台挂机' },
  { id: 'tribulation', label: '渡 劫 次 数', desc: '渡劫成败均计一次 · 上限 9 次' },
];

const fmt = (n: number) => n.toLocaleString('zh-CN');

/** 单条成就的进度：当前值 / 门槛值 / 进度文案 */
function progressOf(
  a: AchievementDef,
  totalClicks: number,
  playTimeMs: number,
  tribulationCount: number
): { cur: number; req: number; text: string } {
  if (a.type === 'playTime') {
    const req = a.requiredPlayMs || 0;
    const cur = Math.min(playTimeMs, req);
    return { cur, req, text: `${formatDuration(cur)} / ${formatDuration(req)}` };
  }
  if (a.type === 'tribulation') {
    const req = a.requiredTribulation || 0;
    const cur = Math.min(tribulationCount, req);
    return { cur, req, text: `${cur} / ${req} 次` };
  }
  const req = a.requiredClicks;
  const cur = Math.min(totalClicks, req);
  return { cur, req, text: `${fmt(cur)} / ${fmt(req)}` };
}

/** 奖励文案 */
const rewardText = (a: AchievementDef): string =>
  a.critMultiplier
    ? `暴击效果 +${a.critMultiplier}`
    : `永劫初始数值 +${BigNum.fromNumber(a.rebirthStartValue).formatChinese(0)}`;

/** 成就面板：三类手风琴，每类下为一条时间轴；未达成者整体置灰 */
export const AchievementsModal: React.FC = () => {
  const { state } = useGameData();
  const modals = useModals();

  const [openId, setOpenId] = useState<CategoryId | null>('click');

  const unlocked = new Set(state.unlockedAchievements || []);
  const totalClicks = state.totalClickCount || 0;
  const playTimeMs = state.playTimeMs || 0;
  const tribulationCount = state.tribulationCount || 0;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <ModalShell
      isOpen={modals.achievements.isOpen}
      onClose={modals.achievements.close}
      title="成 就"
      subtitle={`点击 ${fmt(totalClicks)} 次 · 游玩 ${formatDuration(playTimeMs)} · 渡劫 ${tribulationCount} 次 · 已达成 ${unlockedCount} / ${ACHIEVEMENTS.length}`}
    >
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.type === cat.id);
          const doneCount = items.filter((a) => unlocked.has(a.id)).length;
          const allDone = doneCount === items.length;
          const isOpen = openId === cat.id;

          return (
            <div
              key={cat.id}
              id={`achievement-group-${cat.id}`}
              className={`rounded-lg border overflow-hidden ${
                isOpen ? 'border-[#4a3f2c] bg-[#1e1b17]' : 'border-[#2f2b25] bg-[#1a1917]'
              }`}
            >
              {/* 手风琴头：分类名 + 达成进度 + 展开箭头 */}
              <button
                id={`btn-achievement-group-${cat.id}`}
                onClick={() => setOpenId(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer text-left"
              >
                <ChevronDown
                  size={13}
                  className={`flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#c9a86a]' : 'text-[#6f6656]'
                  }`}
                />
                <span
                  className={`font-serif font-bold text-[11px] sm:text-xs tracking-[0.14em] whitespace-nowrap ${
                    allDone ? 'text-[#e8cf9a]' : 'text-[#cbbb9f]'
                  }`}
                >
                  {cat.label}
                </span>
                <span
                  className={`ml-auto font-mono text-[10px] px-1.5 py-px rounded border flex-shrink-0 ${
                    allDone
                      ? 'bg-[#3b3327] border-[#6b5a3f] text-[#c9a86a]'
                      : 'bg-[#232120] border-[#302d29] text-[#8a7a63]'
                  }`}
                >
                  {doneCount} / {items.length}
                </span>
              </button>

              {/* 手风琴体：一条时间轴 */}
              {isOpen && (
                <div className="px-2.5 pb-2.5">
                  <div className="text-[10px] font-serif text-[#6f6656] mb-2">{cat.desc}</div>

                  <div className="relative pl-6">
                    {/* 主轴 */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[#33302b]" />

                    <div className="flex flex-col gap-2.5">
                      {items.map((a) => {
                        const done = unlocked.has(a.id);
                        const p = progressOf(a, totalClicks, playTimeMs, tribulationCount);

                        return (
                          <div key={a.id} id={`achievement-item-${a.id}`} className="relative">
                            {/* 节点 */}
                            <span
                              className={`absolute left-[-20px] top-[5px] h-2.5 w-2.5 rounded-full border-2 ${
                                done
                                  ? 'bg-[#e8c46a] border-[#8a653f]'
                                  : 'bg-[#232120] border-[#3b382f]'
                              }`}
                            />

                            <div
                              className={`flex flex-col gap-0.5 rounded-lg border px-2 py-1.5 ${
                                done ? 'bg-[#241f16] border-[#5b4c33]' : 'bg-[#1b1a18] border-[#2b2926]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-serif font-bold text-[11px] sm:text-xs truncate ${
                                    done ? 'text-[#e8cf9a]' : 'text-[#6f6961]'
                                  }`}
                                >
                                  {a.name}
                                </span>
                                <span
                                  className={`ml-auto text-[10px] font-mono px-1 py-px rounded border flex-shrink-0 ${
                                    done
                                      ? 'bg-[#3b3327] border-[#6b5a3f] text-[#c9a86a]'
                                      : 'bg-[#232120] border-[#302d29] text-[#6b655c]'
                                  }`}
                                >
                                  {done ? '已达成' : '未达成'}
                                </span>
                              </div>

                              {/* 达成条件 */}
                              <div
                                className={`text-[10px] font-serif ${
                                  done ? 'text-[#998e7e]' : 'text-[#5c564e]'
                                }`}
                              >
                                条件 · {a.desc}
                              </div>

                              {/* 奖励 */}
                              <div
                                className={`text-[10px] font-serif ${
                                  !done
                                    ? 'text-[#5c564e]'
                                    : a.critMultiplier
                                      ? 'text-[#76d18c]'
                                      : 'text-[#c9a86a]'
                                }`}
                              >
                                奖励 · {rewardText(a)}
                              </div>

                              {/* 进度 */}
                              <div
                                className={`text-[10px] font-mono ${
                                  done ? 'text-[#8a7a63]' : 'text-[#544e46]'
                                }`}
                              >
                                {p.text}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};
