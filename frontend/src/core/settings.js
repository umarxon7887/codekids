/** @file Foydalanuvchi sozlamalari: tema, past quvvat rejimi, harakatni kamaytirish. */
const KEY_THEME = 'ck_theme';
const KEY_LP = 'ck_lowpower';

export function initTheme() {
  const saved = localStorage.getItem(KEY_THEME);
  const theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
}

/** @returns {'light'|'dark'} */
export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(KEY_THEME, next);
  return next;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Foydalanuvchi tanlamagan bo'lsa, kuchsiz qurilmada avtomatik yoqiladi. */
export function isLowPower() {
  const v = localStorage.getItem(KEY_LP);
  if (v !== null) return v === '1';
  return (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
}

/** @param {boolean} on */
export function setLowPower(on) {
  localStorage.setItem(KEY_LP, on ? '1' : '0');
  window.dispatchEvent(new CustomEvent('ck:lowpower', { detail: on }));
}
