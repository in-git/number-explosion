import { useCallback, useEffect, useRef, useState } from 'react';
import { BigNum } from '../utils/bigNumber';
import { GameState, UpgradeId } from '../types';
import { SettleType } from '../components/FunShop';
import {
  UPGRADE_METADATA,
  executeClickCalculation,
  getAutoClickRate,
  getOfflineGain,
  COLLAPSE_COST,
  LEVEL_CAP_PER_POINT,
  getValueCap,
  getRebirthStartValue,
  getRebirthPointUpgradeCost,
  getExtraRebirthPoints,
} from '../utils/gameMath';
import { resetUpgradeLevels } from '../utils/state';
import { clearGameState, loadGameState, saveGameState } from '../utils/storage';
import { formatDuration, syncServerTime } from '../utils/serverTime';
import {
  ACHIEVEMENTS,
  INITIAL_REBIRTH_BASE_ATTRS,
  INITIAL_STATE,
  OFFLINE_MAX_MS,
  OFFLINE_MIN_MS,
  REBIRTH_BASE_ATTR_LABELS,
  REBIRTH_BASE_ATTR_PURCHASE_GAINS,
  REBIRTH_THRESHOLD,
  SERVER_TIME_SYNC_INTERVAL_MS,
  UPGRADE_ORDER,
} from '../config';
import { FloatingTextType } from './useFloatingTexts';

interface UseGameStateDeps {
  addToast: (title: string, content: string) => void;
  addFloatingText: (text: string, type: FloatingTextType) => void;
}

/** 单次自动点击最多补算的次数 */
const MAX_BATCH_CLICKS = 100;

/**
 * 游戏核心状态与全部玩法逻辑（数值、点击、升级、商店、重生、坍缩）
 */
export function useGameState({ addToast, addFloatingText }: UseGameStateDeps) {
  const [state, setState] = useState<GameState>(loadGameState);
  const [currentBigNum, setCurrentBigNum] = useState<BigNum>(() =>
    BigNum.fromData(state.currentValue)
  );

  // 已提示过的解锁（以存档为准，刷新后不会重复提示）
  const notifiedUnlocks = useRef<Set<string>>(new Set(state.notifiedUnlocks || []));

  // 供定时器 / 事件回调读取最新值
  const stateRef = useRef(state);
  stateRef.current = state;
  const bigNumRef = useRef(currentBigNum);
  bigNumRef.current = currentBigNum;

  // Auto-save
  useEffect(() => {
    saveGameState(state, currentBigNum.toData());
  }, [state, currentBigNum]);

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

  /** 提交数值：任何途径获得的数值都不得突破「数值上限」 */
  const commitValue = useCallback((val: BigNum) => {
    const cap = getValueCap(stateRef.current.valueCapLevel || 0);
    const next = val.gt(cap) ? cap : val;
    setCurrentBigNum(next);
    setState((prev) => ({ ...prev, currentValue: next.toData() }));
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
        addToast('解锁重生', '');
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
   * 离线收益结算（每次进入界面仅执行一次）
   * 以服务器时间计算离线时长：< 3 分钟不计，最多结算 1 天
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

      const elapsed = serverNow - lastActiveAt;
      if (elapsed < OFFLINE_MIN_MS) return;

      const cappedMs = Math.min(elapsed, OFFLINE_MAX_MS);
      const gain = getOfflineGain(stateRef.current, cappedMs / 1000);
      if (gain.m === 0) return;

      const before = bigNumRef.current;
      const after = commitValue(before.add(gain));
      // 受数值上限截断后的实际入账
      const actual = after.sub(before);
      if (actual.m === 0) return;

      const cappedNote = elapsed > OFFLINE_MAX_MS ? ' · 已按上限 1 天结算' : '';
      addToast(
        '离线参玄',
        `离线 ${formatDuration(cappedMs)} · 自动行功入账 ${actual.formatChinese(2)}${cappedNote}`
      );

      checkUnlockTriggers(stateRef.current.clickCount, after);
    })();

    return () => {
      cancelled = true;
    };
  }, [addToast, checkUnlockTriggers, commitValue]);

  /**
   * 成就结算：以「历世累计点击次数」为门槛，达成就一次性写入存档并提示
   */
  const checkAchievements = useCallback(
    (totalClicks: number) => {
      const unlocked = new Set(stateRef.current.unlockedAchievements || []);
      const fresh = ACHIEVEMENTS.filter(
        (a) => totalClicks >= a.requiredClicks && !unlocked.has(a.id)
      );
      if (fresh.length === 0) return;

      fresh.forEach((a) => {
        unlocked.add(a.id);
        addToast(
          '成就达成',
          `成就「${a.name}」· ${a.desc} · 重生初始数值 +${a.rebirthStartValue.toLocaleString('zh-CN')}`
        );
      });

      setState((prev) => ({ ...prev, unlockedAchievements: [...unlocked] }));
    },
    [addToast]
  );

  /** 用户手动点击 */
  const handleUserClick = useCallback(() => {
    const currentState = stateRef.current;
    const currentVal = bigNumRef.current;
    const newClickCount = currentState.clickCount + 1;
    const newTotalClickCount = (currentState.totalClickCount || 0) + 1;

    const result = executeClickCalculation(currentState);
    const nextVal = currentVal.add(result.gainedValue);

    if (result.isCrit && result.isCombo) {
      addFloatingText(`连击暴击 +${result.gainedValue.formatChinese(2)}`, 'crit-combo');
    } else if (result.isCrit) {
      addFloatingText(`暴击 +${result.gainedValue.formatChinese(2)}`, 'crit');
    } else if (result.isCombo) {
      addFloatingText(`连击 +${result.gainedValue.formatChinese(2)}`, 'combo');
    } else {
      addFloatingText(`+${result.gainedValue.formatChinese(2)}`, 'normal');
    }

    const finalVal = commitValue(nextVal);

    setState((prev) => ({
      ...prev,
      clickCount: newClickCount,
      totalClickCount: newTotalClickCount,
    }));

    // 功法解锁看本世点击，成就看累计点击
    checkUnlockTriggers(newClickCount, finalVal);
    checkAchievements(newTotalClickCount);
  }, [addFloatingText, checkAchievements, checkUnlockTriggers, commitValue]);

  /** 解锁功法 */
  const handleUnlockUpgrade = useCallback(
    (id: UpgradeId, cost: BigNum) => {
      const currentVal = bigNumRef.current;
      if (!currentVal.gte(cost)) return;

      commitValue(currentVal.sub(cost));

      setState((prev) => ({
        ...prev,
        upgrades: {
          ...prev.upgrades,
          [id]: { ...prev.upgrades[id], unlocked: true },
        },
      }));

      addToast(`解锁 ${UPGRADE_METADATA[id].name}`, '');
    },
    [addToast, commitValue]
  );

  /** 提升功法等级 */
  const handleUpgradeLevel = useCallback(
    (id: UpgradeId, cost: BigNum) => {
      const currentVal = bigNumRef.current;
      if (!currentVal.gte(cost)) return;

      commitValue(currentVal.sub(cost));

      setState((prev) => {
        const up = prev.upgrades[id];
        return {
          ...prev,
          upgrades: {
            ...prev.upgrades,
            [id]: { ...up, level: up.level + 1 },
          },
        };
      });
    },
    [commitValue]
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
        // 功法等级 + 重生商店购买的永久频率等级加成
        const autoFreqLevel =
          (autoFreq.unlocked ? autoFreq.level : 0) +
          (currentState.rebirthBaseAttrs?.autoFrequency || 0);
        const rate = getAutoClickRate(autoFreqLevel);
        const clicksPerMs = rate.clicksPerMs > 0 ? rate.clicksPerMs : 1 / rate.intervalMs;

        accumulator += delta * clicksPerMs;

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

          if (batchGained.gt(0)) {
            const nextVal = commitValue(bigNumRef.current.add(batchGained));
            checkUnlockTriggers(currentState.clickCount, nextVal);
          }

          // 抽样飘字，避免刷屏
          if (Math.random() < 0.25 && sampleResult) {
            if (sampleResult.isCrit && sampleResult.isCombo) {
              addFloatingText(`连击暴击 +${sampleResult.gainedValue.formatChinese(1)}`, 'crit-combo');
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

  /** 奇趣商店结算 */
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

  /** 坍缩商店：消耗 1 点坍缩点数，为指定功法 +50 级上限（由重生商店迁移而来） */
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
      addToast(
        '境界突破',
        `${UPGRADE_METADATA[id].name} 等级上限 +${LEVEL_CAP_PER_POINT}（消耗 1 点坍缩点数）`
      );
    },
    [addToast]
  );

  /** 重生商店：消耗 1 点重生点数，单独提升某一重生基础属性 */
  const handleBuyRebirthBaseAttr = useCallback(
    (key: keyof typeof REBIRTH_BASE_ATTR_PURCHASE_GAINS) => {
      setState((prev) => {
        if (prev.rebirthPoints < 1) return prev;
        const rebirthBase = prev.rebirthBaseAttrs || INITIAL_REBIRTH_BASE_ATTRS;
        const next = { ...rebirthBase, [key]: rebirthBase[key] + REBIRTH_BASE_ATTR_PURCHASE_GAINS[key] };
        return {
          ...prev,
          rebirthPoints: prev.rebirthPoints - 1,
          rebirthBaseAttrs: next,
        };
      });
      const gain = REBIRTH_BASE_ATTR_PURCHASE_GAINS[key];
      const gainText = key === 'autoFrequency' ? `+${gain} 级` : `+${gain}`;
      addToast('道基淬炼', `重生基础属性「${REBIRTH_BASE_ATTR_LABELS[key]}」提升 ${gainText}`);
    },
    [addToast]
  );

  /** 重生商店：消耗 5 点重生值解锁坍缩 */
  const handleUnlockCollapse = useCallback(() => {
    setState((prev) => {
      if (prev.collapseUnlocked || prev.rebirthPoints < COLLAPSE_COST) return prev;
      return {
        ...prev,
        rebirthPoints: prev.rebirthPoints - COLLAPSE_COST,
        collapseUnlocked: true,
      };
    });
    addToast('坍缩觉醒', `消耗 ${COLLAPSE_COST} 点重生值 · 太虚坍缩已开启`);
  }, [addToast]);

  /** 坍缩商店：消耗 1 点坍缩点数，数值上限翻倍 */
  const handleBuyValueCap = useCallback(() => {
    const nextLevel = (stateRef.current.valueCapLevel || 0) + 1;
    setState((prev) => {
      if (prev.collapsePoints < 1) return prev;
      return {
        ...prev,
        collapsePoints: prev.collapsePoints - 1,
        valueCapLevel: nextLevel,
      };
    });
    addToast('天道扩容', `数值上限翻倍 → ${getValueCap(nextLevel).formatChinese(2)}`);
  }, [addToast]);

  /** 坍缩商店：购买「重生点数获取」，消耗按斐波拉契递增的坍缩点数 */
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

    addToast(
      '天命加身',
      `重生时额外 +1 点重生点数（当前 +${level + 1}）· 消耗 ${cost.formatChinese(0)} 点坍缩点数`
    );
  }, [addToast]);

  /** 重生：数值达百万即可（无次数限制），基础 +1 点，再加上「重生点数获取」的加成 */
  const confirmRebirth = useCallback(() => {
    // 起始数值 = 成就奖励之和（可与其他数值来源累加）
    const startValue = getRebirthStartValue(stateRef.current);
    // 基础 1 点 + 「重生点数获取」升级的额外点数
    const gain = 1 + getExtraRebirthPoints(stateRef.current.rebirthPointLevel || 0);

    setState((prev) => ({
      ...prev,
      currentValue: startValue.toData(),
      // 本世点击清零（功法需重新以点击解锁），累计点击保留（成就进度不回退）
      clickCount: 0,
      rebirthCount: prev.rebirthCount + 1,
      rebirthPoints: prev.rebirthPoints + gain,
      upgrades: resetUpgradeLevels(prev.upgrades),
    }));

    setCurrentBigNum(startValue);

    addToast(
      '重生圆满',
      startValue.m === 0
        ? `+${gain} 点重生点数`
        : `+${gain} 点重生点数 · 起始数值 ${startValue.formatChinese(2)}`
    );
  }, [addToast]);

  /** 坍缩：献祭 5 点重生值，坍缩层数以 2 为等差递增 */
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
      upgrades: resetUpgradeLevels(prev.upgrades),
    }));

    setCurrentBigNum(startValue);

    addToast('坍缩证道', `+${collapseGain} 重坍缩`);
  }, [addToast]);

  /** 调试：直接设置当前数值（绕过数值上限，仅供调试使用） */
  const debugSetValue = useCallback((val: BigNum) => {
    setCurrentBigNum(val);
    setState((prev) => ({ ...prev, currentValue: val.toData() }));
  }, []);

  /** 重修道途：清空存档与全部进度 */
  const resetProgress = useCallback(() => {
    clearGameState();
    setState(INITIAL_STATE);
    setCurrentBigNum(new BigNum(0, 0));
    notifiedUnlocks.current.clear();
  }, []);

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
    handleUserClick,
    handleUnlockUpgrade,
    handleUpgradeLevel,
    handleGambleSettle,
    handleBuyLevelCap,
    handleBuyRebirthPointLevel,
    handleBuyRebirthBaseAttr,
    handleUnlockCollapse,
    handleBuyValueCap,
    confirmRebirth,
    confirmCollapse,
    resetProgress,
    debugSetValue,
  };
}
