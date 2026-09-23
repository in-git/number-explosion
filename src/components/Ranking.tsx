import React, { useEffect, useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { BigNumData } from '../types';
import { useGameActions, useGameData } from '../context/GameContext';
import { AuthPanel } from './AuthPanel';
import { formatDuration } from '../utils/serverTime';
import {
  LeaderboardEntry,
  LeaderboardId,
  LeaderboardResponse,
  PlayerProfile,
  SELF_USER_ID,
  fetchLeaderboard,
} from '../utils/leaderboardApi';
import { useDefaultRegion } from '../hooks/useDefaultRegion';
import { canAscendRank } from '../utils/title';

/** tabbar：数值排行 在前，其后时长、重生、连点 */
const BOARD_TABS: { id: LeaderboardId; label: string }[] = [
  { id: 'value', label: '数值排行' },
  { id: 'playTime', label: '时长排行' },
  { id: 'rebirth', label: '重生排行' },
  { id: 'clicks', label: '连点排行' },
];

/** 榜单刷新间隔（ms）：数据变更不再推送，改为打开排行期间静默轮询 */
const REFRESH_INTERVAL_MS = 10_000;

/** 前三名序号配色：金 / 银 / 铜 */
const rankColor = (rank: number) =>
  rank === 1
    ? 'text-[#e8c46a]'
    : rank === 2
      ? 'text-[#cbd5e1]'
      : rank === 3
        ? 'text-[#d08a4a]'
        : 'text-[#8a7a63]';

/** 成绩格式化 */
function formatScore(board: LeaderboardId, value: BigNumData): string {
  const n = BigNum.fromData(value);
  if (board === 'value') return n.formatChinese(2);
  if (board === 'playTime') return formatDuration(n.toNumber());
  return `${Math.floor(n.toNumber()).toLocaleString('zh-CN')} 次`;
}

/** 档案条目 */
const ProfileItem: React.FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass,
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[#7d7364]">{label}</span>
    <span className={`font-mono ${valueClass ?? 'text-[#cbbfa9]'}`}>{value}</span>
  </div>
);

/** 玩家详情卡 */
const ProfileCard: React.FC<{ name: string; profile: PlayerProfile }> = ({ name, profile }) => (
  <div className="rounded-lg border border-[#6b5a3f] bg-[#241f16] p-2.5">
    <div className="flex items-center justify-between mb-1.5">
      <span className="font-serif font-bold text-xs text-[#e8cf9a] truncate">{name} · 道体详情</span>
    </div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-serif">
      <ProfileItem label="暴击率" value={`${(profile.critChance * 100).toFixed(1)}%`} />
      <ProfileItem label="暴击倍数" value={`${(profile.critMultiplier * 100).toFixed(0)}%`} />
      <ProfileItem label="连击率" value={`${(profile.comboChance * 100).toFixed(1)}%`} />
      <ProfileItem label="连击倍数" value={`${(profile.comboMultiplier * 100).toFixed(0)}%`} />
      <ProfileItem label="重生次数" value={`${profile.rebirthCount.toLocaleString('zh-CN')} 次`} />
      <ProfileItem label="坍缩重数" value={`${BigNum.fromNumber(profile.collapsePoints).formatChinese(0)} 重`} />
      <ProfileItem label="游玩时长" value={formatDuration(profile.playTimeMs)} />
      <ProfileItem
        label="通关"
        value={profile.gameCleared ? '已通关' : '未通关'}
        valueClass={profile.gameCleared ? 'text-[#e8c46a] font-bold' : 'text-[#7d7364]'}
      />
    </div>
  </div>
);

/** 排行榜：数据全部来自后端接口（GET /api/leaderboard） */
export const Ranking: React.FC = () => {
  const { state } = useGameData();
  const {
    handleLogin: onLogin,
    handleLogout: onLogout,
    handleSelectRegion: onRegionSelected,
  } = useGameActions();

  const [board, setBoard] = useState<LeaderboardId>('value');
  const [showAuth, setShowAuth] = useState(false);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  // 进入排行即确定默认大区（最新大区），与个人中心共用同一 Hook
  const defaultRegion = useDefaultRegion();

  /** 身份：登录 / 退出后 userId 变化，需要重新拉取（服务端据此标出本人名次） */
  const selfUserId = state.account?.userId ?? SELF_USER_ID;

  /**
   * 拉取榜单：仅在「切换榜单」「登录身份变化」或「刚上报完成」时重建。
   * 注意：绝不能依赖自身成绩——自动点击会让最高数值每帧变化，
   * 那样本效果会每帧重跑，既造成请求风暴，也会因 then 里的 setSelected(null)
   * 把刚刚展开的手风琴详情立刻收起。
   * 服务端数据变更不再有推送，改为打开排行期间每 REFRESH_INTERVAL_MS 静默轮询：
   * 轮询只替换数据、不动 selected，故展开的详情不会被收起。
   */
  useEffect(() => {
    let cancelled = false;

    /** 首次加载 / 上报后刷新：带 loading 与错误提示，并收起已展开的详情 */
    const load = () => {
      setLoading(true);
      setError(null);
      fetchLeaderboard(board, selfUserId)
        .then((res) => {
          if (cancelled) return;
          setData(res);
          setSelected(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError('天榜未通 · 暂无法取得榜单');
          setData(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    /** 轮询刷新：失败静默，保留上一次数据，避免报错闪烁 */
    const refresh = () => {
      fetchLeaderboard(board, selfUserId)
        .then((res) => {
          if (!cancelled) setData(res);
        })
        .catch(() => {
          /* 静默失败，下一轮再试 */
        });
    };

    load();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [board, selfUserId]);

  // 登录注册 / 选择大区流程
  if (showAuth) {
    return (
      <AuthPanel
        state={state}
        defaultRegionId={defaultRegion?.id ?? null}
        defaultRegionName={defaultRegion?.name ?? null}
        onLogin={onLogin}
        onRegionSelected={onRegionSelected}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* tabbar：数值 / 时长 / 重生 / 连点 */}
      <div className="grid grid-cols-4 gap-1.5">
        {BOARD_TABS.map((t) => (
          <button
            key={t.id}
            id={`btn-rank-tab-${t.id}`}
            onClick={() => setBoard(t.id)}
            aria-pressed={board === t.id}
            className={`py-1.5 rounded border text-[10px] font-serif font-bold text-center leading-tight transition-colors cursor-pointer ${
              board === t.id
                ? 'bg-[#3d3428] border-[#736450] text-[#f2ede4]'
                : 'bg-[#1a1816] border-[#2b2721] text-[#7d7364] hover:border-[#453a2d] hover:text-[#b8aa98]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-[#5a2f2f] bg-[#261b1b] px-2.5 py-2 text-center text-[11px] font-serif text-[#d99797]">
          {error}
        </div>
      )}

      {/* 榜单列表：最多 LEADERBOARD_LIMIT 条，点击查看详情 */}
      <div className="flex flex-col gap-1.5">
        {data?.entries.map((entry) => {
          const selfId = state.account?.userId ?? SELF_USER_ID;
          const isSelf = entry.userId === selfId;
          const active = selected?.userId === entry.userId;

          return (
            <div key={entry.userId} className="flex flex-col gap-1.5">
              <button
                id={`rank-entry-${entry.userId}`}
                onClick={() => setSelected(active ? null : entry)}
                aria-expanded={active}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                  isSelf
                    ? 'bg-[#241f16] border-[#6b5a3f]'
                    : active
                      ? 'bg-[#2a2620] border-[#5b5142]'
                      : 'bg-[#211f1c] border-[#383229] hover:bg-[#2a2620] hover:border-[#5b5142]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono font-bold text-sm w-5 text-left ${rankColor(entry.rank)}`}
                  >
                    {entry.rank}
                  </span>
                  <span
                    className={`font-serif font-bold text-xs sm:text-sm truncate ${
                      isSelf ? 'text-[#e8cf9a]' : 'text-[#ded7cb]'
                    }`}
                  >
                    {entry.userName}
                  </span>
                  {entry.profile.gameCleared && (
                    <span className="text-[10px] font-serif px-1 py-px rounded bg-[#3b3327] border border-[#8a653f] text-[#e8c46a] flex-shrink-0">
                      通关
                    </span>
                  )}
                  {isSelf && (
                    <span className="text-[10px] font-mono px-1 py-px rounded bg-[#3b3327] border border-[#6b5a3f] text-[#c9a86a] flex-shrink-0">
                      我
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] font-bold text-[#e8b56f] flex-shrink-0">
                  {formatScore(board, entry.value)}
                </span>
              </button>

              {/* 手风琴：点击后在该条目下方展开详情，再次点击收起 */}
              {active && <ProfileCard name={entry.userName} profile={entry.profile} />}
            </div>
          );
        })}

        {!loading && !error && (data?.entries.length ?? 0) === 0 && (
          <div className="text-[11px] text-[#7d7364] font-serif text-center py-4">
            —— 榜上无名 · 静待来者 ——
          </div>
        )}
      </div>

      {/* 底部悬浮：登顶（须达「炼气」境） */}
      <div className="sticky bottom-0 pt-2 -mx-1 px-1 pb-1">
        <button
          id="btn-rank-ascend"
          onClick={() => {
            if (state.account) {
              onLogout();
              return;
            }
            // 道行不足：下方已有门槛提示，此处不再重复提示
            if (!canAscendRank(state)) return;
            setShowAuth(true);
          }}
          className={`w-full py-3 rounded-xl border-2 text-sm font-serif font-bold tracking-[0.2em] text-[#f5ebd7] shadow-[0_6px_18px_rgba(0,0,0,0.7)] cursor-pointer active:translate-y-0.5 transition-all ${
            state.account
              ? 'border-[#5a2f2f] bg-[#3d1f1f] hover:bg-[#4d2828]'
              : canAscendRank(state)
                ? 'border-[#8a653f] bg-[#543b23] hover:bg-[#694a2c]'
                : 'border-[#4a3a3a] bg-[#2b2020] opacity-70'
          }`}
        >
          {state.account ? '退 出 登 录' : '登 顶'}
        </button>
        {!state.account && !canAscendRank(state) && (
          <div className="mt-1 text-center text-[10px] font-serif text-[#d99797]">
            登顶需达「炼气」境 · 最高数值 ≥ 1亿
          </div>
        )}
      </div>
    </div>
  );
};
