/** @file IT darslari: qasrlar yo'li. Har bir qasr — bitta bo'lim; qasr ichida mavzular eshiklari (hall.js). */
import '../../styles/it.css';
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { ic, castleSrc, sectionStatus } from './common.js';

// Qasrlar tepa-past betartib turadi (dizayndagi naqsh), ro'yxat bo'ylab takrorlanadi
const OFFSETS = [8, 62, 22, 70, 4, 48, 14, 56];
const ROW_H = 262; // bitta qasr ustunining balandligi (yorliq + rasm qutisi + nom)
const size = (st) => (st === 'current' ? 104 : 80);
const centerY = (top, st) => top + 146 - size(st) / 2; // 28 (yorliq) + 6 + 112 (rasm qutisi) - yarim o'lcham

/**
 * @param {HTMLElement} root
 * @param {{opened?:string}} [query] opened = yangi ochilgan bo'lim (qulfdan ochilish animatsiyasi)
 * @returns {Promise<()=>void>}
 */
export async function mountItPath(root, query = {}) {
  const view = html(`<section class="it"><div class="skeleton it-skel" aria-busy="true"></div></section>`);
  root.replaceChildren(view);
  let data;
  try {
    data = await api.get('/it/path');
  } catch (e) {
    showError(e);
    view.innerHTML = `<div class="it-empty"><p>Darslarni yuklab bo'lmadi.</p><a class="btn btn--ghost" href="#/">Orqaga</a></div>`;
    return () => {};
  }
  render(view, data, query.opened);
  return () => {};
}

function render(view, { sections, stats }, opened) {
  if (!sections.length) {
    view.innerHTML = `${head(stats)}<div class="it-empty"><img src="${castleSrc('locked')}" alt="" width="96" height="96">
      <p>Darslar tez orada qo'shiladi.</p><a class="btn btn--ghost" href="#/">Bosh sahifaga</a></div>`;
    return;
  }
  const st = sections.map(sectionStatus);
  let secIdx = st.indexOf('current');
  if (secIdx < 0) secIdx = sections.length - 1;
  const sec = sections[secIdx];
  const anyDone = sections.some((s) => s.done > 0);
  const allDone = st.every((x) => x === 'done');
  const goalPct = Math.min(100, Math.round((stats.today / stats.goal) * 100));

  view.innerHTML = `
    <div class="it-main">
      ${head(stats)}
      <div class="it-sec">
        <div class="it-sec-t"><span>${secIdx + 1}-BO'LIM${sec.method ? ` · ${esc(sec.method.toUpperCase())}` : ''}</span><b>${esc(sec.title)}</b></div>
        <div class="it-prog"><div class="it-bar"><i style="width:${Math.round((sec.done / sec.lessons.length) * 100)}%"></i></div>
          <span>${sec.done} / ${sec.lessons.length}</span></div>
      </div>
      <div class="it-road" role="list" aria-label="Qasrlar yo'li, yon tomonga suring">${road(sections, st, opened)}</div>
      ${sections.length > 3 ? `<div class="it-swipe" aria-hidden="true">${ic('left', 16)}Suring${ic('right', 16)}</div>` : ''}
    </div>
    <aside class="it-side">
      <div class="it-tiles">
        <div class="it-tile is-fire"><b>${stats.streak}</b><span>kun ketma-ket</span></div>
        <div class="it-tile is-xp"><b>${stats.xp}</b><span>XP</span></div>
      </div>
      <div class="it-card it-goal">
        <h2>Bugungi maqsad</h2>
        <div class="it-prog"><div class="it-bar is-ink"><i style="width:${goalPct}%"></i></div><span>${Math.min(stats.today, stats.goal)} / ${stats.goal} mavzu</span></div>
        ${stats.today >= stats.goal ? '<p class="it-done">Barakalla! Bugungi maqsad bajarildi.</p>' : ''}
      </div>
      <div class="it-card it-secs">
        <h2>Bo'limlar</h2>
        <ul>${sections.map((s, i) => (st[i] === 'locked'
          ? `<li class="is-off"><span>${i + 1}. ${esc(s.title)}</span><span class="it-lock" aria-label="Yopiq">${ic('lock', 18)}</span></li>`
          : `<li><a href="#/it/section/${s.id}">${i + 1}. ${esc(s.title)}</a><b>${s.done} / ${s.lessons.length}</b></li>`)).join('')}</ul>
      </div>
      ${allDone ? '<p class="it-alldone">Hamma qasrlar zabt etildi! Yangi bo\'limlar tez orada.</p>'
        : `<a class="btn it-go" href="#/it/section/${sec.id}">${anyDone ? 'Davom ettirish' : 'Boshlash'}</a>`}
    </aside>`;

  // Hozirgi (yoki yangi ochilgan) qasrni yo'lning o'rtasiga olib kelamiz (sahifani tik surmasdan)
  const roadEl = view.querySelector('.it-road');
  const focus = roadEl.querySelector('.is-opening') || roadEl.querySelector('.is-current');
  if (focus) roadEl.scrollLeft = focus.offsetLeft - (roadEl.clientWidth - focus.offsetWidth) / 2;
}

function head(stats) {
  return `<div class="it-head">
    <a class="it-back" href="#/" aria-label="Orqaga">${ic('left', 20)}</a>
    <h1>IT darslari</h1>
    <div class="it-pills">
      <span class="it-pill is-fire" title="Ketma-ket kunlar">${ic('fire', 16)}<b>${stats.streak}</b><span class="sr">kun ketma-ket</span></span>
      <span class="it-pill is-xp" title="XP">${ic('star', 16)}<b>${stats.xp}</b><span class="sr">XP</span></span>
    </div>
  </div>`;
}

function road(sections, st, opened) {
  const out = [];
  let prev = null; // oldingi qasrning markaz balandligi
  sections.forEach((s, i) => {
    const top = OFFSETS[i % OFFSETS.length];
    const y = centerY(top, st[i]);
    if (prev != null) out.push(`<svg class="it-link" aria-hidden="true" width="22" height="${ROW_H}" viewBox="0 0 22 ${ROW_H}"><path d="M-6 ${prev} C 11 ${prev}, 11 ${y}, 28 ${y}"/></svg>`);
    out.push(castle(s, i, st[i], top, opened === s.id));
    prev = y;
  });
  return out.join('');
}

function castle(s, i, status, top, opening) {
  const sz = size(status);
  const meta = status === 'done' ? 'Zabt etildi'
    : status === 'locked' ? `${s.lessons.length} mavzu` : `${s.done} / ${s.lessons.length} mavzu`;
  const badge = status === 'done' ? `<span class="it-badge is-ok" aria-hidden="true">${ic('check', 16)}</span>`
    : status === 'locked' ? `<span class="it-badge is-lock" aria-hidden="true">${ic('lock', 14)}</span>` : '';
  // Yangi ochilgan qasr: qulflangan rasm ustida turadi va eriydi
  const pic = `<img src="${castleSrc('open')}" alt="" width="${sz}" height="${sz}" draggable="false">
    ${opening ? `<img class="it-was" src="${castleSrc('locked')}" alt="" width="${sz}" height="${sz}" draggable="false">` : ''}${badge}`;
  const label = `${i + 1}-bo'lim: ${esc(s.title)}${status === 'done' ? ' (zabt etilgan)' : status === 'locked' ? ' (yopiq)' : ''}`;
  const art = status === 'locked'
    ? `<span class="it-art" style="width:${sz}px;height:${sz}px" role="img" aria-label="${label}"><img src="${castleSrc('locked')}" alt="" width="${sz}" height="${sz}" draggable="false">${badge}</span>`
    : `<a class="it-art" style="width:${sz}px;height:${sz}px" href="#/it/section/${s.id}" aria-label="${label} — kirish">${pic}</a>`;
  return `<div class="it-c is-${status}${opening ? ' is-opening' : ''}" role="listitem" style="padding-top:${top}px">
    ${status === 'current' ? '<span class="it-now">Hozirgi bo\'lim</span>' : '<span class="it-now is-empty"></span>'}
    <div class="it-box">${art}</div>
    <b>${esc(s.title)}</b><small>${meta}</small>
  </div>`;
}
