import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    strictPort: false,
    open: false,
    hmr: {
      clientPort: 5173,
      host: 'localhost'
    },
    proxy: {
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, '')
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate'
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          pdf: ['jspdf', 'html2canvas'],
          xlsx: ['xlsx'],
          qrcode: ['qrcode'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'jspdf', 'qrcode', 'xlsx']
  }
});