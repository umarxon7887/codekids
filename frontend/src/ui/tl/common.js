/** @file Typing darslari: ikonkalar, yulduzlar, ekrandagi klaviatura. */

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
  return `<span class="tl-stars ${cls}" role="img" aria-label="${n} yulduz">${out}</span>`;
}

// Klaviatura qatorlari (pastki registr) va Shift bilan chiqadigan belgilar
const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];
const SHIFTED = { '!': '1', '?': '/', '"': "'", ':': ';', '+': '=', '*': '8', '(': '9', ')': '0', _: '-' };
// Qaysi barmoq bosadi: chap/o'ng qo'l (rang uchun)
const FINGER = {};
[['1qaz', 'l5'], ['2wsx', 'l4'], ['3edc', 'l3'], ['45rtfgvb', 'l2'], ['67yuhjnm', 'r2'], ['8ik,', 'r3'], ['9ol.', 'r4'], ["0p;'/-=", 'r5']]
  .forEach(([keys, f]) => { for (const k of keys) FINGER[k] = f; });
FINGER.shift = 'l5';
const FINGER_NAME = { l5: "chap jimjiloq", l4: 'chap nomsiz', l3: "chap o'rta", l2: "chap ko'rsatkich", r2: "o'ng ko'rsatkich", r3: "o'ng o'rta", r4: "o'ng nomsiz", r5: "o'ng jimjiloq" };

/** Belgi uchun tugma va Shift kerakmi. */
export function keyFor(ch) {
  if (ch === ' ') return { key: 'space', shift: false };
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  const low = ch.toLowerCase();
  return { key: low, shift: ch !== low };
}

/** Qaysi barmoq bilan bosiladi (maslahat matni). */
export function fingerHint(ch) {
  if (ch === ' ') return 'Bosh barmoq';
  const { key, shift } = keyFor(ch);
  const f = FINGER[key];
  if (!f) return '';
  const name = FINGER_NAME[f];
  const label = name[0].toUpperCase() + name.slice(1);
  if (!shift) return `${label} barmoq`;
  // Shift boshqa qo'l bilan bosiladi
  return `${label} barmoq + ${f[0] === 'l' ? "o'ng" : 'chap'} Shift`;
}

/** Ekrandagi klaviatura HTML. @param {string[]} newKeys darsdagi yangi tugmalar (belgilanadi) */
export function keyboardHtml(newKeys = []) {
  const isNew = new Set(newKeys);
  const rows = ROWS.map((r, i) => `<div class="tl-kr tl-kr${i}">${r.map((k) => {
    const label = k === 'shift' ? 'Shift' : k.toUpperCase();
    const home = 'fj'.includes(k) && k.length === 1 ? ' is-home' : '';
    return `<span class="tl-k f-${FINGER[k] || 'x'}${isNew.has(k) ? ' is-new' : ''}${home}${k === 'shift' ? ' is-wide' : ''}" data-k="${k === "'" ? 'apos' : k}">${label}</span>`;
  }).join('')}${i === 3 ? '<span class="tl-k is-wide f-r5" data-k="shift-r">Shift</span>' : ''}</div>`).join('');
  return `<div class="tl-kb" aria-hidden="true">${rows}<div class="tl-kr"><span class="tl-k is-space" data-k="space">Probel</span></div></div>`;
}

/** Keyingi bosiladigan tugmani yoritadi. */
export function highlightKey(kb, ch) {
  kb.querySelectorAll('.is-next').forEach((e) => e.classList.remove('is-next'));
  if (ch == null) return;
  const { key, shift } = keyFor(ch);
  const sel = key === "'" ? 'apos' : key;
  kb.querySelector(`[data-k="${CSS.escape(sel)}"]`)?.classList.add('is-next');
  if (shift) {
    // Shift harfga qarama-qarshi qo'ldagi tugma bilan bosiladi
    const left = (FINGER[key] || 'r')[0] === 'l';
    kb.querySelector(`[data-k="${left ? 'shift-r' : 'shift'}"]`)?.classList.add('is-next');
  }
}
