import React from 'react';
import { ModalShell } from './ModalShell';
import { useModals } from '../context/GameContext';

/**
 * 作者信息：改这里即可。
 * - links：可留空数组，逐条渲染为一行「标签 · 地址」
 */
const AUTHOR = {
  /** 署名 */
  name: '无 名 散 修',
  /** 一句话题记 */
  motto: '一念起，万水千山；一念灭，沧海桑田。',
  /** 联系方式（留空则不展示） */
  contact: '',
  /** 外链（留空数组则不展示） */
  links: [] as { label: string; url: string }[],
};

export const AuthorModal: React.FC = () => {
  const modals = useModals();

  return (
    <ModalShell
      isOpen={modals.author.isOpen}
      onClose={modals.author.close}
      title="作 者"
      subtitle="—— 山 高 水 长 · 后 会 有 期 ——"
    >
      <div className="flex flex-col gap-3 text-[11px] sm:text-xs font-serif">
        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3">
          <div className="text-[10px] font-mono text-[#8f8574] mb-1">作品</div>
          <div className="text-sm sm:text-base font-bold tracking-[0.16em] text-[#ded7cb]">
            数 值 爆 炸
          </div>
          <div className="mt-1.5 leading-relaxed text-[#948a7a]">
            极具写实厚重水墨与金石质感的高阶数值放置修真模拟器
          </div>
        </div>

        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3">
          <div className="text-[10px] font-mono text-[#8f8574] mb-1">作者</div>
          <div className="text-sm sm:text-base font-bold tracking-[0.16em] text-[#e8cf9a]">
            {AUTHOR.name}
          </div>
          {AUTHOR.motto && (
            <div className="mt-1.5 leading-relaxed text-[#948a7a]">{AUTHOR.motto}</div>
          )}
        </div>

        {AUTHOR.contact && (
          <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3">
            <div className="text-[10px] font-mono text-[#8f8574] mb-1">联系</div>
            <div className="font-mono text-[#a9b6c4] break-all">{AUTHOR.contact}</div>
          </div>
        )}

        {AUTHOR.links.length > 0 && (
          <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3">
            <div className="text-[10px] font-mono text-[#8f8574] mb-1.5">相关</div>
            <div className="flex flex-col gap-1">
              {AUTHOR.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8fa6bd] hover:text-[#cfe4f2] break-all underline decoration-dotted"
                >
                  {link.label} · {link.url}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-3 leading-relaxed text-[#948a7a]">
          本作为纯前端单机放置玩法，进度存于本地浏览器；清缓存或更换设备不会同步，
          望道友自行珍重。
        </div>
      </div>
    </ModalShell>
  );
};
