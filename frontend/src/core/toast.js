/** @file Toast xabarlar va backend xato kodlarini foydalanuvchi tiliga o'girish. */
import { t, getLang } from '../i18n/index.js';

/**
 * Xato kodi -> foydalanuvchi tilidagi matn. O'zbek tilida serverning aniqroq matni afzal,
 * boshqa tilda (server matni o'zbekcha bo'lgani uchun) shu yerdagi tarjima ishlatiladi.
 * @param {string} code @param {string} [fallback]
 */
export function friendlyMessage(code, fallback) {
  const k = `err.${code}`;
  const m = t(k);
  const known = m !== k;
  if (getLang() === 'uz' && fallback && !(known && PREFER_LOCAL[code])) return fallback;
  return known ? m : t('err.unknown');
}

/** O'zbek tilida ham server matni o'rniga bolalarga moslangan matn chiqadigan kodlar (avvalgi xatti-harakat). */
const PREFER_LOCAL = Object.fromEntries(['VALIDATION_ERROR', 'CONFLICT', 'RATE_LIMITED', 'INVALID_CREDENTIALS', 'TOKEN_MISSING', 'TOKEN_INVALID',
  'TOKEN_EXPIRED', 'TOKEN_REUSED', 'TOKEN_USED', 'SESSION_USED', 'TOO_FAST', 'NETWORK_ERROR', 'ROOM_NOT_FOUND', 'ROOM_NOT_ACTIVE',
  'ROOM_NOT_STARTABLE', 'ROOM_FINISHED', 'NO_PLAYERS', 'NOT_A_PARTICIPANT', 'FORBIDDEN', 'WRONG_GAME_TYPE', 'GUEST_NOT_ALLOWED',
  'AUTH_REQUIRED', 'LOCKED', 'QUESTION_PENDING', 'NO_PENDING_QUESTION', 'INVALID_CHOICE', 'PLAYER_FINISHED', 'BLOCKED', 'KICKED', 'ROOM_CLOSED'].map((c) => [c, 1]));

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
  if (d) text += ` (${d.row ? t('err.row', { n: d.row }) : ''}${getLang() === 'uz' ? d.message || d.field || JSON.stringify(d) : d.field || d.path || d.message})`;
  toast(text, 'error');
}
