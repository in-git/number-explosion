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

/** 开发期后端地址（后端默认 8731），可用 API_TARGET 覆盖 */
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:8731';

export default defineConfig(() => {
  return {
    // 前后端不分离：产物与接口同源，用相对路径 base，挂到任意子路径都能跑
    base: './',
    plugins: [react(), tailwindcss(), serverTimeEndpoint()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },/*  */
    },
    build: {
      // 产物目录（server 会从这里托管静态资源）；可用 --outDir 覆盖
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
    // 生产同源，无需代理；代理只在 dev / preview 阶段生效
    server: {
      port: 5723,
      host: '0.0.0.0',
      // 统一代理：/api 全部转发后端；/api/time 例外，由本地中间件直接返回
      proxy: {
        '/api': {
          target: API_TARGET,
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
    preview: {
      port: 5723,
      // preview 阶段同样代理到后端，便于本地验收生产产物
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          bypass: (req) => (req.url?.startsWith('/api/time') ? req.url : undefined),
        },
      },
    },
  };
});
