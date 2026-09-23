import React, { useEffect, useMemo, useState } from 'react';
import { GameState, UserAccountData } from '../types';
import { calculateGameAttributes } from '../utils/gameMath';
import { DEFAULT_NICKNAME } from '../config';
import {
  UserAccount,
  Region,
  generateCredentials,
  login,
  selectRegion,
  fetchRegions,
} from '../utils/authApi';

interface AuthPanelProps {
  state: GameState;
  /** 大区列表（由上层传入，缺省时自行拉取） */
  regions?: Region[];
  /** 上层默认大区（拉取失败时的兜底） */
  defaultRegionId?: string | null;
  defaultRegionName?: string | null;
  /** 注册/登录成功 */
  onLogin: (account: UserAccountData) => void;
  /** 入驻大区成功 */
  onRegionSelected: (regionId: string, regionName: string) => void;
  /** 返回来源页（排行榜 / 个人中心） */
  onBack: () => void;
  /** 返回按钮文案（默认「返回」） */
  backLabel?: string;
  /**
   * 注册/登录成功后的回调；缺省时沿用 onBack 回到来源页。
   * 个人中心传入空实现即可原地停留，直接展示账号信息。
   */
  onSuccess?: () => void;
}

const CARD = 'rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5';

/**
 * 登录注册：账号 / 密码手动输入，昵称必填（展示在排行榜上），并可手动选择大区。
 * 后端 /auth/login 对不存在的账号会自动注册，所以「登录」按钮同时覆盖登录与注册：
 *  - 账号已存在且密码正确 → 登录
 *  - 账号不存在 → 以输入的账号密码自动创建
 *  - 账号已存在但密码错误 → 报错
 * 注册 / 登录只创建账号并入驻所选大区，不等于登榜；
 * 登榜由服务端控制：有真实游玩成绩后自动出现在榜上。
 */
export const AuthPanel: React.FC<AuthPanelProps> = ({
  state,
  regions: regionsProp,
  defaultRegionId,
  defaultRegionName,
  onLogin,
  onRegionSelected,
  onBack,
  backLabel = '返回',
  onSuccess,
}) => {
  const history = state.lastCredentials;

  // 大区列表：优先上层传入，缺省时自行拉取
  const [regions, setRegions] = useState<Region[]>(regionsProp ?? []);
  const [regionId, setRegionId] = useState<string>(
    defaultRegionId ?? (regionsProp?.length ? regionsProp[regionsProp.length - 1].id : '')
  );

  // 账号密码：有历史记录则预填，便于老玩家一键登录；否则留空手动输入
  const [account, setAccount] = useState(history?.userName ?? '');
  const [password, setPassword] = useState(history?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState(
    state.account?.nickname || history?.nickname || DEFAULT_NICKNAME
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (regionsProp && regionsProp.length) return;
    fetchRegions()
      .then((list) => {
        if (cancelled || !list.length) return;
        setRegions(list);
        setRegionId((prev) => prev || list[list.length - 1].id);
      })
      .catch(() => setError('大区列表获取失败，将使用默认大区'));
    return () => {
      cancelled = true;
    };
  }, [regionsProp]);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === regionId) ?? null,
    [regions, regionId]
  );

  const isHistory =
    !!history && account === history.userName && password === history.password;

  const handleSubmit = async () => {
    const name = account.trim();
    if (!name) {
      setError('请输入账号');
      return;
    }
    if (name.length > 20) {
      setError('账号长度不能超过 20 字符');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 4) {
      setError('密码至少 4 位');
      return;
    }
    if (!regionId) {
      setError('请选择大区');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 登录（不存在则自动注册）
      const acc: UserAccount = await login(name, password);
      onLogin({
        userId: acc.userId,
        userName: acc.userName,
        nickname: acc.nickname,
        password: acc.password,
        token: acc.token,
        regionId: null,
        regionName: null,
      });

      // 入驻所选大区：同时上报昵称与当前成绩
      const attrs = calculateGameAttributes(state);
      try {
        await selectRegion(
          {
            userId: acc.userId,
            userName: acc.userName,
            nickname: nickname.trim() || DEFAULT_NICKNAME,
            regionId,
            critChance: attrs.critChance,
            critMultiplier: attrs.critMultiplier,
            comboChance: attrs.comboChance,
            comboMultiplier: attrs.comboMultiplier,
            rebirthCount: state.rebirthCount || 0,
            collapsePoints: state.collapsePoints || 0,
            playTimeMs: state.playTimeMs || 0,
            clickCount: state.totalClickCount || 0,
            highestValue: state.highestValue,
            gameCleared: state.gameCleared,
          },
          acc.token
        );
        onRegionSelected(regionId, selectedRegion?.name ?? regionId);
      } catch (upErr) {
        const msg = upErr instanceof Error ? upErr.message : String(upErr);
        setError(`账号已创建，但入驻大区失败：${msg}`);
        setLoading(false);
        return;
      }

      (onSuccess ?? onBack)();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(isHistory ? `登录失败 · ${msg}` : `操作失败 · ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = () => {
    setError(null);
    const c = generateCredentials();
    setAccount(c.userName);
    setPassword(c.password);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* 昵称：展示在排行榜上 */}
      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">
          昵称（显示在排行榜上）
        </div>
        <input
          id="auth-nickname-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          placeholder={DEFAULT_NICKNAME}
          className="w-full px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm text-[#e3ded4] font-serif outline-none focus:border-[#5b8db8]"
        />
        <div className="text-[10px] font-serif text-[#7d7364] mt-0.5">
          留空则使用默认昵称 · 入驻后可在个人中心修改
        </div>
      </div>

      {/* 账号 */}
      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">
          账号 / 道号{history ? '（已记住历史账号）' : ''}
        </div>
        <input
          id="auth-account-input"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          maxLength={20}
          autoComplete="username"
          placeholder="输入账号"
          className="w-full px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm font-mono text-[#e3ded4] outline-none focus:border-[#5b8db8]"
        />
      </div>

      {/* 密码 */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-serif text-[#8fa6bd]">密码 / 秘语</span>
          <button
            type="button"
            id="btn-toggle-password"
            onClick={() => setShowPassword((v) => !v)}
            className="text-[10px] font-serif text-[#8a7a63] hover:text-[#c9a86a] cursor-pointer"
          >
            {showPassword ? '隐藏' : '显示'}
          </button>
        </div>
        <input
          id="auth-password-input"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="输入密码（至少 4 位）"
          className="w-full px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm font-mono text-[#e3ded4] outline-none focus:border-[#5b8db8]"
        />
      </div>

      {/* 大区选择 */}
      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">入驻大区</div>
        {regions.length > 0 ? (
          <select
            id="sel-region"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm font-serif text-[#e3ded4] outline-none focus:border-[#5b8db8]"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}（在线 {r.online}）
              </option>
            ))}
          </select>
        ) : (
          <div className="font-mono text-[11px] text-[#cbbfa9]">
            {defaultRegionName ?? (defaultRegionId ? defaultRegionId : '加载中…')}
          </div>
        )}
        <div className="text-[10px] font-serif text-[#7d7364] mt-0.5">
          选择大区入驻 · 有真实游玩成绩后由服务端自动上榜
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#5a2f2f] bg-[#261b1b] px-2.5 py-2 text-center text-[11px] font-serif text-[#d99797]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          id="btn-auth-back"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-lg border border-[#3b3429] bg-[#241f1a] hover:bg-[#2e2821] text-xs font-serif text-[#a69c8c] cursor-pointer"
        >
          {backLabel}
        </button>
        <button
          id="btn-auth-random"
          onClick={handleRandom}
          className="flex-1 py-2.5 rounded-lg border border-[#3b3429] bg-[#1a1816] hover:border-[#5b5142] text-xs font-serif text-[#a69c8c] cursor-pointer"
        >
          随机生成
        </button>
        <button
          id="btn-auth-login"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg border-2 border-[#8a653f] bg-[#543b23] hover:bg-[#694a2c] text-xs font-serif font-bold text-[#f5ebd7] cursor-pointer active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '登录中…' : isHistory ? '登 录' : '登 录 / 注 册'}
        </button>
      </div>
    </div>
  );
};
