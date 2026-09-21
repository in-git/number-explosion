import React from 'react';
import { BookOpen, Database, User } from 'lucide-react';
import { useModals } from '../context/GameContext';

/** 设置面板：仅保留三个入口，各自打开独立弹窗 */
export const SettingsModal: React.FC = () => {
  const modals = useModals();

  if (!modals.settings.isOpen) return null;

  const entries: {
    id: string;
    title: string;
    desc: string;
    Icon: typeof User;
    onClick: () => void;
  }[] = [
    {
      id: 'author',
      title: '作 者',
      desc: '署名与作品信息',
      Icon: User,
      onClick: modals.author.open,
    },
    {
      id: 'help',
      title: '帮 助',
      desc: '修真指引 · 玩法说明',
      Icon: BookOpen,
      onClick: modals.help.open,
    },
    {
      id: 'edit-data',
      title: '修 改 数 据',
      desc: '数值 / 点数设定与重置',
      Icon: Database,
      onClick: modals.editData.open,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={modals.settings.close}
    >
      <div
        className="relative w-full max-w-md my-auto bg-[#1a1715] border-2 border-[#473e32] rounded-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none border border-[#302921] rounded-lg" />

        {/* 顶栏：标题 + 关闭 */}
        <div className="relative flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#362f25]">
          <div>
        
            <h3 className="text-lg sm:text-xl font-bold font-serif text-[#ebdcc5] tracking-wider">
              设 置
            </h3>
          </div>
          <button
            id="btn-modal-close-settings"
            onClick={modals.settings.close}
            aria-label="关闭"
            className="px-3 py-1 rounded text-[11px] font-serif text-[#a69c8c] bg-[#241f1a] hover:bg-[#2e2821] border border-[#3b3429] cursor-pointer transition-colors"
          >
            关闭
          </button>
        </div>

        {/* 三个入口 */}
        <div className="relative flex flex-col gap-2">
          {entries.map((e) => (
            <button
              key={e.id}
              id={`btn-settings-${e.id}`}
              onClick={e.onClick}
              className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border-2 border-[#332e27] bg-[#1a1816] hover:border-[#5b5142] active:translate-y-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] cursor-pointer transition-all text-left"
            >
              <div className="min-w-0">
                <div className="text-sm font-serif font-bold tracking-[0.2em] text-[#ded7cb] whitespace-nowrap">
                  {e.title}
                </div>
                <div className="mt-0.5 text-[10px] font-serif text-[#8a7a63] truncate">{e.desc}</div>
              </div>
              <e.Icon size={18} className="text-[#8c8273] flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
