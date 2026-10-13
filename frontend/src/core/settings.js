/** @file Foydalanuvchi sozlamalari: tema, past quvvat rejimi, harakatni kamaytirish. */
const KEY_LP = 'ck_lowpower';

const LIGHT = matchMedia('(prefers-color-scheme: light)');

/** Tema faqat qurilma rejimiga qarab: yorug' bo'lsa yorug', qorong'u bo'lsa qorong'u. */
export function initTheme() {
  const apply = () => { document.documentElement.dataset.theme = LIGHT.matches ? 'light' : 'dark'; };
  apply();
  LIGHT.addEventListener('change', apply);
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
