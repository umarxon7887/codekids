import { defineConfig } from 'vite';

/**
 * GitHub Pages: base `/codekids/`. Lokal ishlatish uchun: VITE_BASE=/ npm run dev
 * Three.js alohida chunk'ga ajratiladi (faqat labirint ochilganda yuklanadi).
 * Dev rejimida /api va /socket.io lokal backendga (3000) proksi qilinadi:
 * Codespaces'da ham hammasi bitta manzildan ketadi — CORS va cookie muammosi bo'lmaydi.
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/codekids/',
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
