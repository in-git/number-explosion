import { useCallback, useEffect, useRef, useState } from 'react';
import { BigNum, CLEAR_EXP } from '../utils/bigNumber';
import { GameState, UpgradeId, UserAccountData, OfflineGainReport } from '../types';
import { SettleType, PointsCurrency } from '../components/FunShop';
import {
  UPGRADE_METADATA,
  executeClickCalculation,
  getOfflineGain,
  COLLAPSE_COST,
  LEVEL_CAP_PER_POINT,
  AUTO_FREQ_MAX_LEVEL,
  getCombinedAutoIntervalMs,
  getValueCap,
  getValueCapStep,
  getValueCapCost,
  getRebirthStartValue,
  getRebirthPointUpgradeCost,
  getRebirthPointBonusPerMillion,
  getRebirthMergedUpgradeCost,
  getRebirthBaseValueCost,
  getRebirthBaseValueGain,
  getExtraRebirthPoints,
  getRebirthToCollapseCost,
  getRebirthPointsFromValue,
  getAfterlifeUpgradeCost,
  getAfterlifeUpgradeMultiplier,
  UPGRADE_TRIBULATION_POINT_COST,
  getBulkUpgradeResult,
  getBulkRebirthUpgradeResult,
  getRebirthChanceHeadroom,
  calculateGameAttributes,
  getRebirthPointsCap,
  getRebirthCapUpgradeCost,
  getAutoRebirthPoints,
  getAutoRebirthIntervalMs,
  TRIBULATION_POINT_INTERVAL_MS,
  TRIBULATION_POINT_GAIN,
  planBulkBuy,
  getValueCapBulkCost,
  getRebirthCapBulkCost,
  getRebirthBulkUpgradeCost,
  TRIBULATION_COST,
  TRIBULATION_PILL_COST,
  TRIBULATION_MAX_COUNT,
  RESET_PILL_TICK_MS,
  getResetPillDurationMs,
  getEffectiveValueCapLevel,
  getEffectiveRebirthPointLevel,
  TribulationOutcome,
} from '../utils/gameMath';
import { resetToInitialState, resetUpgradeLevels } from '../utils/state';
import { resetAmountMode } from '../hooks/useUpgradeAmountMode';
import { buildSaveSnapshot, clearGameState, loadGameState, saveGameState } from '../utils/storage';
import { getServerNow, syncServerTime } from '../utils/serverTime';
import { deleteAccount, saveGameToServer } from '../utils/authApi';
import {
  ACHIEVEMENTS,
  AUTO_UNLOCK_COST,
  RANKING_UNLOCK_COST,
  AFTERLIFE_SHOP_UNLOCK_COST,
  AFTERLIFE_POINT_EXCHANGE_COST,
  ONE_KEY_UPGRADE_UNLOCK_COST,
  TRIBULATION_UNLOCK_COST,
  INITIAL_STATE,
  OFFLINE_MAX_MS,
  OFFLINE_MIN_MS,
  REBIRTH_THRESHOLD,
  SERVER_TIME_SYNC_INTERVAL_MS,
  UPGRADE_ORDER,
  ACHIEVEMENTS_UNLOCK_COST,
  TITLE_UNLOCK_COST,
} from '../config';
import { FloatingTextType } from './useFloatingTexts';

interface UseGameStateDeps {
  addToast: (title: string, content: string) => void;
  addFloatingText: (text: string, type: FloatingTextType) => void;
}

/** 单次自动点击最多补算的次数 */
const MAX_BATCH_CLICKS = 100;

/** 渡劫成功后，数值殿 / 永劫殿的每次升级都另需渡劫点 */
const needTribulationPoint = (state: GameState): boolean => !!state.tribulationSuccess;

/** 当前可用的渡劫点数 */
const availableTribulationPoints = (state: GameState): number =>
  Math.max(0, state.tribulationPoints || 0);

/** 扣除 1 次升级所需的渡劫点（未渡劫成功时不扣） */
const payTribulationPoints = (state: GameState): Partial<GameState> =>
  needTribulationPoint(state)
    ? {
        tribulationPoints: Math.max(
          0,
          availableTribulationPoints(state) - UPGRADE_TRIBULATION_POINT_COST
        ),
      }
    : {};

/** 扣除 n 次升级所需的渡劫点（未渡劫成功时不扣） */
const payTribulationPointsTimes = (state: GameState, times: number): Partial<GameState> =>
  needTribulationPoint(state) && times > 0
    ? {
        tribulationPoints: Math.max(
          0,
          availableTribulationPoints(state) - times * UPGRADE_TRIBULATION_POINT_COST
        ),
      }
    : {};
/** 游玩时长写回存档的间隔（ms） */
const PLAY_TIME_TICK_MS = 5_000;
/** 自动存档的节流间隔（ms）：数值每秒都在变，逐帧写 localStorage 会拖垮主线程 */
const AUTO_SAVE_THROTTLE_MS = 1_000;
/** 云端自动存档间隔（ms）：登录后每隔该时长把完整存档上报一次服务器 */
const CLOUD_SAVE_INTERVAL_MS = 30_000;

/**
 * 游戏核心状态与全部玩法逻辑（数值、点击、升级、商殿、永劫、坍缩）
 */
export function useGameState({ addToast, addFloatingText }: UseGameStateDeps) {
  const [state, setState] = useState<GameState>(loadGameState);
  const [currentBigNum, setCurrentBigNum] = useState<BigNum>(() =>
    BigNum.fromData(state.currentValue)
  );
  /** 挂机收益报告：非空时展示离线收益弹窗 */
  const [offlineReport, setOfflineReport] = useState<OfflineGainReport | null>(null);

  // 已提示过的解锁（以存档为准，刷新后不会重复提示）
  const notifiedUnlocks = useRef<Set<string>>(new Set(state.notifiedUnlocks || []));

  // 首次进入：初始存档无 lastActiveAt（为 0）。仅在首次渲染时捕获，
  // 之后离线结算会把 lastActiveAt 刷新为服务器时间，故必须用 ref 固化。
  const isFirstEntryRef = useRef<boolean | null>(null);
  if (isFirstEntryRef.current === null) {
    isFirstEntryRef.current = !state.lastActiveAt;
  }

  // 供定时器 / 事件回调读取最新值
  const stateRef = useRef(state);
  stateRef.current = state;
  const bigNumRef = useRef(currentBigNum);
  bigNumRef.current = currentBigNum;
  // 累计游玩时长的最新值（供定时器精确累加，避免连续结算时读到旧 state）
  const playTimeRef = useRef(state.playTimeMs || 0);
  playTimeRef.current = state.playTimeMs || 0;

  /**
   * Auto-save（节流写入）
   * 自动点击的 rAF 每帧都可能改数值，若逐帧 JSON.stringify + localStorage.setItem，
   * 主线程会被同步 IO 拖死；故改成「1s 内至多写一次，且写的是最新值」。
   * 另有 60s 定时落盘与 pagehide 落盘兜底，关闭页面不会丢进度。
   */
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimerRef.current !== null) return;
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      saveGameState(stateRef.current, bigNumRef.current.toData());
    }, AUTO_SAVE_THROTTLE_MS);
  }, [state, currentBigNum]);

  // 卸载时清掉待写的定时器并补写一次
  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveGameState(stateRef.current, bigNumRef.current.toData());
    },
    []
  );

  /** 服务器时间定期同步 + 退到后台/关闭页面时立刻落时间戳 */
  useEffect(() => {
    const persist = () => saveGameState(stateRef.current, bigNumRef.current.toData());

    const timer = window.setInterval(() => {
      syncServerTime();
      persist();
    }, SERVER_TIME_SYNC_INTERVAL_MS);

    const onHide = () => persist();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  /**
   * 云端自动存档：登录后每 30s 把完整存档上报服务器。
   * - 未登录（无 token）时跳过，本地存档仍照常落盘
   * - 读 ref 取最新值，定时器只需挂载一次，不随数值变化重建
   * - in-flight 去重：上一轮未返回时跳过本轮，避免请求堆积
   * - 失败静默：网络波动不打扰玩家，下一轮自动重试
   */
  const cloudSavePendingRef = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const account = stateRef.current.account;
      if (!account?.token || cloudSavePendingRef.current) return;

      cloudSavePendingRef.current = true;

      // 快照附带计算后的战斗属性：存档本体只有升级等级等原始参数，
      // 后端从存档同步成绩时直接取用，避免在后端重算属性公式
      const attrs = calculateGameAttributes(stateRef.current);
      const snapshot = {
        ...buildSaveSnapshot(stateRef.current, bigNumRef.current.toData()),
        attrs: {
          critChance: attrs.critChance,
          critMultiplier: attrs.critMultiplier,
          comboChance: attrs.comboChance,
          comboMultiplier: attrs.comboMultiplier,
        },
      };
      // 账号密码 / 令牌不随存档上报（二者与账号绑定，登录时另行下发）
      if (snapshot.account) {
        snapshot.account = { ...snapshot.account, password: '', token: '' };
      }

      saveGameToServer(account.userId, snapshot, account.token)
        .catch(() => {
          // 静默失败：下一轮自动重试
        })
        .finally(() => {
          cloudSavePendingRef.current = false;
        });
    }, CLOUD_SAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  /** 提交数值：任何途径获得的数值都不得突破「数值上限」，同时刷新最高数值纪录 */
  const commitValue = useCallback((val: BigNum) => {
    const cap = getValueCap(
      getEffectiveValueCapLevel(stateRef.current),
      stateRef.current.rebirthCount || 0
    );
    const next = val.gt(cap) ? cap : val;
    setCurrentBigNum(next);
    setState((prev) => ({
      ...prev,
      currentValue: next.toData(),
      highestValue: next.gt(BigNum.fromData(prev.highestValue))
        ? next.toData()
        : prev.highestValue,
      // 数值达 1ssr（字母档位顶点）即标记通关；存档属性，一经达成永不复位
      gameCleared: prev.gameCleared || (next.m > 0 && next.e >= CLEAR_EXP),
    }));
    return next;
  }, []);

  /** 解锁提示：同一条目一生只提示一次，并写入存档 */
  const checkUnlockTriggers = useCallback(
    (clicks: number, val: BigNum) => {
      const freshNotified: string[] = [];
      const markNotified = (key: string) => {
        if (notifiedUnlocks.current.has(key)) return false;
        notifiedUnlocks.current.add(key);
        freshNotified.push(key);
        return true;
      };

      UPGRADE_ORDER.forEach((id) => {
        const meta = UPGRADE_METADATA[id];
        if (clicks >= meta.requiredClicks && markNotified(id)) {
          addToast(`解锁 ${meta.name}`, '');
        }
      });

      let unlockRebirth = false;
      if (val.gte(REBIRTH_THRESHOLD) && !stateRef.current.rebirthUnlocked && markNotified('rebirth')) {
        unlockRebirth = true;
        addToast('解锁永劫', '');
      }

      if (freshNotified.length > 0) {
        setState((prev) => ({
          ...prev,
          notifiedUnlocks: [...new Set([...(prev.notifiedUnlocks || []), ...freshNotified])],
          rebirthUnlocked: prev.rebirthUnlocked || unlockRebirth,
        }));
      }
    },
    [addToast]
  );

  /**
   * 挂机收益结算：< 3 分钟不计，最多按 1 天结算。
   * 入账成功后设置 offlineReport，由离线收益弹窗展示本次挂机所得。
   */
  const settleOfflineGain = useCallback(
    (elapsedMs: number) => {
      if (elapsedMs < OFFLINE_MIN_MS) return;

      const cappedMs = Math.min(elapsedMs, OFFLINE_MAX_MS);

      // 渡劫殿：离线推进重置丹炼制（坍缩 / 永劫）。
      // 与前台语义一致——一炉炼成后停炉，故离线最多补完当前这一炉。
      const prev = stateRef.current;
      const pillPatch: Partial<GameState> = {};
      const produced: string[] = [];
      (['rebirth', 'collapse'] as const).forEach((kind) => {
        const isRebirth = kind === 'rebirth';
        const crafting = isRebirth ? prev.rebirthResetCrafting : prev.collapseResetCrafting;
        if (!crafting) return;

        const duration = getResetPillDurationMs(kind);
        const progress = Math.max(
          0,
          isRebirth ? prev.rebirthResetProgressMs : prev.collapseResetProgressMs || 0
        );
        const total = progress + cappedMs;

        if (total >= duration) {
          // 炼成一炉：产出 1 颗后停炉（与前台一致）
          if (isRebirth) {
            pillPatch.rebirthResetProgressMs = 0;
            pillPatch.rebirthResetCraftCount = (prev.rebirthResetCraftCount || 0) + 1;
            pillPatch.rebirthResetPills = Math.max(0, prev.rebirthResetPills || 0) + 1;
            pillPatch.rebirthResetCrafting = false;
          } else {
            pillPatch.collapseResetProgressMs = 0;
            pillPatch.collapseResetCraftCount = (prev.collapseResetCraftCount || 0) + 1;
            pillPatch.collapseResetPills = Math.max(0, prev.collapseResetPills || 0) + 1;
            pillPatch.collapseResetCrafting = false;
          }
          produced.push(isRebirth ? '永劫重置丹 ×1' : '坍缩重置丹 ×1');
        } else {
          // 未炼满一炉：推进进度，继续炼制
          if (isRebirth) pillPatch.rebirthResetProgressMs = total;
          else pillPatch.collapseResetProgressMs = total;
        }
      });
      if (Object.keys(pillPatch).length > 0) {
        setState((p) => ({ ...p, ...pillPatch }));
        if (produced.length > 0) addToast('离线炼丹', `挂机期间产出：${produced.join('、')}`);
      }

      const gain = getOfflineGain(stateRef.current, cappedMs / 1000);
      if (gain.m === 0) return;

      const before = bigNumRef.current;
      const after = commitValue(before.add(gain));
      // 受数值上限截断后的实际入账
      const actual = after.sub(before);
      if (actual.m === 0) return;

      setOfflineReport({
        durationMs: cappedMs,
        gain: actual.toData(),
        truncatedByMax: elapsedMs > OFFLINE_MAX_MS,
        truncatedByCap: actual.lt(gain),
      });

      checkUnlockTriggers(stateRef.current.clickCount, after);
    },
    [checkUnlockTriggers, commitValue, addToast]
  );

  /**
   * 离线收益结算（每次进入界面仅执行一次）
   * 以服务器时间计算离线时长，挂机回来后弹窗展示收益
   */
  const offlineSettledRef = useRef(false);
  useEffect(() => {
    if (offlineSettledRef.current) return;
    offlineSettledRef.current = true;

    let cancelled = false;

    (async () => {
      const serverNow = await syncServerTime();
      if (cancelled) return;

      const lastActiveAt = stateRef.current.lastActiveAt || 0;

      // 先把时间戳落到服务器当前时间，避免重复结算
      setState((prev) => ({ ...prev, lastActiveAt: serverNow }));

      // 无历史记录（首次进入）：仅记录时间戳
      if (!lastActiveAt) return;

      settleOfflineGain(serverNow - lastActiveAt);
    })();

    return () => {
      cancelled = true;
    };
  }, [settleOfflineGain]);

  /**
   * 页面从后台 / 最小化切回：离开超过门槛时同样按挂机结算并弹窗展示收益。
   * 后台期间 rAF 停摆、存档实时刷新时间戳，此处按最近一次活跃时间差结算。
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;

      const lastActiveAt = stateRef.current.lastActiveAt || 0;
      if (!lastActiveAt) return;

      const elapsed = getServerNow() - lastActiveAt;
      if (elapsed < OFFLINE_MIN_MS) return;

      // 先刷新时间戳，避免重复结算
      setState((prev) => ({ ...prev, lastActiveAt: getServerNow() }));
      settleOfflineGain(elapsed);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settleOfflineGain]);

  /**
   * 成就结算：
   * - click 类：以「历世累计点击次数」为门槛
   * - playTime 类：以「累计游玩时长」为门槛
   * 入参用于覆盖尚未写入 state 的最新进度
   */
  const checkAchievements = useCallback(
    (progress?: { totalClicks?: number; playTimeMs?: number; tribulationCount?: number }) => {
      // 成就系统未开启（数值殿解锁前）不结算成就
      if (!stateRef.current.achievementsUnlocked) return;
      const cur = stateRef.current;
      const totalClicks = progress?.totalClicks ?? cur.totalClickCount ?? 0;
      const playTimeMs = progress?.playTimeMs ?? cur.playTimeMs ?? 0;
      const tribulationCount = progress?.tribulationCount ?? cur.tribulationCount ?? 0;
      const unlocked = new Set(cur.unlockedAchievements || []);

      const fresh = ACHIEVEMENTS.filter((a) => {
        if (unlocked.has(a.id)) return false;
        if (a.type === 'playTime') return playTimeMs >= (a.requiredPlayMs || 0);
        if (a.type === 'tribulation') return tribulationCount >= (a.requiredTribulation || 0);
        return totalClicks >= a.requiredClicks;
      });
      if (fresh.length === 0) return;

      fresh.forEach((a) => {
        unlocked.add(a.id);
        const reward = a.critMultiplier
          ? `暴击效果 +${a.critMultiplier}`
          : `永劫初始数值 +${a.rebirthStartValue.toLocaleString('zh-CN')}`;
        addToast('成就达成', `成就「${a.name}」· ${a.desc} · ${reward}`);
      });

      setState((prev) => ({ ...prev, unlockedAchievements: [...unlocked] }));
    },
    [addToast]
  );

  /**
   * 游玩时长累计：仅在页面可见（前台打开）时计时
   * 页面隐藏 / 关闭时立即结算并停止，离线与后台挂机一律不计
   */
  useEffect(() => {
    let lastAt = document.visibilityState === 'visible' ? Date.now() : 0;

    /** 结算当前这段可见时长，并写回 state */
    const flush = () => {
      const now = Date.now();
      if (lastAt > 0 && now > lastAt) {
        const nextPlayTime = playTimeRef.current + (now - lastAt);
        playTimeRef.current = nextPlayTime;
        setState((prev) => ({ ...prev, playTimeMs: nextPlayTime }));
        checkAchievements({ playTimeMs: nextPlayTime });
      }
      lastAt = document.visibilityState === 'visible' ? now : 0;
    };

    // 进入时按存档进度补判一次（例如上次已达门槛但未弹提示）
    checkAchievements();

    const timer = window.setInterval(flush, PLAY_TIME_TICK_MS);
    const onVisibility = () => flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      flush();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [checkAchievements]);

  /** 用户手动点击 */
  const handleUserClick = useCallback(() => {
    const currentState = stateRef.current;
    const currentVal = bigNumRef.current;
    const newClickCount = currentState.clickCount + 1;
    const newTotalClickCount = (currentState.totalClickCount || 0) + 1;

    const result = executeClickCalculation(currentState);
    const finalVal = commitValue(currentVal.add(result.gainedValue));
    // 受数值上限截断后的实际入账
    const actual = finalVal.sub(currentVal);

    // 连击与暴击互斥：至多触发其一
    if (actual.m === 0) {
      // 数值已达上限，本次点击不再入账
      addFloatingText('已达上限', 'normal');
    } else if (result.isCrit) {
      addFloatingText(`暴击 +${actual.formatChinese(2)}`, 'crit');
    } else if (result.isCombo) {
      addFloatingText(`连击 +${actual.formatChinese(2)}`, 'combo');
    } else {
      addFloatingText(`+${actual.formatChinese(2)}`, 'normal');
    }

    setState((prev) => ({
      ...prev,
      clickCount: newClickCount,
      totalClickCount: newTotalClickCount,
    }));

    // 功法解锁看本世点击，成就看累计点击
    checkUnlockTriggers(newClickCount, finalVal);
    checkAchievements({ totalClicks: newTotalClickCount });
  }, [addFloatingText, checkAchievements, checkUnlockTriggers, commitValue]);

  /** 解锁功法：仅消耗点击量，不消耗数值 */
  const handleUnlockUpgrade = useCallback(
    (id: UpgradeId, _cost: BigNum) => {
      const clickCost = UPGRADE_METADATA[id].requiredClicks;
      if (stateRef.current.clickCount < clickCost) return;

      setState((prev) => ({
        ...prev,
        clickCount: Math.max(0, prev.clickCount - clickCost),
        upgrades: {
          ...prev.upgrades,
          [id]: { ...prev.upgrades[id], unlocked: true },
        },
      }));

      addToast(`解锁 ${UPGRADE_METADATA[id].name}`, `消耗点击量 ${clickCost.toLocaleString('zh-CN')}`);
    },
    [addToast, commitValue]
  );

  /**
   * 提升功法等级。
   * 渡劫成功后，除数值消耗外每级另需 UPGRADE_TRIBULATION_POINT_COST 点渡劫点。
   */
  const handleUpgradeLevel = useCallback(
    (id: UpgradeId, cost: BigNum) => {
      const prev = stateRef.current;
      const currentVal = bigNumRef.current;
      if (!currentVal.gte(cost)) return;
      // 渡劫成功后须另付渡劫点，点数不足不可升级
      if (needTribulationPoint(prev) && availableTribulationPoints(prev) < UPGRADE_TRIBULATION_POINT_COST) {
        return;
      }

      commitValue(currentVal.sub(cost));

      setState((p) => ({
        ...p,
        ...payTribulationPoints(p),
        upgrades: {
          ...p.upgrades,
          [id]: { ...p.upgrades[id], level: p.upgrades[id].level + 1 },
        },
      }));
    },
    [commitValue]
  );

  /** 本次最多可升级数：渡劫成功后每级另需 1 点渡劫点，点数耗尽即停 */
  const pointLevelLimit = (state: GameState): number =>
    needTribulationPoint(state)
      ? Math.floor(availableTribulationPoints(state) / UPGRADE_TRIBULATION_POINT_COST)
      : Infinity;

  /**
   * 数值殿：把指定功法一次性升到当前可及的圆满等级（升级量 MAX）。
   * 规则与 getBulkUpgradeResult 同源（逐级贪心），故按钮展示的消耗即此处实际扣除值。
   * @returns 本次实际升的级数（0 = 未升级）
   */
  const handleUpgradeMax = useCallback(
    (id: UpgradeId, maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      const up = prev.upgrades[id];
      if (!up || !up.unlocked) return 0;

      // 概率类上限需扣减永劫殿已提供的概率，保证两殿合计不超 100%
      const rebirthLevel = prev.rebirthMergedLevels?.[id] || 0;
      const { levels, cost } = getBulkUpgradeResult(
        id,
        up,
        rebirthLevel,
        bigNumRef.current,
        Math.min(pointLevelLimit(prev), maxLevels)
      );
      if (levels <= 0) return 0;

      commitValue(bigNumRef.current.sub(cost));
      setState((p) => ({
        ...p,
        upgrades: {
          ...p.upgrades,
          [id]: { ...p.upgrades[id], level: p.upgrades[id].level + levels },
        },
        ...payTribulationPointsTimes(p, levels),
      }));
      return levels;
    },
    [commitValue]
  );

  /** 数值殿：花费 50 万数值开启成就系统 */
  const handleUnlockAchievements = useCallback(() => {
    const cost = BigNum.fromNumber(ACHIEVEMENTS_UNLOCK_COST);
    const currentVal = bigNumRef.current;
    if (stateRef.current.achievementsUnlocked || !currentVal.gte(cost)) return;
    commitValue(currentVal.sub(cost));
    setState((prev) => ({ ...prev, achievementsUnlocked: true }));
    addToast('成就开启', `消耗 ${cost.formatChinese(0)} 数值 · 成就系统已开启`);
  }, [addToast, commitValue]);

  /** 数值殿：花费 200 万数值开启称号系统 */
  const handleUnlockTitles = useCallback(() => {
    const cost = BigNum.fromNumber(TITLE_UNLOCK_COST);
    const currentVal = bigNumRef.current;
    if (stateRef.current.titleUnlocked || !currentVal.gte(cost)) return;
    commitValue(currentVal.sub(cost));
    setState((prev) => ({ ...prev, titleUnlocked: true }));
    addToast('称号开启', `消耗 ${cost.formatChinese(0)} 数值 · 称号系统已开启`);
  }, [addToast, commitValue]);

  /** 奇趣商殿结算：点数类货币（永劫点 / 坍缩点 / 往生点） */
  const handleGambleSettlePoints = useCallback(
    (currency: PointsCurrency, type: SettleType, amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const key =
        currency === 'rebirth'
          ? 'rebirthPoints'
          : currency === 'collapse'
            ? 'collapsePoints'
            : 'afterlifePoints';
      const label =
        currency === 'rebirth' ? '永劫点数' : currency === 'collapse' ? '坍缩点数' : '往生点';
      setState((prev) => {
        const cur = (prev[key as 'rebirthPoints' | 'collapsePoints' | 'afterlifePoints']) || 0;
        // 永劫点数持有量无上限（上限只作用于每次永劫所得）
        const next = Math.max(0, type === 'gain' ? cur + amount : cur - amount);
        return { ...prev, [key]: next };
      });
      addToast(
        type === 'gain' ? '造化垂青' : '造化尽散',
        `${label} ${type === 'gain' ? '+' : '−'}${amount.toLocaleString('zh-CN')}`
      );
    },
    [addToast]
  );

  /** 自动点击循环 */
  useEffect(() => {
    let lastTime = performance.now();
    let accumulator = 0;
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const currentState = stateRef.current;

      if (currentState.upgrades.autoClickUnlock.unlocked && delta > 0) {
        const autoFreq = currentState.upgrades.autoFrequency;
        // 数值殿等级 + 永劫殿独立等级，两殿效果累加（与 calculateGameAttributes 同一公式）
        const autoFreqLevel = autoFreq.unlocked ? autoFreq.level : 0;
        const rbAutoFreqLevel = currentState.rebirthMergedLevels?.autoFrequency || 0;
        const intervalMs = getCombinedAutoIntervalMs(autoFreqLevel, rbAutoFreqLevel);
        const clicksPerMs = 1 / intervalMs;

        accumulator += delta * clicksPerMs;
        // 积压封顶：卡顿或切后台回来后不一次性暴补，避免速率失控
        if (accumulator > MAX_BATCH_CLICKS * 2) accumulator = MAX_BATCH_CLICKS * 2;

        if (accumulator >= 1) {
          const clicksToRun = Math.min(MAX_BATCH_CLICKS, Math.floor(accumulator));
          accumulator -= clicksToRun;

          let batchGained = new BigNum(0, 0);
          let sampleResult: ReturnType<typeof executeClickCalculation> | null = null;

          for (let i = 0; i < clicksToRun; i++) {
            const res = executeClickCalculation(currentState);
            batchGained = batchGained.add(res.gainedValue);
            if (i === 0) sampleResult = res;
          }

          let capped = false;
          if (batchGained.gt(0)) {
            const before = bigNumRef.current;
            const nextVal = commitValue(before.add(batchGained));
            // 已达上限时本次无实际入账
            capped = nextVal.sub(before).m === 0;
            checkUnlockTriggers(currentState.clickCount, nextVal);
          }

          // 抽样飘字，避免刷屏（连击与暴击互斥：至多触发其一）
          if (Math.random() < 0.25 && sampleResult) {
            if (capped) {
              addFloatingText('已达上限', 'normal');
            } else if (sampleResult.isCrit) {
              addFloatingText(`暴击 +${sampleResult.gainedValue.formatChinese(1)}`, 'crit');
            } else if (sampleResult.isCombo) {
              addFloatingText(`连击 +${sampleResult.gainedValue.formatChinese(1)}`, 'combo');
            }
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [addFloatingText, checkUnlockTriggers, commitValue]);

  /**
   * 渡劫殿：炼制重置丹（数值重置丹 / 永劫重置丹，须手动点击「炼制」）。
   * - 渡劫成功（飞升成仙）后渡劫殿才存在；未点击则不炼制
   * - 每 RESET_PILL_TICK_MS 推进一次进度；一炉炼成得 1 颗丹后停炉，须再次点击
   * - 耗时恒定：数值重置丹每炉 1 分钟，永劫重置丹每炉 3 分钟，不随炼制次数累加
   * - 进度与存量随存档落盘，关闭弹窗 / 刷新页面后继续炼制
   */
  useEffect(() => {
    /** 推进一种丹；无需更新时返回 null */
    const advance = (kind: 'value' | 'rebirth' | 'collapse'): Partial<GameState> | null => {
      const prev = stateRef.current;
      const isValue = kind === 'value';
      const isRebirth = kind === 'rebirth';
      const crafting = isValue
        ? prev.valueResetCrafting
        : isRebirth
          ? prev.rebirthResetCrafting
          : prev.collapseResetCrafting;
      if (!crafting) return null;

      const craftCount = Math.max(
        0,
        isValue
          ? prev.valueResetCraftCount
          : isRebirth
            ? prev.rebirthResetCraftCount
            : prev.collapseResetCraftCount || 0
      );
      const progressMs =
        Math.max(
          0,
          isValue
            ? prev.valueResetProgressMs
            : isRebirth
              ? prev.rebirthResetProgressMs
              : prev.collapseResetProgressMs || 0
        ) + RESET_PILL_TICK_MS;

      // 炼成一炉：产出 1 颗后停炉
      if (progressMs >= getResetPillDurationMs(kind)) {
        if (isValue) {
          return {
            valueResetProgressMs: 0,
            valueResetCraftCount: craftCount + 1,
            valueResetPills: Math.max(0, prev.valueResetPills || 0) + 1,
            valueResetCrafting: false,
          };
        }
        if (isRebirth) {
          return {
            rebirthResetProgressMs: 0,
            rebirthResetCraftCount: craftCount + 1,
            rebirthResetPills: Math.max(0, prev.rebirthResetPills || 0) + 1,
            rebirthResetCrafting: false,
          };
        }
        return {
          collapseResetProgressMs: 0,
          collapseResetCraftCount: craftCount + 1,
          collapseResetPills: Math.max(0, prev.collapseResetPills || 0) + 1,
          collapseResetCrafting: false,
        };
      }

      return isValue
        ? { valueResetProgressMs: progressMs }
        : isRebirth
          ? { rebirthResetProgressMs: progressMs }
          : { collapseResetProgressMs: progressMs };
    };

    const timer = window.setInterval(() => {
      const prev = stateRef.current;
      if (!prev.tribulationSuccess) return;

      const valueNext = advance('value');
      const rebirthNext = advance('rebirth');
      const collapseNext = advance('collapse');

      const next: Partial<GameState> = {
        ...(valueNext || {}),
        ...(rebirthNext || {}),
        ...(collapseNext || {}),
      };

      // 渡劫点：每 TRIBULATION_POINT_INTERVAL_MS 结算一次，每周期产出 TRIBULATION_POINT_GAIN 点
      //（余下时间结转到下一周期）
      const tpMs = Math.max(0, prev.tribulationPointProgressMs || 0) + RESET_PILL_TICK_MS;
      const tpCycles = Math.floor(tpMs / TRIBULATION_POINT_INTERVAL_MS);
      next.tribulationPoints =
        (prev.tribulationPoints || 0) + tpCycles * TRIBULATION_POINT_GAIN;
      next.tribulationPointProgressMs = tpMs - tpCycles * TRIBULATION_POINT_INTERVAL_MS;

      // 自动永劫结算：固定间隔 30s 产出一次（间隔不累加）；仅加算点数，不清除任何数据
      const arInterval = getAutoRebirthIntervalMs();
      const arMs = Math.max(0, prev.autoRebirthProgressMs || 0) + RESET_PILL_TICK_MS;
      if (arMs >= arInterval) {
        // 静默入账：仅加算点数，不弹提示
        next.rebirthPoints =
          (prev.rebirthPoints || 0) + getAutoRebirthPoints(bigNumRef.current, prev);
        next.autoRebirthProgressMs = arMs - arInterval;
      } else {
        next.autoRebirthProgressMs = arMs;
      }

      setState((p) => ({ ...p, ...next }));
    }, RESET_PILL_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  /** 渡劫殿：点击「炼制」即开炉 —— 数值重置丹（炼制中不可再次操作） */
  const handleCraftValueResetPill = useCallback(() => {
    setState((prev) => {
      if (!prev.tribulationSuccess || prev.valueResetCrafting) return prev;
      return { ...prev, valueResetCrafting: true, valueResetProgressMs: 0 };
    });
  }, []);

  /** 渡劫殿：点击「炼制」即开炉 —— 永劫重置丹（炼制中不可再次操作） */
  const handleCraftRebirthResetPill = useCallback(() => {
    setState((prev) => {
      if (!prev.tribulationSuccess || prev.rebirthResetCrafting) return prev;
      return { ...prev, rebirthResetCrafting: true, rebirthResetProgressMs: 0 };
    });
  }, []);

  /** 渡劫殿：点击「炼制」即开炉 —— 坍缩重置丹（炼制中不可再次操作） */
  const handleCraftCollapseResetPill = useCallback(() => {
    setState((prev) => {
      if (!prev.tribulationSuccess || prev.collapseResetCrafting) return prev;
      return { ...prev, collapseResetCrafting: true, collapseResetProgressMs: 0 };
    });
  }, []);

  /**
   * 数值殿：使用一颗「数值重置丹」，一次性重置全部功法。
   * 各功法的升级消耗从初始曲线重新计算（等级清零），但已获得的效果全部保留：
   * 清零的等级各自记入 valueResetLevels，效果仍按「当前等级 + 保留等级」累计。
   */
  const handleUseValueResetPill = useCallback(() => {
    setState((prev) => {
      const pills = Math.max(0, prev.valueResetPills || 0);
      // 须持有丹药，且至少有一项功法当前有等级可重置（全为 0 时消耗无意义）
      if (pills < 1) return prev;
      const kept = { ...(prev.valueResetLevels || INITIAL_STATE.valueResetLevels) };
      const upgrades = { ...prev.upgrades };
      let touched = false;
      (Object.keys(upgrades) as UpgradeId[]).forEach((id) => {
        // 自动点击频率不在重置范围内（数值 / 永劫两殿皆然）
        if (id === 'autoFrequency') return;
        const up = upgrades[id];
        if (!up || !up.unlocked || up.level <= 0) return;
        kept[id] = (kept[id] || 0) + up.level;
        upgrades[id] = { ...up, level: 0 };
        touched = true;
      });
      if (!touched) return prev;
      return { ...prev, valueResetPills: pills - 1, upgrades, valueResetLevels: kept };
    });
  }, []);

  /**
   * 永劫殿：使用一颗「永劫重置丹」，一次性重置全部属性。
   * 各属性的升级消耗从初始曲线重算（等级清零），已获得的效果全部保留：
   * 清零的等级按属性记入 rebirthResetLevels（永劫殿等级为永久道基，转世不清零）。
   */
  const handleUseRebirthResetPill = useCallback(() => {
    setState((prev) => {
      const pills = Math.max(0, prev.rebirthResetPills || 0);
      // 须持有丹药，且至少有一项属性当前有等级可重置
      if (pills < 1) return prev;
      const kept = { ...(prev.rebirthResetLevels || INITIAL_STATE.rebirthResetLevels) };
      const merged = { ...(prev.rebirthMergedLevels || INITIAL_STATE.rebirthMergedLevels) };
      let touched = false;

      // 「基础数值」：等级存于 rebirthBaseValueLevel，账本统一记在 'baseValue' 键下
      const baseLevel = Math.max(0, prev.rebirthBaseValueLevel || 0);
      let rebirthBaseValueLevel = baseLevel;
      if (baseLevel > 0) {
        kept.baseValue = (kept.baseValue || 0) + baseLevel;
        rebirthBaseValueLevel = 0;
        touched = true;
      }

      // 其余属性：连击倍数 / 暴击倍数 等，等级存于 rebirthMergedLevels
      (Object.keys(merged) as UpgradeId[]).forEach((id) => {
        // 「基础数值」见上方单独处理；自动点击频率不在重置范围内
        if (id === 'baseValue' || id === 'autoFrequency') return;
        const level = Math.max(0, merged[id] || 0);
        if (level <= 0) return;
        kept[id] = (kept[id] || 0) + level;
        merged[id] = 0;
        touched = true;
      });

      if (!touched) return prev;
      return {
        ...prev,
        rebirthResetPills: pills - 1,
        rebirthBaseValueLevel,
        rebirthMergedLevels: merged,
        rebirthResetLevels: kept,
      };
    });
  }, []);

  /**
   * 坍缩殿：使用一颗「坍缩重置丹」，一次性重置坍缩商殿的等级型升级
   * （数值上限 / 永劫爆炸）。二者消耗从初始曲线重算（等级清零），已获得的效果全部保留：
   * 清零的等级各自记入 collapseResetLevels，效果仍按「当前等级 + 保留等级」累计。
   */
  const handleUseCollapseResetPill = useCallback(() => {
    setState((prev) => {
      const pills = Math.max(0, prev.collapseResetPills || 0);
      // 须持有丹药，且至少有一项等级可重置（全为 0 时消耗无意义）
      if (pills < 1) return prev;
      const kept = {
        valueCap: (prev.collapseResetLevels?.valueCap || 0) + (prev.valueCapLevel || 0),
        rebirthExplosion:
          (prev.collapseResetLevels?.rebirthExplosion || 0) + (prev.rebirthPointLevel || 0),
      };
      // 两项都为 0 时无需消耗丹药
      if (kept.valueCap <= 0 && kept.rebirthExplosion <= 0) return prev;
      return {
        ...prev,
        collapseResetPills: pills - 1,
        valueCapLevel: 0,
        rebirthPointLevel: 0,
        collapseResetLevels: kept,
      };
    });
  }, []);

  /** 奇趣商殿结算 */
  const handleGambleSettle = useCallback(
    (type: SettleType, amount: BigNum) => {
      if (amount.m === 0) return;

      const currentVal = bigNumRef.current;
      const nextVal = type === 'gain' ? currentVal.add(amount) : currentVal.sub(amount);

      commitValue(nextVal);

      addToast(
        type === 'gain' ? '造化垂青' : '造化尽散',
        `${type === 'gain' ? '+' : '-'}${amount.formatChinese(2)}`
      );
    },
    [addToast, commitValue]
  );

  /** 坍缩商殿：消耗 1 点坍缩点数，为指定功法 +50 级上限（由永劫商殿迁移而来） */
  const handleBuyLevelCap = useCallback(
    (id: UpgradeId) => {
      setState((prev) => {
        if (prev.collapsePoints < 1) return prev;
        return {
          ...prev,
          collapsePoints: prev.collapsePoints - 1,
          upgrades: {
            ...prev.upgrades,
            [id]: {
              ...prev.upgrades[id],
              capBonus: (prev.upgrades[id].capBonus || 0) + 1,
            },
          },
        };
      });
    }, []);

  /** 坍缩商殿：功法等级上限 —— 每次固定 1 点，一次连购到点数耗尽（升级量） */
  const handleBuyLevelCapMax = useCallback(
    (id: UpgradeId, maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      // 每次固定 1 点，故可买光点数；再按本次次数上限收敛
      const cap = Number.isFinite(maxLevels) ? Math.max(0, Math.floor(maxLevels)) : Infinity;
      const times = Math.min(Math.floor(Math.max(0, prev.collapsePoints)), cap);
      if (times <= 0) return 0;

      setState((p) => ({
        ...p,
        collapsePoints: Math.max(0, p.collapsePoints - times),
        upgrades: {
          ...p.upgrades,
          [id]: { ...p.upgrades[id], capBonus: (p.upgrades[id].capBonus || 0) + times },
        },
      }));
      return times;
    },
    []
  );

  /**
   * 永劫商殿：消耗永劫点数升级（所有属性均与数值殿独立，效果在计算时与数值殿累加）。
   * 渡劫成功后，每次购买另需 UPGRADE_TRIBULATION_POINT_COST 点渡劫点。
   */
  const handleBuyRebirthMergedUpgrade = useCallback(
    (id: UpgradeId) => {
      const prev = stateRef.current;
      const label = UPGRADE_METADATA[id]?.name ?? id;
      // 渡劫成功后须另付渡劫点，点数不足不可购买
      if (needTribulationPoint(prev) && availableTribulationPoints(prev) < UPGRADE_TRIBULATION_POINT_COST) {
        return;
      }

      // 「基础数值」独立升级：等级存于 rebirthBaseValueLevel，与数值殿互不影响，效果与数值殿加成累加
      if (id === 'baseValue') {
        const bvLevel = prev.rebirthBaseValueLevel || 0;
        const bvCost = getRebirthBaseValueCost(bvLevel);
        const bvCostNum = bvCost.toNumber();
        if (prev.rebirthPoints < bvCostNum) return;
        setState((p) => ({
          ...p,
          ...payTribulationPoints(p),
          rebirthPoints: p.rebirthPoints - bvCostNum,
          rebirthBaseValueLevel: (p.rebirthBaseValueLevel || 0) + 1,
        }));
        return;
      }

      // 其余属性：与数值殿完全独立，等级仅存于 rebirthMergedLevels，计算时与数值殿效果累加
      const level = prev.rebirthMergedLevels?.[id] || 0;
      // 自动点击频率：永劫殿独立 20 级满级，满级后不可再购
      if (id === 'autoFrequency' && level >= AUTO_FREQ_MAX_LEVEL) return;

      const cost = getRebirthMergedUpgradeCost(id, level);
      const costNum = Math.max(0, cost.toNumber());
      if (prev.rebirthPoints < costNum) return;

      setState((p) => ({
        ...p,
        ...payTribulationPoints(p),
        rebirthPoints: p.rebirthPoints - costNum,
        rebirthMergedLevels: {
          ...p.rebirthMergedLevels,
          [id]: (p.rebirthMergedLevels?.[id] || 0) + 1,
        },
      }));
    }, []);

  /**
   * 永劫殿：把指定属性一次性升到当前可及的圆满等级（升级量 MAX）。
   * 规则与 getBulkRebirthUpgradeResult 同源（逐级贪心），故按钮展示的消耗即实际扣除值。
   * @returns 本次实际升的级数（0 = 未升级）
   */
  const handleBuyRebirthMergedUpgradeMax = useCallback(
    (id: UpgradeId, maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      const level =
        id === 'baseValue' ? prev.rebirthBaseValueLevel || 0 : prev.rebirthMergedLevels?.[id] || 0;

      const { levels, cost } = getBulkRebirthUpgradeResult(
        id,
        level,
        Math.max(0, prev.rebirthPoints || 0),
        // 本次次数上限 + 渡劫点限制 + 两殿概率合计不超 100% 的限制
        Math.min(
          maxLevels,
          pointLevelLimit(prev),
          getRebirthChanceHeadroom(calculateGameAttributes(prev), id)
        ),
        // 与永劫殿按钮展示同源：线性涨价走闭式累计消耗 + 二分
        (count) => getRebirthBulkUpgradeCost(id, level, count)
      );
      if (levels <= 0) return 0;

      setState((p) => ({
        ...p,
        rebirthPoints: Math.max(0, p.rebirthPoints - cost),
        ...(id === 'baseValue'
          ? { rebirthBaseValueLevel: (p.rebirthBaseValueLevel || 0) + levels }
          : {
              rebirthMergedLevels: {
                ...p.rebirthMergedLevels,
                [id]: (p.rebirthMergedLevels?.[id] || 0) + levels,
              },
            }),
        ...payTribulationPointsTimes(p, levels),
      }));
      return levels;
    },
    []
  );

  /** 永劫商殿：消耗 5 点永劫值解锁坍缩 */
  const handleUnlockCollapse = useCallback(() => {
    setState((prev) => {
      if (prev.collapseUnlocked || prev.rebirthPoints < COLLAPSE_COST) return prev;
      return {
        ...prev,
        rebirthPoints: prev.rebirthPoints - COLLAPSE_COST,
        collapseUnlocked: true,
      };
    });
    addToast('坍缩觉醒', `消耗 ${COLLAPSE_COST} 点永劫值 · 太虚坍缩已开启`);
  }, [addToast]);

  /**
   * 往生殿·天雷峰：渡劫结算
   * - 由展示层按 3 秒一道的节奏降下雷劫，每一道的判定结果由 `resolveTribulation` 预先给出
   * - 点击「渡劫」的瞬间即结算，避免中途关闭弹窗逃避失败
   * - 成败由渡劫弹窗内的「渡劫效果」面板呈现，此处不弹 toast
   * - 渡劫次数：无论成败都 +1（上限 TRIBULATION_MAX_COUNT），它同时是收益的次方指数
   * - 成功：仅扣除本次消耗与渡劫丹
   * - 失败：数值属性尽数回到初始值（数值 / 各殿等级 / 货币 / 解锁开关全部归零），
   *   仅保留存档属性（游玩时长 / 总点击次数 / 渡劫次数等历世之迹，见 ARCHIVE_KEYS）
   */
  const handleTribulation = useCallback((outcome: TribulationOutcome) => {
    const prev = stateRef.current;
    if ((prev.tribulationCount || 0) >= TRIBULATION_MAX_COUNT) return;
    if (prev.afterlifePoints < TRIBULATION_COST) return;

    if (!outcome.success) {
      // 失败：数值属性回到初始值，存档属性原样保留；渡劫次数同样 +1
      const nextCount = Math.min(TRIBULATION_MAX_COUNT, (prev.tribulationCount || 0) + 1);
      const next = { ...resetToInitialState(prev), tribulationCount: nextCount };
      setState(next);
      setCurrentBigNum(BigNum.fromData(next.currentValue));
      // 渡劫次数类成就：失败同样计入次数
      checkAchievements({ tribulationCount: nextCount });
      return;
    }

    const newCount = Math.min(TRIBULATION_MAX_COUNT, (prev.tribulationCount || 0) + 1);

    setState((p) => ({
      ...p,
      // 成功：仅扣除本次消耗
      afterlifePoints: Math.max(0, p.afterlifePoints - TRIBULATION_COST),
      // 本次消耗的渡劫丹
      tribulationPills: Math.max(0, (p.tribulationPills || 0) - outcome.pillsUsed),
      // 一旦成功即永久为真（未成功前次方不参与计算）
      tribulationSuccess: true,
      // 渡劫次数：成败均 +1（它即收益的次方指数）
      tribulationCount: newCount,
    }));
    // 渡劫次数类成就
    checkAchievements({ tribulationCount: newCount });
  }, [checkAchievements]);

  /** 往生殿：消耗 100 往生点解锁「渡劫」（解锁后才显示天雷峰入口） */
  const handleUnlockTribulation = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (prev.tribulationUnlocked || prev.afterlifePoints < TRIBULATION_UNLOCK_COST) return prev;
      done = true;
      return {
        ...prev,
        afterlifePoints: prev.afterlifePoints - TRIBULATION_UNLOCK_COST,
        tribulationUnlocked: true,
      };
    });
    if (done) {
      addToast(
        '渡劫洞开',
        `消耗 ${TRIBULATION_UNLOCK_COST} 点往生点 · 天雷峰已开，成则飞升成仙，败则飞禽走兽`
      );
    }
  }, [addToast]);

  /** 往生殿·天雷峰：购买渡劫丹（300 往生点/颗，库存 +1，渡劫时每道雷劫消耗 1 颗保过） */
  const handleBuyTribulationPill = useCallback(() => {
    let done = false;
    let newPills = 0;
    setState((prev) => {
      if (prev.afterlifePoints < TRIBULATION_PILL_COST) return prev;
      done = true;
      newPills = (prev.tribulationPills || 0) + 1;
      return {
        ...prev,
        afterlifePoints: prev.afterlifePoints - TRIBULATION_PILL_COST,
        tribulationPills: newPills,
      };
    });
    if (done) {
      addToast('渡劫丹', `持有 ${newPills} 颗 · 消耗 ${TRIBULATION_PILL_COST} 点往生点`);
    }
  }, [addToast]);

  /** 坍缩商殿：消耗按等差数列递增（2×等级，差值 2）的坍缩点数，提升数值上限 */
  const handleBuyValueCap = useCallback(() => {
    // 级数与扣费一律以 setState 内的最新 state 为准：
    // 若先读 stateRef 再算 nextLevel，连点时两次点击会算出同一个级数，
    // 结果扣了两次点数却只升 1 级。
    setState((p) => {
      const nextLevel = (p.valueCapLevel || 0) + 1;
      const cost = getValueCapCost(nextLevel);
      if (!BigNum.fromNumber(p.collapsePoints).gte(cost)) return p;
      return {
        ...p,
        collapsePoints: Math.max(0, p.collapsePoints - cost.toNumber()),
        valueCapLevel: nextLevel,
      };
    });
  }, []);

  /** 坍缩商殿：购买「永劫点数获取」，消耗按 2^n 递增的坍缩点数 */
  const handleBuyRebirthPointLevel = useCallback(() => {
    const prev = stateRef.current;
    const level = prev.rebirthPointLevel || 0;
    const cost = getRebirthPointUpgradeCost(level);

    if (!BigNum.fromNumber(prev.collapsePoints).gte(cost)) return;

    const costNum = cost.toNumber();

    setState((p) => ({
      ...p,
      collapsePoints: Math.max(0, p.collapsePoints - costNum),
      rebirthPointLevel: level + 1,
    }));
  }, []);

  /** 坍缩商殿：数值上限 —— 一次连购到买不动（升级量 MAX） */
  const handleBuyValueCapMax = useCallback((maxLevels: number = Infinity): number => {
    const prev = stateRef.current;
    const start = prev.valueCapLevel || 0;
    const { levels, cost } = planBulkBuy(
      start,
      Math.max(0, prev.collapsePoints),
      (lv) => getValueCapCost(lv + 1).toNumber(),
      maxLevels,
      // 与「数值上限」按钮展示同源：线性涨价走闭式累计消耗 + 二分
      (count) => getValueCapBulkCost(start, count)
    );
    if (levels <= 0) return 0;

    setState((p) => ({
      ...p,
      collapsePoints: Math.max(0, p.collapsePoints - cost),
      valueCapLevel: (p.valueCapLevel || 0) + levels,
    }));
    return levels;
  }, []);

  /** 坍缩商殿：永劫爆炸 —— 一次连购到买不动（升级量） */
  const handleBuyRebirthPointLevelMax = useCallback(
    (maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      const start = prev.rebirthPointLevel || 0;
      const { levels, cost } = planBulkBuy(
        start,
        Math.max(0, prev.collapsePoints),
        (lv) => getRebirthPointUpgradeCost(lv).toNumber(),
        maxLevels
      );
      if (levels <= 0) return 0;

      setState((p) => ({
        ...p,
        collapsePoints: Math.max(0, p.collapsePoints - cost),
        rebirthPointLevel: (p.rebirthPointLevel || 0) + levels,
      }));
      return levels;
    },
    []
  );

  /** 排行·登录：注册/登录成功，记录账号（登录不设门槛） */
  const handleLogin = useCallback(
    (account: UserAccountData) => {
      setState((prev) => ({ ...prev, account }));
      addToast('天道留名', `账号「${account.userName}」已注册登录`);
    },
    [addToast]
  );

  /** 排行·登录：退出登录（保留历史账号密码，便于再次登录） */
  const handleLogout = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (!prev.account) return prev;
      done = true;
      return {
        ...prev,
        lastCredentials: {
          userName: prev.account.userName,
          password: prev.account.password,
          nickname: prev.account.nickname,
        },
        account: null,
      };
    });
    if (done) addToast('退出登录', '已退出当前账号 · 账号密码已留存');
  }, [addToast]);

  /** 排行·登录：入驻大区（信息已由接口层上报后台） */
  const handleSelectRegion = useCallback(
    (regionId: string, regionName: string) => {
      setState((prev) =>
        prev.account
          ? { ...prev, account: { ...prev.account, regionId, regionName } }
          : prev
      );
      addToast('界域已定', `入驻 ${regionName} · 信息已上报`);
    },
    [addToast]
  );

  /** 永劫商殿：消耗 1 点永劫点数购买「功法无需解锁」特权（永久生效） */
  const handleBuyAutoUnlock = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (prev.upgradesAutoUnlocked || prev.rebirthPoints < AUTO_UNLOCK_COST) {
        return prev;
      }
      done = true;

      // 已购特权：全部功法即刻处于已解锁状态，重生后亦不再回退
      const upgrades = { ...prev.upgrades };
      (Object.keys(upgrades) as UpgradeId[]).forEach((id) => {
        upgrades[id] = { ...upgrades[id], unlocked: true };
      });

      return {
        ...prev,
        rebirthPoints: prev.rebirthPoints - AUTO_UNLOCK_COST,
        upgradesAutoUnlocked: true,
        upgrades,
      };
    });
    if (done) {
      addToast(
        '功法通明',
        `消耗 ${AUTO_UNLOCK_COST} 点永劫点数 · 功法无需解锁，可直接升级`
      );
    }
  }, [addToast]);



  /** 坍缩商殿：消耗 20 点坍缩点数解锁「往生殿」（一次性，永久生效，默认不显示） */
  const handleUnlockAfterlifeShop = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (prev.afterlifeShopUnlocked || prev.collapsePoints < AFTERLIFE_SHOP_UNLOCK_COST) {
        return prev;
      }
      done = true;
      return {
        ...prev,
        collapsePoints: prev.collapsePoints - AFTERLIFE_SHOP_UNLOCK_COST,
        afterlifeShopUnlocked: true,
      };
    });
    if (done) {
      addToast(
        '往生洞开',
        `消耗 ${AFTERLIFE_SHOP_UNLOCK_COST} 点坍缩点数 · 永劫殿升级消耗可进一步折扣`
      );
    }
  }, [addToast]);

  /** 往生殿：消耗坍缩点兑换往生点（恒定 10:1；amount 为兑换次数，'all' = 全部可兑换） */
  const handleExchangeAfterlifePoint = useCallback((amount: number | 'all' = 1) => {
    const prev = stateRef.current;
    const unitCost = AFTERLIFE_POINT_EXCHANGE_COST;
    if (!Number.isFinite(unitCost) || unitCost <= 0) return;

    const affordable = Math.floor(prev.collapsePoints / unitCost);
    const times = amount === 'all' ? affordable : Math.min(Math.floor(amount), affordable);
    if (times <= 0) return;

    setState((p) => ({
      ...p,
      collapsePoints: Math.max(0, p.collapsePoints - unitCost * times),
      afterlifePoints: p.afterlifePoints + times,
    }));

    addToast('往生点', `消耗 ${unitCost * times} 点坍缩点数 · 兑换 ${times} 点往生点`);
  }, [addToast]);

  /**
   * 往生殿：购买指定属性的往生强化
   * 消耗统一的斐波那契数列往生点（1、1、2、3、5…），放大永劫殿对应属性的累计加成。
   */
  const handleBuyAfterlifeUpgrade = useCallback(
    (id: UpgradeId) => {
      let done = false;
      let newLevel = 0;
      setState((prev) => {
        // 兼容旧存档：字段缺失时按全 0 计
        const levels: Record<UpgradeId, number> =
          prev.afterlifeUpgradeLevels || INITIAL_STATE.afterlifeUpgradeLevels;
        const level = levels[id] || 0;
        const cost = getAfterlifeUpgradeCost(level);
        if (prev.afterlifePoints < cost) return prev;
        done = true;
        newLevel = level + 1;
        return {
          ...prev,
          afterlifePoints: prev.afterlifePoints - cost,
          afterlifeUpgradeLevels: { ...levels, [id]: newLevel },
        };
      });
    }, []);

  /** 往生殿：属性强化 —— 一次连购到买不动（升级量） */
  const handleBuyAfterlifeUpgradeMax = useCallback(
    (id: UpgradeId, maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      const levels: Record<UpgradeId, number> =
        prev.afterlifeUpgradeLevels || INITIAL_STATE.afterlifeUpgradeLevels;
      const start = levels[id] || 0;
      const bulk = planBulkBuy(
        start,
        Math.max(0, prev.afterlifePoints),
        (lv) => getAfterlifeUpgradeCost(lv),
        maxLevels
      );
      if (bulk.levels <= 0) return 0;

      setState((p) => ({
        ...p,
        afterlifePoints: Math.max(0, p.afterlifePoints - bulk.cost),
        afterlifeUpgradeLevels: {
          ...p.afterlifeUpgradeLevels,
          [id]: (p.afterlifeUpgradeLevels?.[id] || 0) + bulk.levels,
        },
      }));
      return bulk.levels;
    },
    []
  );

  /** 往生殿：消耗往生点提升「永劫点上限」（每级提升量递增，消耗为斐波那契 1,1,2,3,5…） */
  const handleBuyRebirthCapUpgrade = useCallback(() => {
    let done = false;
    let newLevel = 0;
    setState((prev) => {
      const level = prev.rebirthCapLevel || 0;
      const cost = getRebirthCapUpgradeCost(level);
      if (prev.afterlifePoints < cost) return prev;
      done = true;
      newLevel = level + 1;
      return {
        ...prev,
        afterlifePoints: prev.afterlifePoints - cost,
        rebirthCapLevel: newLevel,
      };
    });
  }, []);

  /** 往生殿：永劫点上限 —— 一次连购到买不动（升级量） */
  const handleBuyRebirthCapUpgradeMax = useCallback(
    (maxLevels: number = Infinity): number => {
      const prev = stateRef.current;
      const start = prev.rebirthCapLevel || 0;
      const { levels, cost } = planBulkBuy(
        start,
        Math.max(0, prev.afterlifePoints),
        (lv) => getRebirthCapUpgradeCost(lv),
        maxLevels,
        // 与「永劫点上限」按钮展示同源：斐波那契涨价走闭式累计消耗 + 二分
        (count) => getRebirthCapBulkCost(start, count)
      );
      if (levels <= 0) return 0;

      setState((p) => ({
        ...p,
        afterlifePoints: Math.max(0, p.afterlifePoints - cost),
        rebirthCapLevel: (p.rebirthCapLevel || 0) + levels,
      }));
      return levels;
    },
    []
  );

  /** 往生殿：消耗 10 点往生点解锁「升级量」开关（解锁后数值殿 / 永劫殿才显示该开关） */
  const handleUnlockOneKeyUpgrade = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (prev.oneKeyUpgradeUnlocked || prev.afterlifePoints < ONE_KEY_UPGRADE_UNLOCK_COST) {
        return prev;
      }
      done = true;
      return {
        ...prev,
        afterlifePoints: prev.afterlifePoints - ONE_KEY_UPGRADE_UNLOCK_COST,
        oneKeyUpgradeUnlocked: true,
      };
    });
    if (done) {
      addToast(
        '升级量开关',
        `消耗 ${ONE_KEY_UPGRADE_UNLOCK_COST} 点往生点 · 数值殿 / 永劫殿已可一键升到圆满`
      );
    }
  }, [addToast]);

  /** 永劫商殿：消耗 1 点永劫点数解锁排行 */
  const handleUnlockRanking = useCallback(() => {
    let done = false;
    setState((prev) => {
      if (prev.rankingUnlocked || prev.rebirthPoints < RANKING_UNLOCK_COST) {
        return prev;
      }
      done = true;
      return {
        ...prev,
        rebirthPoints: prev.rebirthPoints - RANKING_UNLOCK_COST,
        rankingUnlocked: true,
      };
    });
    if (done) {
      addToast('天榜开启', `消耗 ${RANKING_UNLOCK_COST} 点永劫点数 · 天道有榜，各归其位`);
    }
  }, [addToast]);

  /** 坍缩商殿：消耗永劫点数兑换坍缩点数（恒定 3:1；amount 为兑换次数，'all' = 全部可兑换） */
  const handleExchangeRebirthToCollapse = useCallback((amount: number | 'all' = 1) => {
    const prev = stateRef.current;
    const unitCost = getRebirthToCollapseCost(prev.rebirthToCollapseCount || 0).toNumber();
    if (!Number.isFinite(unitCost) || unitCost <= 0) return;

    const affordable = Math.floor(prev.rebirthPoints / unitCost);
    const times = amount === 'all' ? affordable : Math.min(Math.floor(amount), affordable);
    if (times <= 0) return;

    setState((p) => ({
      ...p,
      rebirthPoints: Math.max(0, p.rebirthPoints - unitCost * times),
      collapsePoints: p.collapsePoints + times,
      rebirthToCollapseCount: (p.rebirthToCollapseCount || 0) + times,
    }));

    addToast('点化坍缩', `+${times} 点坍缩点数`);
  }, [addToast]);

  /** 永劫：数值须 ≥ 100 万；所得点数 = 数值 ÷ 100 万，再加上「永劫爆炸」的加成（每 100 万 +0.2 × 等级） */
  const confirmRebirth = useCallback(() => {
    // 门槛：数值必须达到 100 万
    if (bigNumRef.current.lt(REBIRTH_THRESHOLD)) return;

    // 起始数值 = 成就奖励之和（可与其他数值来源累加）
    const startValue = getRebirthStartValue(stateRef.current);
    // 数值 ÷ 100 万（300 万即 3 点）+「永劫爆炸」升级的额外点数
    const gain =
      getRebirthPointsFromValue(bigNumRef.current) +
      getExtraRebirthPoints(getEffectiveRebirthPointLevel(stateRef.current), bigNumRef.current);
    // 获取上限：(数值 + 加成) ÷ 100 万 超过上限时，所得即为上限
    const cap = getRebirthPointsCap(stateRef.current.rebirthCapLevel || 0);
    const actualGain = Math.min(gain, cap);

    setState((prev) => ({
      ...prev,
      currentValue: startValue.toData(),
      // 本世点击清零（功法需重新以点击解锁），累计点击保留（成就进度不回退）
      clickCount: 0,
      rebirthCount: prev.rebirthCount + 1,
      // 持有量无上限：上限只作用于本次所得（actualGain 已封顶）
      rebirthPoints: prev.rebirthPoints + actualGain,
      // 已购「功法无需解锁」特权：重生后仍保持解锁态，可直接升级
      // 数值殿等级全部清零；永劫殿等级（rebirthMergedLevels / rebirthBaseValueLevel）为永久道基，不受影响
      upgrades: resetUpgradeLevels(prev.upgrades, prev.upgradesAutoUnlocked),
      // 数值重置丹保留的数值殿效果属数值属性，随转世一并归零（丹药存量仍保留）
      valueResetLevels: { ...INITIAL_STATE.valueResetLevels },
    }));

    setCurrentBigNum(startValue);

    addToast('永劫成功', '');
  }, [addToast]);

  /** 坍缩：献祭 5 点永劫值，坍缩层数以 2 为等差递增 */
  const confirmCollapse = useCallback(() => {
    if (stateRef.current.rebirthPoints < COLLAPSE_COST) return;

    const collapseGain = 1 + stateRef.current.collapsePoints * 2;
    // 坍缩同为转世：起始数值同样取成就奖励之和
    const startValue = getRebirthStartValue(stateRef.current);

    setState((prev) => ({
      ...prev,
      currentValue: startValue.toData(),
      // 坍缩同为转世：本世点击清零，累计点击保留
      clickCount: 0,
      rebirthPoints: prev.rebirthPoints - COLLAPSE_COST,
      collapsePoints: prev.collapsePoints + collapseGain,
      upgrades: resetUpgradeLevels(prev.upgrades, prev.upgradesAutoUnlocked),
      // 数值重置丹保留的数值殿效果属数值属性，随转世一并归零（丹药存量仍保留）
      valueResetLevels: { ...INITIAL_STATE.valueResetLevels },
    }));

    setCurrentBigNum(startValue);

    addToast('坍缩证道', `+${collapseGain} 重坍缩`);
  }, [addToast]);

  /** 调试：直接设置当前数值（绕过数值上限，仅供调试使用） */
  const debugSetValue = useCallback((val: BigNum) => {
    setCurrentBigNum(val);
    setState((prev) => ({ ...prev, currentValue: val.toData() }));
  }, []);

  /** 调试：直接设置永劫点数 */
  const debugSetRebirthPoints = useCallback((n: number) => {
    setState((prev) => ({
      ...prev,
      rebirthPoints: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : prev.rebirthPoints,
    }));
  }, []);

  /** 调试：直接设置坍缩点数 */
  const debugSetCollapsePoints = useCallback((n: number) => {
    setState((prev) => ({
      ...prev,
      collapsePoints: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : prev.collapsePoints,
    }));
  }, []);

  /** 关闭挂机收益弹窗 */
  const dismissOfflineReport = useCallback(() => setOfflineReport(null), []);

  /**
   * 重修道途：清空存档与全部进度。
   * 各殿「升级量」开关、弹窗 / 展开 / 页签等界面状态分散在各组件内部，
   * 仅重置 state 无法归零，故清档后直接重载页面，回到真正的全新开局。
   * 注意：重载前必须把 ref 一并同步为初始态——卸载 / pagehide 的落盘兜底读的是 ref，
   * 若不同步，旧进度会被重新写回存档，「重修」看起来要手动刷新才生效。
   */
  const resetProgress = useCallback(() => {
    const freshValue = BigNum.fromData(INITIAL_STATE.currentValue);
    stateRef.current = INITIAL_STATE;
    bigNumRef.current = freshValue;
    playTimeRef.current = INITIAL_STATE.playTimeMs || 0;
    notifiedUnlocks.current.clear();
    setState(INITIAL_STATE);
    setCurrentBigNum(freshValue);
    // 清掉旧存档后重载：无存档时按全新开局初始化（含首次进入提示）
    clearGameState();
    window.location.reload();
  }, []);

  /**
   * 重置游戏数据：彻底清除本地与云端的一切数据。
   * - 登录状态下先注销云端账号（POST /api/user/delete：账号 / 云存档 / 榜上成绩，令牌失效）；
   *   删除失败不阻断本地清除——旧账号若仍在云端，登录后可再次执行清除；
   * - 再复用 resetProgress 清空本地存档并重载页面。
   */
  const wipeAllData = useCallback(async () => {
    const account = stateRef.current.account;
    try {
      if (account?.token) await deleteAccount(account.token);
    } catch {
      // 云端注销失败也继续本地清除
    }
    resetProgress();
  }, [resetProgress]);

  /** 设置：重置往生殿升级（各属性 / 永劫点上限等级归零，不返还已消耗的往生点） */
  const resetAfterlifeUpgrades = useCallback(() => {
    const prev = stateRef.current;
    setState({
      ...prev,
      afterlifeUpgradeLevels: { ...INITIAL_STATE.afterlifeUpgradeLevels },
      rebirthCapLevel: 0,
    });
    resetAmountMode();
    addToast('重置往生殿', '往生殿升级等级已归零 · 不返还已消耗的往生点');
  }, [addToast]);

  /** 设置：重置坍缩殿升级（数值上限 / 永劫爆炸 / 功法等级上限归零，不返还已消耗的坍缩点） */
  const resetCollapseUpgrades = useCallback(() => {
    const prev = stateRef.current;

    // 功法等级上限：购自坍缩殿，一并归零
    const upgrades = { ...prev.upgrades };
    (Object.keys(upgrades) as UpgradeId[]).forEach((id) => {
      upgrades[id] = { ...upgrades[id], capBonus: 0 };
    });

    // 数值上限回落：当前数值若超出新上限，一并压回上限
    const nextCap = getValueCap(0, prev.rebirthCount || 0);
    const clamped = bigNumRef.current.gt(nextCap) ? nextCap : bigNumRef.current;
    if (clamped !== bigNumRef.current) setCurrentBigNum(clamped);

    setState({
      ...prev,
      upgrades,
      valueCapLevel: 0,
      rebirthPointLevel: 0,
      collapseResetLevels: { valueCap: 0, rebirthExplosion: 0 },
      currentValue: clamped.toData(),
    });
    resetAmountMode();
    addToast('重置坍缩殿', '坍缩殿升级等级已归零 · 不返还已消耗的坍缩点');
  }, [addToast]);

  /** 设置：重置永劫殿升级（各属性独立等级归零，不返还已消耗的永劫点数） */
  const resetRebirthUpgrades = useCallback(() => {
    const prev = stateRef.current;
    setState({
      ...prev,
      rebirthMergedLevels: { ...INITIAL_STATE.rebirthMergedLevels },
      rebirthBaseValueLevel: 0,
    });
    resetAmountMode();
    addToast('重置永劫殿', '永劫殿升级等级已归零 · 不返还已消耗的永劫点数');
  }, [addToast]);

  // 派生状态
  const canRebirth = currentBigNum.gte(REBIRTH_THRESHOLD);
  const canCollapse = state.collapseUnlocked && state.rebirthPoints >= COLLAPSE_COST;
  const collapseGain = 1 + state.collapsePoints * 2;

  return {
    state,
    currentBigNum,
    canRebirth,
    canCollapse,
    collapseGain,
    isFirstEntry: isFirstEntryRef.current ?? false,
    handleUserClick,
    handleUnlockUpgrade,
    handleUpgradeLevel,
    handleUpgradeMax,
    handleUnlockAchievements,
    handleUnlockTitles,
    handleGambleSettle,
    handleGambleSettlePoints,
    handleBuyLevelCap,
    handleBuyLevelCapMax,
    handleBuyRebirthPointLevel,
    handleBuyRebirthPointLevelMax,
    handleBuyValueCapMax,
    handleBuyRebirthMergedUpgrade,
    handleBuyRebirthMergedUpgradeMax,
    handleUnlockCollapse,
    handleUnlockTribulation,
    handleTribulation,
    handleBuyTribulationPill,
    handleCraftValueResetPill,
    handleCraftRebirthResetPill,
    handleCraftCollapseResetPill,
    handleUseValueResetPill,
    handleUseRebirthResetPill,
    handleUseCollapseResetPill,
    handleBuyValueCap,
    handleExchangeRebirthToCollapse,
    handleUnlockRanking,
    handleBuyAutoUnlock,
    handleUnlockAfterlifeShop,
    handleExchangeAfterlifePoint,
    handleBuyAfterlifeUpgrade,
    handleBuyAfterlifeUpgradeMax,
    handleBuyRebirthCapUpgrade,
    handleBuyRebirthCapUpgradeMax,
    handleUnlockOneKeyUpgrade,
    handleLogin,
    handleLogout,
    handleSelectRegion,
    confirmRebirth,
    confirmCollapse,
    resetProgress,
    wipeAllData,
    resetAfterlifeUpgrades,
    resetCollapseUpgrades,
    resetRebirthUpgrades,
    offlineReport,
    dismissOfflineReport,
    debugSetValue,
    debugSetRebirthPoints,
    debugSetCollapsePoints,
  };
}
