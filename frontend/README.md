# CodeKids Frontend (Vite + ES Modules) — API /api/v1

    npm install
    npm run dev        # http://localhost:5173 (LAN: telefonda ham ochiladi)
    npm run build      # -> dist/
    npm run preview    # production buildni sinash (Service Worker faqat shu yerda ishlaydi)

Backend manzili: `.env` ichida `VITE_BACKEND_URL=https://...` (standart: Render backend).
Cookie uchun backendda CORS `credentials: true` + `SameSite=None; Secure` kerak.

## Oqimlar
- Student: login -> Typing Race (yakka) yoki xona kodi -> `/room/:code` (typing yoki labirint avtomatik)
- Teacher: Ustoz paneli -> kontent (matn/CSV) -> Xona yaratish -> `/host/:code` (start, reyting)
- Mehmon: `#/guest` — login'siz, natija saqlanmaydi
