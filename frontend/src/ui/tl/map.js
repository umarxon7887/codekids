/** @file Typing darslari: darajalar xaritasi (6 daraja × 4 dars + imtihon), coinlar va yulduzlar. */
import '../../styles/tl.css';
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { coinPill } from './coin.js';
import { ic, starsRow } from './common.js';

const LANGS = { uz: "O'zbekcha", ru: 'Ruscha' };

/**
 * @param {HTMLElement} root
 * @param {{opened?:string}} [query] opened = yangi ochilgan daraja raqami (animatsiya)
 */
export async function mountTypingMap(root, query = {}) {
  const view = html('<section class="tl"><div class="skeleton tl-skel" aria-busy="true"></div></section>');
  root.replaceChildren(view);
  // Til: manzildan, bo'lmasa oxirgi tanlangan (shu brauzerda)
  let lang = query.lang;
  if (!LANGS[lang]) { try { lang = localStorage.getItem('tl-lang'); } catch { lang = null; } }
  if (!LANGS[lang]) lang = 'uz';
  try { localStorage.setItem('tl-lang', lang); } catch { /* ixtiyoriy */ }
  let data;
  try {
    data = await api.get('/typing-lessons', { query: { lang } });
  } catch (e) {
    showError(e);
    view.innerHTML = `<div class="tl-empty"><p>Darslarni yuklab bo'lmadi.</p><a class="btn btn--ghost" href="#/">Orqaga</a></div>`;
    return () => {};
  }
  render(view, data, Number(query.opened) || null);
  return () => {};
}

function render(view, { levels, stats, lang }, opened) {
  const cur = levels.find((l) => l.status === 'current') || levels[levels.length - 1];
  const curLesson = stats.current_lesson_id;
  const pct = Math.round((stats.done / stats.total) * 100);
  const started = stats.done > 0;
  view.innerHTML = `
    <div class="tl-head">
      <a class="tl-back" href="#/" aria-label="Orqaga">${ic('left', 20)}</a>
      <h1>Typing darslari</h1>
      ${coinPill(stats.coins)}
    </div>
    <div class="tl-langs" role="tablist" aria-label="Darslar tili">${Object.entries(LANGS).map(([k, v]) =>
      `<a class="tab${k === lang ? ' is-on' : ''}" role="tab" aria-selected="${k === lang}" href="#/typing-lessons?lang=${k}">${v}</a>`).join('')}</div>
    <div class="tl-hero">
      <div class="tl-hero-t"><span>${cur.n}-DARAJA</span><b>${esc(cur.title)}</b><small>${esc(cur.desc)}</small>${lang === 'ru' ? '<small>Rus klaviaturasi (ЙЦУКЕН) kerak</small>' : ''}</div>
      <div class="tl-prog"><div class="tl-bar"><i style="width:${pct}%"></i></div><span>${stats.done} / ${stats.total} dars</span></div>
      <div class="tl-hero-f">
        <span class="tl-stars-total">${ic('star', 18)}<b>${stats.stars}</b> / ${stats.max_stars}</span>
        ${curLesson ? `<a class="btn tl-go" href="#/typing-lessons/${curLesson}">${started ? 'Davom ettirish' : 'Boshlash'}</a>`
          : '<span class="tl-alldone">Hamma darslar tugadi! Yulduzlarni 3 taga yetkazib ko\'r.</span>'}
      </div>
    </div>
    <div class="tl-levels" lang="${lang}">${levels.map((lv) => level(lv, opened === lv.n)).join('')}</div>`;
  const focus = view.querySelector('.tl-lv.is-opening') || view.querySelector('.tl-lv.is-current');
  if (focus && (opened || started)) focus.scrollIntoView({ block: 'center' });
}

function level(lv, opening) {
  const locked = lv.status === 'locked';
  const done = lv.lessons.filter((l) => l.status === 'done').length;
  return `<section class="tl-lv is-${lv.status}${opening ? ' is-opening' : ''}" aria-label="${lv.n}-daraja: ${esc(lv.title)}${locked ? ' (yopiq)' : ''}">
    <header class="tl-lv-h">
      <span class="tl-lv-n">${locked ? ic('lock', 18) : lv.n}</span>
      <div class="tl-lv-t"><b>${esc(lv.title)}</b><small>${esc(lv.desc)} · imtihon ${lv.wpm} so'z/daq</small></div>
      <span class="tl-lv-c">${done}/${lv.lessons.length}</span>
    </header>
    <ol class="tl-nodes">${lv.lessons.map(node).join('')}</ol>
  </section>`;
}

function node(l, i) {
  const exam = l.kind === 'exam';
  const label = exam ? 'Imtihon' : `${i + 1}-dars`;
  const inner = `<span class="tl-dot">${l.status === 'locked' ? ic('lock', 16) : exam ? ic('trophy', 20) : i + 1}</span>
    <b>${esc(exam ? 'Imtihon' : l.title)}</b>
    ${l.status === 'done' ? starsRow(l.stars, 14) : l.status === 'current' ? '<small class="tl-now">Hozir</small>' : '<small>&nbsp;</small>'}`;
  const aria = `${label}: ${esc(l.title)}${l.status === 'done' ? `, ${l.stars} yulduz` : l.status === 'locked' ? ' (yopiq)' : ''}`;
  return `<li class="tl-node is-${l.status}${exam ? ' is-exam' : ''}">${l.status === 'locked'
    ? `<span class="tl-node-in" aria-label="${aria}">${inner}</span>`
    : `<a class="tl-node-in" href="#/typing-lessons/${l.id}" aria-label="${aria}">${inner}</a>`}</li>`;
}
