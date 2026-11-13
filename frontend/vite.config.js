import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const backendTarget = process.env.VITE_BACKEND_TARGET || 'http://localhost:3000';
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true },
      '/models': { target: backendTarget, changeOrigin: true },
      '/job': { target: backendTarget, changeOrigin: true },
      '/workers': { target: backendTarget, changeOrigin: true },
      '/metrics': { target: backendTarget, changeOrigin: true },
      '/socket.io': { target: backendTarget, changeOrigin: true, ws: true },
    },
  },
});
