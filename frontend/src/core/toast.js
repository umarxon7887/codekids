/** @file Toast xabarlar va backend xato kodlarini foydalanuvchi tiliga o'girish. */

const MESSAGES = {
  VALIDATION_ERROR: "Kiritilgan ma'lumotlarda xato bor.",
  CONFLICT: 'Bu email allaqachon band.',
  RATE_LIMITED: "Juda ko'p urinish. Biroz kutib qayta urinib ko'ring.",
  INVALID_CREDENTIALS: "Email yoki parol noto'g'ri.",
  TOKEN_MISSING: 'Avval tizimga kiring.',
  TOKEN_INVALID: 'Sessiya yaroqsiz. Qayta kiring.',
  TOKEN_EXPIRED: 'Sessiya tugadi. Qayta kiring.',
  TOKEN_REUSED: 'Xavfsizlik uchun qayta kirishingiz kerak.',
  TOKEN_USED: 'Bu mashq allaqachon yakunlangan. Yangisini boshlang.',
  SESSION_USED: 'Bu sessiya allaqachon ishlatilgan. Yangi o‘yin boshlang.',
  TOO_FAST: 'Juda tez! Biroz sekinroq.',
  NETWORK_ERROR: "Internetga ulanib bo'lmadi. Aloqani tekshiring.",
  ROOM_NOT_FOUND: 'Xona topilmadi. Kodni tekshiring.',
  ROOM_NOT_ACTIVE: "O'yin hali boshlanmagan yoki tugagan.",
  ROOM_NOT_STARTABLE: "Xonani hozir boshlab bo'lmaydi.",
  ROOM_FINISHED: 'Xona yopilgan.',
  NO_PLAYERS: "Xonada o'yinchi yo'q.",
  NOT_A_PARTICIPANT: "Siz bu xonada ishtirokchi emassiz.",
  FORBIDDEN: "Bu amalga ruxsat yo'q.",
  WRONG_GAME_TYPE: "Bu xona boshqa o'yin uchun.",
  GUEST_NOT_ALLOWED: "Mehmonlar bu o'yinda qatnasha olmaydi.",
  AUTH_REQUIRED: 'Avval tizimga kiring.',
  LOCKED: "Siz vaqtincha qulflangansiz, kuting.",
  QUESTION_PENDING: 'Avval savolga javob bering.',
  NO_PENDING_QUESTION: 'Hozir javob kutilayotgan savol yo‘q.',
  INVALID_CHOICE: "Noto'g'ri variant tanlandi.",
  PLAYER_FINISHED: 'Siz allaqachon tugatgansiz.',
  BLOCKED: 'Devor!',
};

/** @param {string} code @param {string} [fallback] */
export const friendlyMessage = (code, fallback) => MESSAGES[code] || fallback || 'Kutilmagan xato yuz berdi.';

/**
 * @param {string} text
 * @param {'info'|'error'|'success'} [type]
 */
export function toast(text, type = 'info') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = text;
  host.appendChild(el);
  setTimeout(() => el.classList.add('toast--out'), 3400);
  setTimeout(() => el.remove(), 3900);
}

/**
 * Har qanday xatoni ko'rsatadi. Validatsiya `details` bo'lsa (masalan CSV qatori), birinchisini qo'shadi.
 * @param {any} err
 */
export function showError(err) {
  let text = friendlyMessage(err?.code, err?.message);
  const d = Array.isArray(err?.details) ? err.details[0] : null;
  if (d) text += ` (${d.row ? `qator ${d.row}: ` : ''}${d.message || d.field || JSON.stringify(d)})`;
  toast(text, 'error');
}
