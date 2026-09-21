import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { calculateGameAttributes } from '../utils/gameMath';
import { Region, fetchRegions, selectRegion } from '../utils/authApi';

interface RegionPanelProps {
  state: GameState;
  /** 入驻大区成功 */
  onRegionSelected: (regionId: string, regionName: string) => void;
  /** 返回榜单 */
  onBack: () => void;
}

/**
 * 选择服务器大区（预留组件）
 *
 * 当前流程改为「进入排行即默认入驻最新大区」，本组件暂不挂载；
 * 后续需要开放手动选区时，直接在排行中渲染本组件即可。
 */
export const RegionPanel: React.FC<RegionPanelProps> = ({
  state,
  onRegionSelected,
  onBack,
}) => {
  const account = state.account;
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 拉取大区：优先选中最后一个（最新大区）
  useEffect(() => {
    let cancelled = false;
    fetchRegions()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setRegions(list);
        setRegionId((prev) => prev || list[list.length - 1].id);
      })
      .catch(() => {
        if (!cancelled) setError('大区列表获取失败');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 确认入驻：将用户信息连同大区上报后台 */
  const handleConfirm = async () => {
    if (!account || !regionId) return;
    setLoading(true);
    setError(null);

    const attrs = calculateGameAttributes(state);
    const region = regions.find((r) => r.id === regionId);

    try {
      await selectRegion({
        userId: account.userId,
        userName: account.userName,
        nickname: account.nickname,
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
      }, account.token);
      onRegionSelected(regionId, region?.name ?? regionId);
      onBack();
    } catch {
      setError('入驻失败 · 请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-center text-[11px] font-serif text-[#807565]">
        择一界域入驻 · 默认推荐最新大区
      </div>

      <div className="flex flex-col gap-1.5">
        {regions.map((r) => {
          const active = r.id === regionId;
          return (
            <button
              key={r.id}
              id={`btn-region-${r.id}`}
              onClick={() => setRegionId(r.id)}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[#241f16] border-[#6b5a3f]'
                  : 'bg-[#211f1c] border-[#383229] hover:bg-[#2a2620] hover:border-[#5b5142]'
              }`}
            >
              <div className="min-w-0">
                <div
                  className={`font-serif font-bold text-xs sm:text-sm truncate ${
                    active ? 'text-[#e8cf9a]' : 'text-[#ded7cb]'
                  }`}
                >
                  {r.name}
                </div>
                <div className="text-[10px] font-serif text-[#7d7364] truncate">{r.desc}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-mono text-[#8a7a63]">在线 {r.online}</div>
                {active && <div className="text-[10px] font-mono text-[#c9a86a]">已选择</div>}
              </div>
            </button>
          );
        })}

        {regions.length === 0 && (
          <div className="text-[11px] text-[#7d7364] font-serif text-center py-4">
            大区列表加载中…
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[#5a2f2f] bg-[#261b1b] px-2.5 py-2 text-center text-[11px] font-serif text-[#d99797]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          id="btn-region-back"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-lg border border-[#3b3429] bg-[#241f1a] hover:bg-[#2e2821] text-xs font-serif text-[#a69c8c] cursor-pointer"
        >
          返回榜单
        </button>
        <button
          id="btn-region-confirm"
          onClick={handleConfirm}
          disabled={loading || !regionId || !account}
          className="flex-1 py-2.5 rounded-lg border-2 border-[#8a653f] bg-[#543b23] hover:bg-[#694a2c] text-xs font-serif font-bold text-[#f5ebd7] cursor-pointer active:translate-y-0.5 disabled:cursor-not-allowed"
        >
          {loading ? '入驻中…' : '确认入驻'}
        </button>
      </div>
    </div>
  );
};
