import React, { useState } from 'react';
import { GameState, UserAccountData } from '../types';
import { calculateGameAttributes } from '../utils/gameMath';
import { DEFAULT_NICKNAME } from '../config';
import {
  UserAccount,
  generateCredentials,
  login,
  register,
  selectRegion,
} from '../utils/authApi';

interface AuthPanelProps {
  state: GameState;
  /** 进入排行时确定的默认大区（最新大区） */
  defaultRegionId: string | null;
  defaultRegionName: string | null;
  /** 注册/登录成功 */
  onLogin: (account: UserAccountData) => void;
  /** 入驻大区成功 */
  onRegionSelected: (regionId: string, regionName: string) => void;
  /** 返回榜单 */
  onBack: () => void;
}

const CARD = 'rounded-lg border border-[#3b3429] bg-[#211d18] px-2.5 py-2.5';

/**
 * 登录注册：账号密码自动生成，昵称必填（展示在排行榜上）
 * 注册登录成功后立即将用户数据上报至默认（最新）大区
 */
export const AuthPanel: React.FC<AuthPanelProps> = ({
  state,
  defaultRegionId,
  defaultRegionName,
  onLogin,
  onRegionSelected,
  onBack,
}) => {
  // 已有历史记录则直接沿用，不再重新生成账号密码
  const [cred, setCred] = useState(() => {
    const history = state.lastCredentials;
    return history
      ? { userName: history.userName, password: history.password }
      : generateCredentials();
  });
  const [nickname, setNickname] = useState(
    state.account?.nickname || state.lastCredentials?.nickname || DEFAULT_NICKNAME
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 注册并登录 → 上报数据至默认大区 */
  const handleRegister = async () => {
    const finalNickname = nickname.trim();
    if (finalNickname === '') return;

    setLoading(true);
    setError(null);

    // 沿用历史账号密码时走登录，否则注册新账号
    const isHistory =
      !!state.lastCredentials &&
      cred.userName === state.lastCredentials.userName &&
      cred.password === state.lastCredentials.password;

    try {
      const acc: UserAccount = isHistory
        ? await login(cred.userName, cred.password)
        : await register(cred.userName, cred.password, finalNickname);
      onLogin({
        userId: acc.userId,
        userName: acc.userName,
        nickname: acc.nickname,
        password: acc.password,
        token: acc.token,
        regionId: null,
        regionName: null,
      });

      // 登录即上报：进入排行时已默认加入最新大区（报文加密签名）
      const regionId = defaultRegionId;
      if (regionId) {
        const attrs = calculateGameAttributes(state);
        await selectRegion({
          userId: acc.userId,
          userName: acc.userName,
          nickname: acc.nickname,
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
        }, acc.token);
        onRegionSelected(regionId, defaultRegionName ?? regionId);
      }

      onBack();
    } catch {
      setError('注册失败 · 请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-center text-[11px] font-serif text-[#807565]">
        天道留名 · 自动赐号
      </div>

      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">
          账号（{state.lastCredentials ? '历史记录' : '自动生成'}）
        </div>
        <div className="font-mono text-sm text-[#e3ded4] break-all">{cred.userName}</div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">
          密码（{state.lastCredentials ? '历史记录' : '自动生成'}）
        </div>
        <div className="font-mono text-sm text-[#e3ded4] break-all">{cred.password}</div>
      </div>

      {/* 昵称：必填，展示在排行榜上 */}
      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1.5">
          昵称（必填 · 显示在排行榜上）
        </div>
        <input
          id="auth-nickname-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          placeholder={DEFAULT_NICKNAME}
          className="w-full px-2 py-1.5 rounded bg-[#0f1216] border border-[#2c3440] text-sm text-[#e3ded4] font-serif outline-none focus:border-[#5b8db8]"
        />
        {nickname.trim() === '' && (
          <div className="text-[10px] font-serif text-[#d99797] mt-1">
            昵称不可为空，未填写将无法登顶榜单
          </div>
        )}
      </div>

      {/* 默认入驻的大区 */}
      <div className={CARD}>
        <div className="text-[11px] font-serif text-[#8fa6bd] mb-1">默认入驻大区</div>
        <div className="font-mono text-[11px] text-[#cbbfa9]">
          {defaultRegionName ?? (defaultRegionId ? defaultRegionId : '加载中…')}
        </div>
        <div className="text-[10px] font-serif text-[#7d7364] mt-0.5">
          进入排行即默认加入最新大区 · 登录后自动上报数据
        </div>
      </div>

      <button
        id="btn-auth-refresh-cred"
        onClick={() => setCred(generateCredentials())}
        className="px-3 py-1.5 rounded border border-[#3b3429] bg-[#1a1816] hover:border-[#5b5142] text-[11px] font-serif text-[#a69c8c] cursor-pointer"
      >
        换一组账号密码
      </button>

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
          返回榜单
        </button>
        <button
          id="btn-auth-register"
          onClick={handleRegister}
          disabled={loading || nickname.trim() === ''}
          className="flex-1 py-2.5 rounded-lg border-2 border-[#8a653f] bg-[#543b23] hover:bg-[#694a2c] text-xs font-serif font-bold text-[#f5ebd7] cursor-pointer active:translate-y-0.5 disabled:cursor-not-allowed"
        >
          {loading ? '上报中…' : '登录并上榜'}
        </button>
      </div>
    </div>
  );
};
