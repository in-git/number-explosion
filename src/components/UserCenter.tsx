import React from 'react';
import { useGameActions, useGameData, useModals } from '../context/GameContext';
import { useDefaultRegion } from '../hooks/useDefaultRegion';
import { AuthPanel } from './AuthPanel';
import { BigNum } from '../utils/bigNumber';
import { formatDuration } from '../utils/serverTime';
import { getTitle } from '../utils/title';
import { TRIBULATION_MAX_COUNT } from '../utils/gameMath';

const CARD = 'rounded-lg border border-[#3b3429] bg-[#211d18] px-3 py-2.5';
const LABEL = 'text-[11px] font-serif text-[#8fa6bd] mb-1.5';

/** 信息行：左标签（可带说明）+ 右值 */
const InfoRow: React.FC<{ label: string; value: React.ReactNode; detail?: string }> = ({
  label,
  value,
  detail,
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="whitespace-nowrap font-serif text-[11px] text-[#948a7a]">{label}</span>
      {detail && (
        <span className="truncate font-serif text-[10px] text-[#5f5749]">{detail}</span>
      )}
    </div>
    <span className="flex-shrink-0 break-all text-right font-mono text-xs font-bold text-[#ded7cb]">
      {value}
    </span>
  </div>
);

/**
 * 个人中心：
 * - 未登录：直接复用排行榜的登录注册面板（AuthPanel），登录成功后原地切换为信息视图
 * - 已登录：展示账号基本信息 + 历世之迹，并提供退出登录
 */
export const UserCenter: React.FC = () => {
  const { state } = useGameData();
  const { handleLogin, handleLogout, handleSelectRegion } = useGameActions();
  const modals = useModals();
  const defaultRegion = useDefaultRegion();

  const account = state.account;

  // 未登录：跳转登录注册（与排行榜同一套面板与流程）
  if (!account) {
    return (
      <AuthPanel
        state={state}
        defaultRegionId={defaultRegion?.id ?? null}
        defaultRegionName={defaultRegion?.name ?? null}
        onLogin={handleLogin}
        onRegionSelected={handleSelectRegion}
        onBack={modals.userCenter.close}
        backLabel="返 回"
        onSuccess={() => {
          /* 留在个人中心：登录成功后 state.account 更新，视图自动切换为账号信息 */
        }}
      />
    );
  }

  const title = getTitle(state);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 身份：昵称 + 称号 */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-serif text-sm font-bold text-[#e8cf9a]">
            {account.nickname}
          </span>
          <span
            className="flex-shrink-0 rounded border border-[#6b5a3f] bg-[#3b3327] px-1.5 py-px text-[10px] font-serif"
            style={{ color: title.color }}
          >
            {title.name}
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-[#8a7a63]">
          道号 · {account.userName}
        </div>
      </div>

      {/* 账号信息 */}
      <div className={CARD}>
        <div className={LABEL}>账号信息</div>
        <div className="flex flex-col gap-1.5">
          <InfoRow label="账号" value={account.userName} />
          <InfoRow label="密码" value={account.password || '—'} />
          <InfoRow
            label="入驻大区"
            value={account.regionName ?? (account.regionId ? account.regionId : '未入驻')}
          />
        </div>
        <div className="mt-1.5 font-serif text-[10px] text-[#7d7364]">
          账号密码本地留存 · 换设备凭此登录即可找回进度
        </div>
      </div>

      {/* 历世之迹 */}
      <div className={CARD}>
        <div className={LABEL}>历世之迹</div>
        <div className="flex flex-col gap-1.5">
          <InfoRow
            label="最高数值"
            value={BigNum.fromData(state.highestValue).formatChinese(2)}
          />
          <InfoRow
            label="渡劫次数"
            value={`${state.tribulationCount || 0} / ${TRIBULATION_MAX_COUNT} 次`}
          />
          <InfoRow label="游玩时长" value={formatDuration(state.playTimeMs || 0)} />
          <InfoRow
            label="总点击"
            value={`${(state.totalClickCount || 0).toLocaleString('zh-CN')} 次`}
          />
        </div>
      </div>

      {/* 退出登录：退出后回到上方登录注册视图 */}
      <button
        id="btn-usercenter-logout"
        onClick={handleLogout}
        className="w-full py-2.5 rounded-lg border-2 border-[#5a2f2f] bg-[#3d1f1f] hover:bg-[#4d2828] text-xs font-serif font-bold tracking-[0.2em] text-[#f5ebd7] cursor-pointer active:translate-y-0.5 transition-all"
      >
        退 出 登 录
      </button>
    </div>
  );
};
