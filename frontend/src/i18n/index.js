/** @file Minimal i18n: t('kalit', {o'zgaruvchi}). Til localStorage'da saqlanadi. */
import uz from './uz.js';
import ru from './ru.js';

const dict = { uz, ru };
let lang = localStorage.getItem('ck_lang') || 'uz';

/** @param {string} key @param {Record<string,string|number>} [vars] */
export function t(key, vars = {}) {
  const s = dict[lang]?.[key] ?? dict.uz[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/** @param {'uz'|'ru'} l */
export function setLang(l) {
  lang = l;
  localStorage.setItem('ck_lang', l);
  document.documentElement.lang = l;
}
export const getLang = () => lang;
