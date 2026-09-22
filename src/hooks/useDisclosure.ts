import { useCallback, useMemo, useState } from 'react';

export interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/** 弹窗/面板的开合状态 */
export function useDisclosure(): Disclosure {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // 必须缓存对象：每次渲染都新建的话，依赖它的 effect（如「首次进入弹窗」）
  // 会因 deps 变化而在关闭后立刻重跑，表现为弹窗关不掉。
  return useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
}
