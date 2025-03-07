import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // 📦 Build sẽ xuất ra thư mục dist
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000', // 👉 Proxy API requests đến backend khi dev
      '/api/tiki': {
        target: 'https://tiki.vn/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tiki/, '')
      }
    }
  }
});
