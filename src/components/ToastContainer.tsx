import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* 与主体容器同宽（max-w-md） */}
      <div className="w-full max-w-md px-4 flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto w-full flex items-start gap-3 p-3.5 rounded-lg bg-[#24201c] border-2 border-[#574938] text-[#e8ded1] shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
            style={{
              animation: 'slideUpIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <Sparkles size={16} className="text-[#d49e5d] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-serif font-bold text-xs sm:text-sm text-[#f5ebd7] tracking-wider mb-0.5">
                {t.title}
              </div>
              {t.content ? (
                <div className="font-serif text-xs text-[#b8ab9a] leading-relaxed">
                  {t.content}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-[#786c5c] hover:text-[#d4c6b2] leading-none p-1 cursor-pointer flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
