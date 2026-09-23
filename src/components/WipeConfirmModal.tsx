import React, { useState } from 'react';
import { useGameActions, useGameData, useModals } from '../context/GameContext';

/**
 * 重置游戏数据：高危二次确认弹窗。
 * 与「重修道途」（仅清本地存档）不同，此项在登录状态下会：
 * 1) 注销云端账号 —— 账号、云存档、排行榜成绩一并删除，令牌随即失效；
 * 2) 清空本地存档并重载页面。
 * 未登录时仅清本地存档。
 */
export const WipeConfirmModal: React.FC = () => {
  const modals = useModals();
  const { state } = useGameData();
  const { wipeAllData } = useGameActions();
  const isLoggedIn = !!state.account;
  const [busy, setBusy] = useState(false);

  if (!modals.wipeConfirm.isOpen) return null;

  /** 确认清除：执行期间弹窗锁定，页面随本地清除完成自动重载 */
  const onConfirm = () => {
    if (busy) return;
    setBusy(true);
    void wipeAllData();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={busy ? undefined : modals.wipeConfirm.close}
    >
      <div
        className="relative w-[90%] max-w-md flex flex-col bg-[#141210] border-2 border-[#7a3a3a] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 px-5 py-7 text-center">
          <div className="text-[11px] font-serif tracking-[0.3em] text-[#8a7a63]">
            —— 万 般 数 据 · 一 朝 成 空 ——
          </div>

          <div
            className="mt-4 font-serif font-bold text-2xl sm:text-3xl tracking-[0.24em] text-[#f2d0d0]"
            style={{ textShadow: '0 2px 18px rgba(232,106,106,0.55), 0 2px 6px rgba(0,0,0,0.95)' }}
          >
            重 置 游 戏 数 据
          </div>

          <p className="mt-5 text-[12px] sm:text-[13px] font-serif leading-loose text-[#cbbfa9]">
            {isLoggedIn ? (
              <>
                将彻底清除你的一切数据：本地存档与全部进度，以及云端账号、云存档、
                排行榜成绩（当前账号将被注销，登录凭证随之失效）。
              </>
            ) : (
              <>将清空本地存档与全部进度（当前未登录，不涉及云端数据）。</>
            )}
          </p>

          <p className="mt-2 text-[12px] font-serif font-bold leading-loose text-[#c9867a]">
            此操作不可恢复，确定要继续吗？
          </p>
        </div>

        <div className="px-4 py-3 border-t border-[#362f25] bg-[#1a1715] flex items-center justify-end gap-2">
          <button
            id="btn-wipe-cancel"
            onClick={modals.wipeConfirm.close}
            aria-label="取消"
            disabled={busy}
            className="text-sm font-serif tracking-widest px-4 py-1.5 rounded-lg border border-[#3b3429] bg-[#241f1a] text-[#a69c8c] hover:bg-[#2e2821] cursor-pointer transition-colors disabled:opacity-50"
          >
            取 消
          </button>
          <button
            id="btn-wipe-confirm"
            onClick={onConfirm}
            aria-label="确认清除"
            disabled={busy}
            className="text-sm font-serif tracking-widest px-4 py-1.5 rounded-lg bg-[#3d1f1f] border border-[#7a3a3a] text-[#e8c4c4] hover:border-[#b25454] active:translate-y-0.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            {busy ? '清 除 中…' : '确 认 清 除'}
          </button>
        </div>
      </div>
    </div>
  );
};
