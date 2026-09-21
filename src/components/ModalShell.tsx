import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** 通用模态框：宽 95%、高 90%，居中显示，顶栏 + 可滚动内容（关闭走顶栏 X / 遮罩 / ESC） */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-[95%] h-[90%] flex flex-col bg-[#141210] border-2 border-[#473e32] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶栏 */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#362f25] bg-[#1a1715]">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold font-serif text-[#ebdcc5] tracking-wider truncate">
              {title}
            </h3>
            {subtitle && (
              <div className="text-[10px] font-serif text-[#807565] mt-0.5 truncate">
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="text-[#786c5c] hover:text-[#d4c6b2] leading-none p-1.5 cursor-pointer flex-shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        {/* 内容区：超出即滚动 */}
        <div className="flex-1 min-h-0 modal-scroll px-4 py-3">{children}</div>
      </div>
    </div>
  );
};
