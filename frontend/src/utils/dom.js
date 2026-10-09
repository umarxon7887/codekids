/** @file DOM yordamchilari. */

/** @param {string} html @returns {HTMLElement} */
export function html(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return /** @type {HTMLElement} */ (t.content.firstElementChild);
}

/** XSS'dan himoya. @param {string} s */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Skeleton loader. */
export const skeleton = () => html('<div class="skeleton" aria-busy="true"></div>');

/** Ixtiyoriy shakldagi qatorlar massividan jadval. @param {object[]} rows @returns {string} */
export function table(rows) {
  if (!Array.isArray(rows) || !rows.length) return '<p class="muted">Ma\'lumot yo\'q</p>';
  const keys = Object.keys(rows[0]);
  const cell = (v) => esc(v !== null && typeof v === 'object' ? JSON.stringify(v) : v ?? '');
  return `<div class="scroll"><table><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join('')}</tr>${rows
    .map((r) => `<tr>${keys.map((k) => `<td>${cell(r[k])}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

/** @param {number} ms */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
