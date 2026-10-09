import { defineConfig } from 'vite';

/** Vite config: dev server LAN'da ochiq (telefondan sinash uchun), build -> dist/ */
export default defineConfig({
 base: process.env.VITE_BASE || '/',
  server: { host: true, port: 5173 },
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 600 },
});
