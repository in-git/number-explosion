import { useEffect, useState } from 'react';
import { fetchRegions } from '../utils/authApi';

/** 默认入驻大区（最新大区） */
export interface DefaultRegion {
  id: string;
  name: string;
}

/**
 * 默认入驻大区：取大区列表的最后一个（即最新大区）。
 * 排行榜与个人中心的登录注册共用，避免各自重复拉取。
 * 拉取失败 / 未就绪时返回 null，由调用方兜底。
 */
export function useDefaultRegion(): DefaultRegion | null {
  const [region, setRegion] = useState<DefaultRegion | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRegions()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        const last = list[list.length - 1];
        setRegion({ id: last.id, name: last.name });
      })
      .catch(() => {
        /* 大区拉取失败时保持未选区状态 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return region;
}
