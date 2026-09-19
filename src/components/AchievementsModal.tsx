import React, { useState } from 'react';
import { GameState } from '../types';
import { ACHIEVEMENTS } from '../config';
import { ModalShell } from './ModalShell';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
}

type Filter = 'all' | 'done' | 'todo';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'done', label: '已完成' },
  { key: 'todo', label: '未完成' },
];

const fmt = (n: number) => n.toLocaleString('zh-CN');

/** 成就面板：网格一排 3 个，支持按完成状态筛选 */
export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  const [filter, setFilter] = useState<Filter>('all');

  const unlocked = new Set(state.unlockedAchievements || []);
  const totalClicks = state.totalClickCount || 0;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  const shown = ACHIEVEMENTS.filter((a) => {
    if (filter === 'done') return unlocked.has(a.id);
    if (filter === 'todo') return !unlocked.has(a.id);
    return true;
  });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="成就"
      subtitle={`累计点击 ${fmt(totalClicks)} 次 · 已达成 ${unlockedCount} / ${ACHIEVEMENTS.length}`}
    >
      {/* 筛选栏 */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#2d2822]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            id={`btn-achievement-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`text-[11px] font-serif px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              filter === f.key
                ? 'text-[#e8dcc6] border-[#6b5e4c] bg-[#3b3327]'
                : 'text-[#7d7364] border-[#2b2721] hover:border-[#453a2d] hover:text-[#b8aa98]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 成就网格：一排 3 个 */}
      {shown.length === 0 ? (
        <div className="text-[11px] text-[#7d7364] font-serif text-center py-6">
          —— 暂无符合条件的成就 ——
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {shown.map((a) => {
            const done = unlocked.has(a.id);

            return (
              <div
                key={a.id}
                id={`achievement-item-${a.id}`}
                className={`flex flex-col gap-0.5 p-2 rounded-lg border ${
                  done ? 'bg-[#241f16] border-[#6b5a3f]' : 'bg-[#211f1c] border-[#383229]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`font-serif font-bold text-[11px] sm:text-xs truncate ${
                      done ? 'text-[#e8cf9a]' : 'text-[#ded7cb]'
                    }`}
                  >
                    {a.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1 py-px rounded border flex-shrink-0 ml-auto ${
                      done
                        ? 'bg-[#3b3327] border-[#6b5a3f] text-[#c9a86a]'
                        : 'bg-[#2a2620] border-[#3e372c] text-[#8f8574]'
                    }`}
                  >
                    {done ? '已完成' : '未完成'}
                  </span>
                </div>

                <div className="text-[10px] text-[#998e7e] font-serif truncate">{a.desc}</div>

                <div className="text-[10px] font-serif text-[#c9a86a] truncate">
                  重生初始数值 +{fmt(a.rebirthStartValue)}
                </div>

                <div className="text-[10px] font-mono text-[#8a7a63]">
                  {fmt(Math.min(totalClicks, a.requiredClicks))} / {fmt(a.requiredClicks)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
};
