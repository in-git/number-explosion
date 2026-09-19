import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * /api/time：返回服务器当前时间戳，供离线收益以服务端时间结算，
 * 防止玩家改本地系统时间卡 BUG。生产环境若没有后端，
 * 前端会自动回退到读取同源响应的 Date 头。
 */
function serverTimeEndpoint(): Plugin {
  const handler = (_req: unknown, res: any, next?: () => void) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({serverTime: Date.now()}));
    next?.();
  };

  return {
    name: 'server-time-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/time', handler as never);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/time', handler as never);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), serverTimeEndpoint()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },/*  */
    },
    port: 5723,
    server: {
      // 统一代理：/api 全部转发后端；/api/time 例外，由本地中间件直接返回
      proxy: {
        '/api': {
          target: 'http://localhost:8731',
          changeOrigin: true,
          // 返回路径 = 不代理（交给 vite 本地中间件）；undefined = 正常代理
          bypass: (req) => (req.url?.startsWith('/api/time') ? req.url : undefined),
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
