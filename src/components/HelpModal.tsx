import React from 'react';
import { ModalShell } from './ModalShell';
import { useModals } from '../context/GameContext';
// 帮助内容 = 项目根目录的 README.md（单一来源，改 README 即改游戏内帮助）
import readme from '../../README.md?raw';

/** 帮助分块：标题（README 开头的一级标题下无小节名，故可空）+ 逐条正文 */
interface HelpBlock {
  title: string | null;
  lines: string[];
}

/**
 * 极简 Markdown 解析：README 只用到「# / ## 标题」「- 列表」「空行分段」，
 * 故按行切分即可，无需引入完整 Markdown 解析器（保持零依赖）。
 * - 一级标题跳过（弹窗顶栏已有「帮 助」）
 * - 有序 / 无序列表一律作为一行渲染
 */
function parseReadme(md: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];
  let current: HelpBlock = { title: null, lines: [] };

  const flush = () => {
    if (current.title !== null || current.lines.length > 0) blocks.push(current);
  };

  md.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flush();
      current = { title: line.slice(3).trim(), lines: [] };
      return;
    }
    if (line.startsWith('# ') || line === '') return;
    current.lines.push(line.startsWith('- ') ? line.slice(2).trim() : line);
  });
  flush();

  return blocks;
}

const BLOCKS = parseReadme(readme);

const URL_RE = /(https?:\/\/[^\s)]+)/g;
const BOLD_RE = /(\*\*[^*]+\*\*)/g;

/** 行内格式：裸露链接可点、**加粗** 高亮 */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(URL_RE).map((seg, i) =>
      i % 2 === 1 ? (
        <a
          key={i}
          href={seg}
          target="_blank"
          rel="noreferrer"
          className="text-[#8fb6e0] underline underline-offset-2 break-all"
        >
          {seg}
        </a>
      ) : (
        <React.Fragment key={i}>
          {seg.split(BOLD_RE).map((chunk, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-bold text-[#e8cf9a]">
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={j}>{chunk}</React.Fragment>
            )
          )}
        </React.Fragment>
      )
    )}
  </>
);

export const HelpModal: React.FC = () => {
  const modals = useModals();

  return (
    <ModalShell
      isOpen={modals.help.isOpen}
      onClose={modals.help.close}
      title="帮 助"
      subtitle="—— 修 真 指 引 · 由 浅 入 深 ——"
    >
      <div className="flex flex-col gap-2.5">
        {BLOCKS.map((block, idx) => (
          <div
            key={`${block.title ?? 'intro'}-${idx}`}
            className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5"
          >
            {block.title && (
              <div className="text-[11px] sm:text-xs font-serif font-bold tracking-[0.14em] text-[#e8cf9a] mb-1.5">
                {block.title}
              </div>
            )}
            <div className="flex flex-col gap-1 text-[11px] font-serif leading-relaxed text-[#948a7a]">
              {block.lines.map((line, i) => (
                <div key={`${i}-${line}`}>
                  <Inline text={line} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5 text-[11px] font-serif leading-relaxed text-[#8f8574]">
          如需清空存档从头再来，请移步「设置 → 重修道途」。
        </div>
      </div>
    </ModalShell>
  );
};
