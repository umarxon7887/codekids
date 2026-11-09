/** @file Typing darslari: ikonkalar, yulduzlar, ekrandagi klaviatura. */
import { t } from '../../i18n/index.js';

const P = {
  left: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  redo: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
};

/** Chiziqli ikonka. */
export const ic = (k, s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

/** 3 ta yulduz qatori (to'lganlari sariq). */
export function starsRow(n, s = 18, cls = '') {
  let out = '';
  for (let i = 0; i < 3; i++) {
    out += `<svg class="tl-star${i < n ? ' is-on' : ''}" aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24">${P.star}</svg>`;
  }
  return `<span class="tl-stars ${cls}" role="img" aria-label="${t('app.stars', { n })}">${out}</span>`;
}

// Klaviatura tartiblari (pastki registr). Ruscha: ЙЦУКЕН. Barmoqlar tugma joyiga qarab belgilanadi.
const LAYOUTS = {
  uz: {
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
    ],
    shifted: { '!': '1', '?': '/', '"': "'", ':': ';', '+': '=', '*': '8', '(': '9', ')': '0', _: '-' },
    home: 'fj',
  },
  ru: {
    rows: [
      ['ё', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ'],
      ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
      ['shift', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '.'],
    ],
    shifted: { '!': '1', '"': '2', '№': '3', ';': '4', '%': '5', ':': '6', '?': '7', '*': '8', '(': '9', ')': '0', _: '-', '+': '=', ',': '.' },
    home: 'ао',
  },
};
// Barmoq tugma joyiga qarab (ikkala tartibda bir xil): qator va ustun -> barmoq
const COLS = [
  ['l5', 'l5', 'l4', 'l3', 'l2', 'l2', 'r2', 'r2', 'r3', 'r4', 'r5', 'r5', 'r5'], // raqamlar (ru: ё bilan)
  ['l5', 'l4', 'l3', 'l2', 'l2', 'r2', 'r2', 'r3', 'r4', 'r5', 'r5', 'r5'],
  ['l5', 'l4', 'l3', 'l2', 'l2', 'r2', 'r2', 'r3', 'r4', 'r5', 'r5'],
  ['l5', 'l5', 'l4', 'l3', 'l2', 'l2', 'r2', 'r2', 'r3', 'r4', 'r5'],
];
const FINGERS = {};
for (const [lang, L] of Object.entries(LAYOUTS)) {
  const f = {};
  L.rows.forEach((row, r) => {
    // o'zbekcha raqamlar qatorida ё yo'q: ustunlar bittaga suriladi
    const shift = r === 0 && lang === 'uz' ? 1 : 0;
    row.forEach((k, c) => { f[k] = COLS[r][c + shift] || 'r5'; });
  });
  FINGERS[lang] = f;
}
const FINGER_NAME = { l5: t('tl.f.l5'), l4: t('tl.f.l4'), l3: t('tl.f.l3'), l2: t('tl.f.l2'), r2: t('tl.f.r2'), r3: t('tl.f.r3'), r4: t('tl.f.r4'), r5: t('tl.f.r5') };
const layout = (lang) => LAYOUTS[lang] || LAYOUTS.uz;

/** Belgi uchun tugma va Shift kerakmi. */
export function keyFor(ch, lang = 'uz') {
  if (ch === ' ') return { key: 'space', shift: false };
  const L = layout(lang);
  if (L.shifted[ch]) return { key: L.shifted[ch], shift: true };
  const low = ch.toLowerCase();
  return { key: low, shift: ch !== low };
}

/** Qaysi barmoq bilan bosiladi (maslahat matni). */
export function fingerHint(ch, lang = 'uz') {
  if (ch === ' ') return t('tl.thumb');
  const { key, shift } = keyFor(ch, lang);
  const f = (FINGERS[lang] || FINGERS.uz)[key];
  if (!f) return '';
  const name = FINGER_NAME[f];
  const label = name[0].toUpperCase() + name.slice(1);
  if (!shift) return t('tl.finger', { f: label });
  // Shift boshqa qo'l bilan bosiladi
  return t(f[0] === 'l' ? 'tl.fingerShiftR' : 'tl.fingerShiftL', { f: label });
}

const dataKey = (k) => (k === "'" ? 'apos' : k);

/** Ekrandagi klaviatura HTML. @param {string[]} newKeys darsdagi yangi tugmalar (belgilanadi) */
export function keyboardHtml(newKeys = [], lang = 'uz') {
  const L = layout(lang);
  const F = FINGERS[lang] || FINGERS.uz;
  const isNew = new Set(newKeys);
  const rows = L.rows.map((r, i) => `<div class="tl-kr tl-kr${i}">${r.map((k) => {
    const label = k === 'shift' ? 'Shift' : k.toUpperCase();
    const home = k.length === 1 && L.home.includes(k) ? ' is-home' : '';
    return `<span class="tl-k f-${F[k] || 'x'}${isNew.has(k) ? ' is-new' : ''}${home}${k === 'shift' ? ' is-wide' : ''}" data-k="${dataKey(k)}">${label}</span>`;
  }).join('')}${i === 3 ? '<span class="tl-k is-wide f-r5" data-k="shift-r">Shift</span>' : ''}</div>`).join('');
  return `<div class="tl-kb" data-lang="${lang}" aria-hidden="true">${rows}<div class="tl-kr"><span class="tl-k is-space" data-k="space">${lang === 'ru' ? 'Пробел' : 'Probel'}</span></div></div>`;
}

/** Keyingi bosiladigan tugmani yoritadi. */
export function highlightKey(kb, ch, lang = 'uz') {
  kb.querySelectorAll('.is-next').forEach((e) => e.classList.remove('is-next'));
  if (ch == null) return;
  const { key, shift } = keyFor(ch, lang);
  kb.querySelector(`[data-k="${CSS.escape(dataKey(key))}"]`)?.classList.add('is-next');
  if (shift) {
    // Shift harfga qarama-qarshi qo'ldagi tugma bilan bosiladi
    const left = ((FINGERS[lang] || FINGERS.uz)[key] || 'r')[0] === 'l';
    kb.querySelector(`[data-k="${left ? 'shift-r' : 'shift'}"]`)?.classList.add('is-next');
  }
}
