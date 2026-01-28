import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, _res) => {
            console.error('❌ [Vite Proxy Error]', err.message, 'on', req.method, req.url);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📡 [Vite Proxy] Forwarding:', req.method, req.url, '-> http://localhost:3001' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📨 [Vite Proxy] Response:', proxyRes.statusCode, 'from', req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
