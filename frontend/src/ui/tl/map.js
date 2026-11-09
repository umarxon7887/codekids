/** @file Typing darslari: darajalar xaritasi (6 daraja × 4 dars + imtihon), coinlar va yulduzlar. */
import '../../styles/tl.css';
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { coinPill } from './coin.js';
import { ic, starsRow } from './common.js';
import { t, getLang, langButton } from '../../i18n/index.js';
import { BASE_URL } from '../../core/config.js';

/**
 * @param {HTMLElement} root
 * @param {{opened?:string}} [query] opened = yangi ochilgan daraja raqami (animatsiya)
 */
export async function mountTypingMap(root, query = {}) {
  const view = html('<section class="tl"><div class="skeleton tl-skel" aria-busy="true"></div></section>');
  root.replaceChildren(view);
  // Kurs tili = sayt tili (bitta umumiy til)
  const lang = getLang();
  let data;
  try {
    data = await api.get('/typing-lessons', { query: { lang } });
  } catch (e) {
    showError(e);
    view.innerHTML = `<div class="tl-empty"><p>${t('tl.loadFail')}</p><a class="btn btn--ghost" href="#/">${t('app.backShort')}</a></div>`;
    return () => {};
  }
  render(view, data, Number(query.opened) || null);
  return () => {};
}

// Daraja ranglari (fon, pastki soya)
const COLORS = [['#FFD98A', '#E0B24E'], ['#CFE6F7', '#A9CBE6'], ['#CDEBDD', '#9FD3BA'], ['#DCD3F5', '#B9ACE6'], ['#FFDFCB', '#F0BC9C'], ['#FAD4DD', '#E9A9B9']];
// Xarita rasmlari (Gemini): fon rasmidagi yo'l burilishlari, foizda. Plitalar shu joylarga qo'yiladi.
const SPOTS = [[20, 27], [81, 43], [19, 61], [80, 77], [48, 92]];
const mapImg = (n) => `${BASE_URL}tl/map-${n}.webp`;
const kibi = (pose) => `${BASE_URL}it/kibi/${pose}.webp`;
const keysOf = (l) => (l.keys || []).filter((k) => k !== 'shift');
const keyLabel = (keys) => keys.map((k) => `<b>${esc(k.toUpperCase())}</b>`).join(' ');

/** Kibi gapi: joriy darsga qarab. */
function greet(levels, stats) {
  if (!stats.current_lesson_id) return t('tl.k.allDone');
  const lv = levels.find((x) => x.lessons.some((l) => l.id === stats.current_lesson_id));
  const l = lv.lessons.find((x) => x.id === stats.current_lesson_id);
  if (l.kind === 'exam') return t('tl.k.exam', { n: lv.n, w: lv.wpm });
  const keys = keysOf(l);
  const intro = stats.done === 0 ? `${t('tl.k.hello')} ` : '';
  if (keys.length) return intro + t('tl.k.keys', { keys: keyLabel(keys) });
  if ((l.keys || []).includes('shift')) return intro + t('tl.k.shift');
  return intro + t('tl.k.words', { title: `<b>${esc(l.title)}</b>` });
}

function render(view, { levels, stats, lang }, opened) {
  const cur = levels.find((l) => l.status === 'current') || levels[levels.length - 1];
  const curLesson = stats.current_lesson_id;
  const pct = Math.round((stats.done / stats.total) * 100);
  const started = stats.done > 0;
  view.innerHTML = `
    <div class="tl-head">
      <a class="tl-back" href="#/" aria-label="${t('app.backShort')}">${ic('left', 20)}</a>
      <h1>${t('home.tl')}</h1>
      ${langButton('tl-lang')}
      ${coinPill(stats.coins)}
    </div>
    <section class="tl-hero">
      <div class="tl-hero-top">
        <p class="tl-bubble">${greet(levels, stats)}</p>
        <img class="tl-hero-kibi" src="${kibi(curLesson ? (started ? 'tushuntirish' : 'salom') : 'galaba')}" alt="" draggable="false">
      </div>
      <div class="tl-hero-t"><span>${t('app.level', { n: cur.n })}</span><b>${esc(cur.title)}</b></div>
      <div class="tl-prog"><div class="tl-bar"><i style="width:${pct}%"></i></div><span>${t('tl.doneOf', stats)}</span></div>
      <div class="tl-hero-f">
        <span class="tl-stars-total">${ic('star', 18)}<b>${stats.stars}</b> / ${stats.max_stars}</span>
        ${curLesson ? `<a class="tl-chunky tl-go" href="#/typing-lessons/${curLesson}">${started ? t('tl.continue') : t('home.start')}</a>` : ''}
      </div>
    </section>
    ${lang === 'ru' ? `<p class="tl-tip">${ic('kb', 20)}<span>${t('tl.needRuKb')}</span></p>` : ''}
    <div class="tl-levels">${levels.map((lv, i) => level(lv, i, opened === lv.n, curLesson)).join('')}</div>`;
  const focus = view.querySelector('.tl-lv.is-opening') || view.querySelector('.tl-spot.is-current');
  if (focus && (opened || started)) focus.scrollIntoView({ block: 'center' });
}

function level(lv, i, opening, curLesson) {
  const locked = lv.status === 'locked';
  const done = lv.lessons.filter((l) => l.status === 'done').length;
  const [c, cd] = COLORS[i % COLORS.length];
  const head = `<header class="tl-lv-h">
      <span class="tl-lv-n">${locked ? ic('lock', 20) : lv.status === 'done' ? ic('check', 22) : lv.n}</span>
      <div class="tl-lv-t"><small>${t('app.level', { n: lv.n })}</small><b>${esc(lv.title)}</b><span>${esc(lv.desc)}</span></div>
      <span class="tl-lv-c">${done}/${lv.lessons.length}</span>
    </header>`;
  const body = locked
    ? `<div class="tl-mini" aria-hidden="true">${lv.lessons.map((l, k) => `<span>${l.kind === 'exam' ? ic('trophy', 18) : k + 1}</span>`).join('')}</div>
       <p class="tl-lv-note">${t('tl.unlockBy', { n: lv.n - 1 })} · ${t('tl.examWpm', { n: lv.wpm })}</p>`
    : `<div class="tl-map" style="background-image:url(${mapImg('bg')})">${lv.lessons.map((l, k) => node(l, k, l.id === curLesson)).join('')}</div>
       <p class="tl-lv-note">${t('tl.examWpm', { n: lv.wpm })}</p>`;
  return `<section class="tl-lv is-${lv.status}${opening ? ' is-opening' : ''}" style="--c:${c};--cd:${cd}" aria-label="${t('app.level', { n: lv.n })}: ${esc(lv.title)}${locked ? ` (${t('tl.locked')})` : ''}">
    ${head}${body}
  </section>`;
}

function node(l, i, isCur) {
  const exam = l.kind === 'exam';
  const name = exam ? t('tl.exam') : l.title;
  const keys = keysOf(l);
  const short = keys.length && keys.length <= 5 && keys.every((k) => k.length === 1);
  const locked = l.status === 'locked';
  // done -> yashil, current/open -> sariq, locked -> kulrang qulfli; imtihon o'tilguncha kulrang kubokli
  const img = exam ? 'exam' : l.status === 'done' ? 'done' : locked ? 'locked' : 'current';
  const face = locked || exam ? '' : `<span class="tl-face">${short ? esc(keys.join('').toUpperCase()) : ic('book', 22)}</span>`;
  const [x, y] = SPOTS[Math.min(i, SPOTS.length - 1)];
  const aria = `${exam ? t('tl.exam') : t('tl.lessonN', { n: i + 1 })}: ${esc(l.title)}${l.status === 'done' ? `, ${t('app.stars', { n: l.stars })}` : locked ? ` (${t('tl.locked')})` : ''}`;
  const tile = `<img src="${mapImg(img)}" alt="" draggable="false">${face}`;
  const showName = !(short && !locked);
  return `<div class="tl-spot is-${l.status}${exam ? ' is-exam' : ''}" style="left:${x}%;top:${y}%">
    ${isCur ? `<img class="tl-spot-kibi" src="${kibi('oddiy')}" alt="" draggable="false">` : ''}
    ${locked ? `<span class="tl-tile" aria-label="${aria}">${tile}</span>` : `<a class="tl-tile" href="#/typing-lessons/${l.id}" aria-label="${aria}">${tile}</a>`}
    <div class="tl-spot-lbl ${x < 50 ? 'is-r' : 'is-l'}">
      ${showName ? `<b>${esc(name)}</b>` : ''}
      ${l.status === 'done' ? `<span class="tl-spot-stars">${starsRow(l.stars, 13)}</span>` : ''}
      ${isCur ? `<a class="tl-spot-go" href="#/typing-lessons/${l.id}" tabindex="-1">${t('home.start')}</a>` : ''}
    </div>
  </div>`;
}
