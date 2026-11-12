import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Cloudflare Web Analytics：把 index.html 里的 %CF_BEACON_TOKEN% 替换成真实 token。
 * token 未配置时整段移除，避免线上出现一个报错的 beacon。
 */
function cfWebAnalytics(token: string): Plugin {
  return {
    name: 'cf-web-analytics',
    transformIndexHtml(html) {
      if (!token) {
        return html.replace(
          /\n\s*<!-- CF Analytics:[\s\S]*?<\/script>/,
          '\n',
        );
      }
      return html.replace('%CF_BEACON_TOKEN%', token);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const beaconToken = (env.VITE_CF_BEACON_TOKEN || process.env.VITE_CF_BEACON_TOKEN || '').trim();

  return {
    base: './',
    plugins: [react(), tailwindcss(), cfWebAnalytics(beaconToken)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
