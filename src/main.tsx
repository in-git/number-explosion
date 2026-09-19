import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * 禁用移动端双指缩放。
 * iOS Safari 10+ 会忽略 user-scalable=no，需额外拦截 gesture 事件与多指 touchmove。
 */
function disablePinchZoom() {
  const prevent = (e: Event) => e.preventDefault();
  (['gesturestart', 'gesturechange', 'gestureend'] as const).forEach((type) => {
    document.addEventListener(type, prevent, {passive: false});
  });

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    {passive: false},
  );
}

disablePinchZoom();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
