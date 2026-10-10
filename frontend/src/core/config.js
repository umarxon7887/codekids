/** @file Markaziy konfiguratsiya (API: /api/v1). Backend manzili .env orqali almashtiriladi. */
const HOST = import.meta.env.VITE_BACKEND_URL || 'https://codekids-api.onrender.com';

export const BACKEND_URL = HOST;
export const API_BASE = `${HOST}/api/v1`;
export const BASE_URL = import.meta.env.BASE_URL;
/** Server harakat cooldown'i 200 ms; biroz zaxira bilan. */
export const MOVE_COOLDOWN_MS = 210;
/** room:snapshot tick 250 ms; progress ham shu oraliqda yuboriladi (limit: 15 event/s). */
export const PROGRESS_INTERVAL_MS = 250;
