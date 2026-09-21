import React, { useEffect, useMemo, useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { BigNumData, GameState, UserAccountData } from '../types';
import { useGameActions, useGameData } from '../context/GameContext';
import { AuthPanel } from './AuthPanel';
import { calculateGameAttributes } from '../utils/gameMath';
import { formatDuration } from '../utils/serverTime';
import {
  LeaderboardEntry,
  LeaderboardId,
  LeaderboardResponse,
  PlayerProfile,
  SELF_USER_ID,
  fetchLeaderboard,
  submitScore,
} from '../utils/leaderboardApi';
import { fetchRegions } from '../utils/authApi';
import { leaderboardSocket } from '../utils/leaderboardSocket';
import { canAscendRank } from '../utils/title';

/** tabbar：数值排行 / 富豪排行 在前，其后时长、重生、连点 */
const BOARD_TABS: { id: LeaderboardId; label: string }[] = [
  { id: 'value', label: '数值排行' },
  { id: 'wealth', label: '富豪排行' },
  { id: 'playTime', label: '时长排行' },
  { id: 'rebirth', label: '重生排行' },
  { id: 'clicks', label: '连点排行' },
];

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
  if (board === 'value' || board === 'wealth') return n.formatChinese(2);
  if (board === 'playTime') return formatDuration(n.toNumber());
  return `${Math.floor(n.toNumber()).toLocaleString('zh-CN')} 次`;
}

/** 本人成绩 */
function selfScore(board: LeaderboardId, state: GameState): BigNumData {
  if (board === 'value') return state.highestValue;
  if (board === 'playTime') return BigNum.fromNumber(state.playTimeMs || 0).toData();
  if (board === 'clicks') return BigNum.fromNumber(state.totalClickCount || 0).toData();
  return BigNum.fromNumber(state.rebirthCount || 0).toData();
}

/** 档案条目 */
const ProfileItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[#7d7364]">{label}</span>
    <span className="font-mono text-[#cbbfa9]">{value}</span>
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
    </div>
  </div>
);

/** 本座档案：昵称置顶，账号与密码均可修改（仅登录后展示） */
const AccountEditor: React.FC<{
  account: UserAccountData;
  onSave: (
    patch: Partial<Pick<UserAccountData, 'nickname' | 'userName' | 'password'>>
  ) => void;
}> = ({ account, onSave }) => {
  const [nickname, setNickname] = useState(account.nickname);
  const [userName, setUserName] = useState(account.userName);
  const [password, setPassword] = useState(account.password);
  const [showPwd, setShowPwd] = useState(false);

  const dirty =
    nickname !== account.nickname ||
    userName !== account.userName ||
    password !== account.password;

  const handleSave = () => {
    const finalNick = nickname.trim();
    const finalUser = userName.trim();
    const finalPwd = password.trim();
    if (finalNick === '' || finalUser === '' || finalPwd === '') return;
    onSave({ nickname: finalNick, userName: finalUser, password: finalPwd });
    setNickname(finalNick);
    setUserName(finalUser);
    setPassword(finalPwd);
  };

  const inputCls =
    'flex-1 min-w-0 px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm text-[#e3ded4] outline-none focus:border-[#5b8db8]';

  return (
    <div className="rounded-lg border border-[#6b5a3f] bg-[#241f16] p-2.5 flex flex-col gap-2">
      <div className="text-[11px] font-serif text-[#c9a86a]">本座档案</div>

      {/* 昵称：置顶，展示在排行榜上 */}
      <div>
        <div className="text-[10px] font-serif text-[#8fa6bd] mb-1">昵称（排行榜展示）</div>
        <input
          id="rank-nickname-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          className={inputCls + ' font-serif'}
        />
      </div>

      {/* 账号 */}
      <div>
        <div className="text-[10px] font-serif text-[#8fa6bd] mb-1">账号</div>
        <input
          id="rank-username-input"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className={inputCls + ' font-mono'}
        />
      </div>

      {/* 密码 */}
      <div>
        <div className="text-[10px] font-serif text-[#8fa6bd] mb-1">密码</div>
        <div className="flex items-center gap-1.5">
          <input
            id="rank-password-input"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls + ' font-mono'}
          />
          <button
            id="btn-rank-toggle-pwd"
            onClick={() => setShowPwd((v) => !v)}
            className="px-2 py-1.5 rounded border border-[#3b3429] bg-[#1a1816] hover:border-[#5b5142] text-[10px] font-serif text-[#a69c8c] cursor-pointer flex-shrink-0"
          >
            {showPwd ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      <button
        id="btn-rank-save-account"
        onClick={handleSave}
        disabled={!dirty}
        className="w-full py-2 rounded-lg border-2 border-[#8a653f] bg-[#543b23] hover:bg-[#694a2c] text-xs font-serif font-bold text-[#f5ebd7] cursor-pointer active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        保 存
      </button>
    </div>
  );
};

/** 排行榜：数据全部来自后端接口（GET /api/leaderboard） */
export const Ranking: React.FC = () => {
  const { state } = useGameData();
  const {
    handleLogin: onLogin,
    handleLogout: onLogout,
    handleSelectRegion: onRegionSelected,
    handleUpdateAccount,
  } = useGameActions();

  const [board, setBoard] = useState<LeaderboardId>('value');
  const [showAuth, setShowAuth] = useState(false);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  // 进入排行即确定默认大区：取最新（最后一个）大区
  const [defaultRegion, setDefaultRegion] = useState<{ id: string; name: string } | null>(null);

  const attrs = calculateGameAttributes(state);
  const myScore = selfScore(board, state);

  const selfEntry = useMemo<Omit<LeaderboardEntry, 'rank'>>(
    () => ({
      userId: state.account?.userId ?? SELF_USER_ID,
      userName: state.account?.nickname || state.account?.userName || '我',
      value: myScore,
      profile: {
        userId: state.account?.userId ?? SELF_USER_ID,
        userName: state.account?.nickname || state.account?.userName || '我',
        critChance: attrs.critChance,
        critMultiplier: attrs.critMultiplier,
        comboChance: attrs.comboChance,
        comboMultiplier: attrs.comboMultiplier,
        rebirthCount: state.rebirthCount || 0,
        collapsePoints: state.collapsePoints || 0,
        playTimeMs: state.playTimeMs || 0,
   
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      attrs.critChance,
      attrs.critMultiplier,
      attrs.comboChance,
      attrs.comboMultiplier,
      state.rebirthCount,
      state.collapsePoints,
      state.playTimeMs,
      state.highestValue.m,
      state.highestValue.e,

    ]
  );

  // 点入排行：已登录则上传一次个人数据
  useEffect(() => {
    const account = state.account;
    if (!account) return;
    submitScore({
      userId: account.userId,
      userName: account.userName,
      playTimeMs: state.playTimeMs || 0,
      rebirthCount: state.rebirthCount || 0,
      clickCount: state.totalClickCount || 0,
      highestValue: state.highestValue,
      token: account.token,
    }).catch(() => {
      /* 上报失败不影响浏览榜单 */
    });
    // 仅在进入排行时上报一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 离开排行（弹窗关闭即卸载）：彻底断开长连接并停掉重连定时器，
  // 否则 current 仍在，后台会一直按指数退避重连
  useEffect(() => () => leaderboardSocket.unsubscribe(), []);

  // 点入排行：拉取大区并默认加入最新大区
  useEffect(() => {
    let cancelled = false;
    fetchRegions()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        const last = list[list.length - 1];
        setDefaultRegion({ id: last.id, name: last.name });
      })
      .catch(() => {
        /* 大区拉取失败时保持未选区状态 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 成绩变化的标记：仅在自身成绩变动时重新拉取
  const scoreKey = `${board}|${myScore.m}|${myScore.e}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // 订阅长连接：服务端数据变更时自动推送，无需轮询
    const listener = (res: LeaderboardResponse) => {
      if (!cancelled && res.board === board) setData(res);
    };

    fetchLeaderboard(board, selfEntry, listener)
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

    return () => {
      cancelled = true;
      leaderboardSocket.off(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey]);

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
      {/* 本座档案：昵称置顶，账号与密码可修改（登录后展示） */}
      {state.account && (
        <AccountEditor
          account={state.account}
          onSave={(patch) => {
            handleUpdateAccount(patch);
            // 昵称 / 账号变更后重新上报，使榜单显示同步
            const next = { ...state.account!, ...patch };
            submitScore({
              userId: next.userId,
              userName: next.userName,
              playTimeMs: state.playTimeMs || 0,
              rebirthCount: state.rebirthCount || 0,
              clickCount: state.totalClickCount || 0,
              highestValue: state.highestValue,
              token: next.token,
            }).catch(() => {
              /* 上报失败不影响本地修改 */
            });
          }}
        />
      )}

      {/* tabbar：数值 / 富豪 / 时长 / 重生 / 连点 */}
      <div className="grid grid-cols-5 gap-1.5">
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
