/** @file IT darslari: qasr ichi (zal). Bo'limdagi har bir mavzu — zanjir va qulf bilan bog'langan eshik. */
import '../../styles/it.css';
import { api } from '../../core/api.js';
import { showError, toast } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { ic, asset, castleSrc, sectionStatus } from './common.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLElement} root
 * @param {string} sectionId
 * @param {{unlock?:string}} [query] unlock = endigina ochilgan eshik (zanjir tushish animatsiyasi)
 * @returns {Promise<()=>void>}
 */
export async function mountItHall(root, sectionId, query = {}) {
  const view = html('<section class="hl"><div class="skeleton it-skel" aria-busy="true"></div></section>');
  root.replaceChildren(view);
  let data;
  try {
    data = await api.get('/it/path');
  } catch (e) {
    showError(e);
    view.innerHTML = `<div class="it-empty"><p>Bo'limni yuklab bo'lmadi.</p><a class="btn btn--ghost" href="#/it">Qasrlar yo'liga</a></div>`;
    return () => {};
  }
  const idx = data.sections.findIndex((s) => s.id === sectionId);
  const sec = data.sections[idx];
  if (!sec || sectionStatus(sec) === 'locked') {
    view.innerHTML = `<div class="it-empty"><img src="${castleSrc('locked')}" alt="" width="96" height="96">
      <p>${sec ? 'Bu qasr hali yopiq. Avval oldingi qasrni zabt et.' : 'Bo\'lim topilmadi.'}</p><a class="btn" href="#/it">Qasrlar yo'liga</a></div>`;
    return () => {};
  }

  const n = sec.lessons.length;
  const unlockId = query.unlock && sec.lessons.some((l) => l.id === query.unlock && l.status !== 'locked') ? query.unlock : null;
  view.innerHTML = `
    <header class="hl-head">
      <a class="it-back" href="#/it" aria-label="Qasrlar yo'liga">${ic('left', 20)}</a>
      <div class="hl-t"><span>${idx + 1}-BO'LIM${sec.method ? ` · ${esc(sec.method.toUpperCase())}` : ''}</span><h1>${esc(sec.title)}</h1></div>
      <span class="hl-count" aria-label="${sec.done} ta mavzu tugatilgan, jami ${n} ta">${sec.done} / ${n}</span>
    </header>
    <div class="hl-wrap">
      <div class="hl-hall" style="--top:url('${asset('hall-top')}');--mid:url('${asset('hall-mid')}');--bot:url('${asset('hall-bottom')}')">
        <ul class="hl-doors" aria-label="Mavzular eshiklari">${sec.lessons.map((l, i) => door(l, i, l.id === unlockId)).join('')}</ul>
      </div>
    </div>`;

  // Tojli eshikning ochiq rasmi hali bo'lmasa, oddiy ochiq eshik ko'rinadi
  view.querySelectorAll('img.hd-img').forEach((img) => {
    if (!img.src.includes('boss-ready')) return;
    img.addEventListener('error', () => { img.src = asset('door-ready'); }, { once: true });
  });
  // Qulflangan eshik bosilsa: silkinadi va nima qilish kerakligini aytadi
  view.querySelectorAll('.hd.is-locked').forEach((b) => {
    b.onclick = () => {
      b.classList.remove('is-shake');
      void b.offsetWidth; // animatsiyani qayta boshlash uchun
      b.classList.add('is-shake');
      toast('Bu eshik hali qulf. Avval oldingi eshikni och.');
    };
  });
  // Ochiq eshik bosilsa: eshik "ochiladi", keyin dars boshlanadi
  view.querySelectorAll('a.hd').forEach((a) => {
    a.onclick = (e) => {
      if (reduced()) return;
      e.preventDefault();
      a.classList.add('is-entering');
      setTimeout(() => { location.hash = a.getAttribute('href'); }, 380);
    };
  });

  if (unlockId) playUnlock(view.querySelector(`[data-id="${unlockId}"]`));
  return () => {};
}

function door(l, i, unlocking) {
  const test = l.kind === 'test';
  const st = unlocking ? 'current' : l.status;
  const base = test ? (st === 'locked' ? 'boss-locked' : 'boss-ready') : st === 'locked' ? 'door-locked' : st === 'done' ? 'door-done' : 'door-ready';
  const meta = st === 'done' ? 'Tugatildi' : st === 'locked' ? 'Qulf' : `${l.minutes} daqiqa · ${l.exercises} savol`;
  const label = `${i + 1}-mavzu: ${esc(l.title)}${st === 'done' ? ', tugatilgan' : st === 'locked' ? ', qulflangan' : ''}`;
  const badge = st === 'done' ? `<span class="it-badge is-ok" aria-hidden="true">${ic('check', 16)}</span>` : '';
  // Ochilayotgan eshik: tagida tayyor eshik, ustida qulflangan eshik + zanjir + qulf (keyin tushib ketadi)
  const layers = unlocking
    ? `<img class="hd-img" src="${asset(test ? 'boss-ready' : 'door-ready')}" alt="" draggable="false">
       <img class="hd-img hd-was" src="${asset(test ? 'boss-locked' : 'door-locked')}" alt="" draggable="false">
       <img class="hd-img hd-chains" src="${asset('door-chains')}" alt="" draggable="false">
       <img class="hd-img hd-lock" src="${asset('door-padlock')}" alt="" draggable="false">`
    : `<img class="hd-img" src="${asset(base)}" alt="" draggable="false">`;
  const inner = `<span class="hd-pic">${layers}${badge}</span>
    ${st === 'current' ? '<span class="hd-now">Kirish</span>' : ''}
    <b>${esc(l.title)}</b><small>${test ? `Bo'lim testi · ${meta}` : meta}</small>`;
  const cls = `hd is-${st}${test ? ' is-test' : ''}${unlocking ? ' is-unlocking' : ''}`;
  return `<li>${st === 'locked'
    ? `<button type="button" class="${cls}" data-id="${l.id}" aria-label="${label}">${inner}</button>`
    : `<a class="${cls}" data-id="${l.id}" href="#/it/lesson/${l.id}" aria-label="${label} — boshlash">${inner}</a>`}</li>`;
}

/** Zanjirlar tushadi, qulf ochilib yiqiladi, eshik yorishadi. */
function playUnlock(el) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  if (reduced()) { el.classList.add('is-unlocked'); return; }
  setTimeout(() => el.classList.add('is-unlocked'), 450);
}
