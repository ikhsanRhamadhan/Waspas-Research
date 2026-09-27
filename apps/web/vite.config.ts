import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Frontend dan API jalan di dua port berbeda, jadi request /api diproksi Vite.
// Ini membuat frontend selalu memanggil origin yang sama -> tidak ada headache CORS di mode dev.
const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:5000';

const proxy = {
  '/api': {
    target: API_TARGET,
    changeOrigin: true,
  },
  '/health': {
    target: API_TARGET,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy,
  },
  // Preview memakai bundel hasil build, jadi proxy harus sama dengan dev. Tanpa ini
  // `npm run preview` membuka halaman yang isinya 401 semua.
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
