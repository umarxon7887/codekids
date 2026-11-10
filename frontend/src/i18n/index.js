/**
 * @file i18n: t('kalit', {o'zgaruvchi}). Matnlar s/*.js da: har kalitga [o'zbekcha, ruscha].
 * Til localStorage'da (ck_lang). Til almashganda sahifa qayta yuklanadi (modul darajasidagi matnlar ham yangilanadi).
 * Ruscha ko'plik: '{n} {n:урок|урока|уроков}' (1, 2-4, 5+).
 */
import common from './s/common.js';
import errors from './s/errors.js';
import app from './s/app.js';
import tl from './s/tl.js';
import teacher from './s/teacher.js';
import games from './s/games.js';
import it from './s/it.js';
import kl from './s/kl.js';

const LANGS = ['uz', 'ru'];
const IDX = { uz: 0, ru: 1 };
const dict = Object.assign({}, common, errors, app, tl, teacher, games, it, kl);

let lang = 'uz';
try { lang = localStorage.getItem('ck_lang') || 'uz'; } catch { /* yashirin rejim */ }
if (!LANGS.includes(lang)) lang = 'uz';
document.documentElement.lang = lang;

/** Bo'lim matnlarini qo'shadi (dinamik yuklanadigan modullar uchun). @param {Record<string,[string,string?]>} part */
export function addStrings(part) { Object.assign(dict, part); }

function plural(n, forms) {
  const f = forms.split('|');
  if (lang !== 'ru') return f[0];
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return f[2] ?? f[0];
  if (b === 1) return f[0];
  if (b >= 2 && b <= 4) return f[1] ?? f[0];
  return f[2] ?? f[0];
}

/** @param {string} key @param {Record<string,string|number>} [vars] */
export function t(key, vars = {}) {
  const e = dict[key];
  const s = e ? (e[IDX[lang]] ?? e[0]) : key;
  return s.replace(/\{(\w+)(?::([^}]*))?\}/g, (_, k, forms) => (forms != null ? plural(Number(vars[k]), forms) : (k in vars ? String(vars[k] ?? '') : `{${k}}`)));
}

/** @param {'uz'|'ru'} l */
export function setLang(l) {
  if (!LANGS.includes(l) || l === lang) return;
  try { localStorage.setItem('ck_lang', l); } catch { /* */ }
  location.reload();
}
export const getLang = () => lang;

/** Til almashtirish tugmasi (bosilganda main.js dagi umumiy tinglovchi ishlaydi). */
export const langButton = (cls = '') =>
  `<button type="button" class="lang-pill ${cls}" data-lang-toggle aria-label="${t('lang.toggle')}" title="${t('lang.toggle')}">${lang === 'uz' ? 'RU' : 'UZ'}</button>`;
/** Server so'rovlari uchun (Accept-Language). */
export const langHeader = () => lang;
