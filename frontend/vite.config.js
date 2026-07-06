import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — rarely changes, long cache lifetime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Socket.IO client is large; isolate it
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
