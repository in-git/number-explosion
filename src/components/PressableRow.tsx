import React from 'react';

/** 长按首次触发的延迟（ms） */
const PRESS_DELAY_MS = 400;
/** 长按持续触发的间隔（ms） */
const PRESS_INTERVAL_MS = 110;

interface PressableRowProps {
  id: string;
  disabled: boolean;
  onPress: () => void;
  className?: string;
  children: React.ReactNode;
}

/** 可长按的行：按下即触发一次，按住不放则持续触发（用于连续升级 / 连购） */
export const PressableRow: React.FC<PressableRowProps> = ({
  id,
  disabled,
  onPress,
  className = '',
  children,
}) => {
  // 始终持有最新的回调，保证连发时使用最新消耗
  const pressRef = React.useRef(onPress);
  pressRef.current = onPress;
  const delayRef = React.useRef<number | null>(null);
  const repeatRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (delayRef.current !== null) window.clearTimeout(delayRef.current);
    if (repeatRef.current !== null) window.clearInterval(repeatRef.current);
    delayRef.current = null;
    repeatRef.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  const start = () => {
    if (disabled) return;
    pressRef.current();
    delayRef.current = window.setTimeout(() => {
      repeatRef.current = window.setInterval(() => pressRef.current(), PRESS_INTERVAL_MS);
    }, PRESS_DELAY_MS);
  };

  return (
    <div
      id={id}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className={className}
    >
      {children}
    </div>
  );
};
