import React from 'react';
import { BookOpen, CircleUserRound, Github, Trash2, Tv, User, Wrench } from 'lucide-react';
import { useModals } from '../context/GameContext';

/** 外链入口 */
const GITHUB_URL = 'https://github.com/in-git/number-explosion';
const BILIBILI_URL = 'https://space.bilibili.com/3706965849016893?spm_id_from=333.1007.0.0';

/**
 * 设置面板：入口一览。
 * 注：「修改数据」的入口已隐藏（弹窗与开关仍保留在 useGameModals / GameModals 中，
 * 需要调试时把那条例目挂回来即可）。
 */
export const SettingsModal: React.FC = () => {
  const modals = useModals();

  if (!modals.settings.isOpen) return null;

  const entries: {
    id: string;
    title: string;
    desc: string;
    Icon: typeof User;
    /** 二选一：onClick 打开弹窗，href 在新标签页打开外链 */
    onClick?: () => void;
    href?: string;
    /** 高危项：红色警示样式（如「重置游戏数据」） */
    danger?: boolean;
  }[] = [
    {
      id: 'personal-center',
      title: '个 人 中 心',
      desc: '账号信息 · 登录 / 退出',
      Icon: CircleUserRound,
      onClick: modals.userCenter.open,
    },
    {
      id: 'help',
      title: '帮 助',
      desc: '有部分剧透，介意勿入',
      Icon: BookOpen,
      onClick: modals.help.open,
    },
    {
      id: 'bilibili',
      title: 'B 站',
      desc: '有问题可在B站私信',
      Icon: Tv,
      href: BILIBILI_URL,
    },
    {
      id: 'edit-data',
      title: '修 改 数 据',
      desc: '逆天改命 · 数值与点数',
      Icon: Wrench,
      onClick: modals.editData.open,
    },
    {
      id: 'github',
      title: '开 源 地 址',
      desc: '源码托管 · 版本与反馈',
      Icon: Github,
      href: GITHUB_URL,
    },
    {
      id: 'wipe-all',
      title: '重 置 游 戏 数 据',
      desc: '彻底清除本地与云端数据 · 不可恢复',
      Icon: Trash2,
      onClick: modals.wipeConfirm.open,
      danger: true,
    },
  ];

  const entryClass =
    'flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border-2 border-[#332e27] bg-[#1a1816] hover:border-[#5b5142] active:translate-y-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] cursor-pointer transition-all text-left';
  // 高危项（重置游戏数据）：红色警示，与常规入口拉开视觉距离
  const dangerClass =
    'flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border-2 border-[#5a2f2f] bg-[#1a1412] hover:border-[#8a4040] active:translate-y-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] cursor-pointer transition-all text-left';

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

        {/* 入口列表：个人中心 / 帮助 / B 站 / 开源地址 */}
        <div className="relative flex flex-col gap-2">
          {entries.map((e) => {
            const inner = (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-serif font-bold tracking-[0.2em] text-[#ded7cb] whitespace-nowrap">
                    {e.title}
                  </div>
                  <div className="mt-0.5 text-[10px] font-serif text-[#8a7a63] truncate">
                    {e.desc}
                  </div>
                </div>
                <e.Icon
                  size={18}
                  className={`flex-shrink-0 ${e.danger ? 'text-[#b25454]' : 'text-[#8c8273]'}`}
                />
              </>
            );

            return e.href ? (
              <a
                key={e.id}
                id={`btn-settings-${e.id}`}
                href={e.href}
                target="_blank"
                rel="noreferrer"
                className={entryClass}
              >
                {inner}
              </a>
            ) : (
              <button
                key={e.id}
                id={`btn-settings-${e.id}`}
                onClick={e.onClick}
                className={e.danger ? dangerClass : entryClass}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
