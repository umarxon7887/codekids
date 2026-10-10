# CodeKids Frontend v2 (Vite + ES Modules + Three.js)

    npm install
    npm run dev                 # lokal: VITE_BASE=/ npm run dev (base `/codekids/` bo'lsa http://localhost:5173/codekids/)
    npm run build               # GitHub Pages uchun (base /codekids/) -> dist/
    npm run preview             # Service Worker faqat production buildda ishlaydi

`.env`: `VITE_BACKEND_URL=https://codekids-api.onrender.com` (standart shu).
Boshqa base: `VITE_BASE=/ npm run build`.

## Tuzilma
- `src/core/` — api (refresh), socket, state (token xotirada), settings (tema, past quvvat), roomApi (close/kick)
- `src/games/labyrinth/` — `renderer3d.js` (Three.js, lazy chunk), `renderer2d.js` (WebGL yo'q bo'lsa), `game.js`
- `src/games/typing/` — lobi, o'yin (progress tiklash), progress paneli
- `src/teacher/` — panel, host
- `src/ui/` — auth, room, endscreen
- `src/i18n/` — uz (asosiy), ru (qisman)
