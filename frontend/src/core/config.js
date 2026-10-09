/** @file Markaziy konfiguratsiya (API shartnomasi: /api/v1). */
const HOST = import.meta.env.VITE_BACKEND_URL || 'https://codekids-backend-5asm.onrender.com';

export const BACKEND_URL = HOST;
export const API_BASE = `${HOST}/api/v1`;
/** Server harakat cooldown'i 200 ms; biroz zaxira bilan. */
export const MOVE_COOLDOWN_MS = 210;
/** room:snapshot tick 250 ms; progress ham shu oraliqda yuboriladi (limit: 15 event/s). */
export const PROGRESS_INTERVAL_MS = 250;
