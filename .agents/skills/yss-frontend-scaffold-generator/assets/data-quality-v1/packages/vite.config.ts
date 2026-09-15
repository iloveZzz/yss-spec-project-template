import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import qiankun from 'vite-plugin-qiankun';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)));
  const port = Number(env.VITE_PORT || 8081);
  return {
    base: env.VITE_PUBLIC_BASE || '/',
    plugins: [vue(), qiankun('__MICROAPP_NAME__', { useDevMode: true })],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }, dedupe: ['vue', 'ant-design-vue', '@ant-design/icons-vue', '@formily/core', '@formily/vue'] },
    css: { preprocessorOptions: { less: { javascriptEnabled: true } } },
    server: { host: '127.0.0.1', port, strictPort: true, cors: true, origin: env.VITE_DEV_ORIGIN || `http://localhost:${port}`, proxy: env.VITE_PROXY_TARGET ? { '/api': { target: env.VITE_PROXY_TARGET, changeOrigin: true } } : undefined },
    build: { target: 'es2020', modulePreload: { polyfill: false } },
  };
});
