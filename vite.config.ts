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
    port: 8989,
    server: {
      // 排行/账号接口转发到后端（/api/time 仍由本地中间件提供，不做代理）
      proxy: {
        '/api/leaderboard': 'http://localhost:3001',
        '/api/auth': 'http://localhost:3001',
        '/api/regions': 'http://localhost:3001',
        '/api/user': 'http://localhost:3001',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
