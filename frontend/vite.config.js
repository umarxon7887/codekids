import { defineConfig } from 'vite';

/**
 * GitHub Pages: base `/codekids/`. Lokal ishlatish uchun: VITE_BASE=/ npm run dev
 * Three.js alohida chunk'ga ajratiladi (faqat labirint ochilganda yuklanadi).
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/codekids/',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
