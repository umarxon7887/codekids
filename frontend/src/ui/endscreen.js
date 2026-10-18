/** @file Yakuniy reyting ekrani va "chiqarildingiz" ekrani (typing + labirint uchun umumiy). */
import '../styles/end.css';
import { esc } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { carSrc } from '../games/typing/cars.js';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Backend o'yinchi ro'yxatini umumiy shaklga keltiradi.
 * `kind` — ball turi: 'correct' (typing, mashina chiziladi) yoki 'score' (labirint).
 * @param {any[]} players @param {'correct'|'score'} scoreKey
 */
export const fromPlayers = (players, scoreKey) => (players || []).map((p) => ({
  id: p.id, nickname: p.nickname, score: p[scoreKey] ?? 0, rank: p.rank,
  finished: p.finished, eliminated: p.eliminated, kicked: p.kicked,
  car_id: p.car_id, kind: scoreKey,
}));

/**
 * @param {HTMLElement} el
 * @param {{title?:string, players:any[], meId?:any, meNick?:string, backHref?:string, scoreLabel?:string, modal?:boolean}} o
 */
export function renderEndScreen(el, { title, players, meId = null, meNick = '', backHref = '#/', scoreLabel = t('score.points'), modal = false }) {
  const sorted = [...players].sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || (b.score || 0) - (a.score || 0));
  const cars = sorted.some((p) => p.kind === 'correct');
  const isMe = (p) => (p.id != null && meId != null && String(p.id) === String(meId)) || (!!meNick && p.nickname === meNick);
  el.hidden = false;
  if (modal) el.className = 'modal';
  el.innerHTML = `<div class="modal__card end">
    <div class="end-h"><h2>${esc(title || t('end.title'))}</h2><span class="end-n">${sorted.length} ta o'yinchi</span></div>
    <ol class="end-list">${sorted.map((p, i) => {
      const me = isMe(p);
      const badge = p.kicked ? ' 🚫' : p.eliminated ? ' 💀' : p.finished ? ' 🏁' : '';
      const car = cars ? `<img class="end-car" alt="" src="${carSrc(p, String(p.id ?? p.nickname), me)}">` : '';
      return `<li class="end-row${me ? ' is-me' : ''}">
        <span class="end-rk" data-m="${i < 3 ? i + 1 : 0}">${MEDALS[i] || i + 1}</span>${car}
        <span class="end-name">${esc(p.nickname)}${badge}${me ? ` <small>(${t('end.you')})</small>` : ''}</span>
        <b class="end-sc">${esc(p.score)}<small>${esc(scoreLabel)}</small></b>
      </li>`;
    }).join('')}</ol>
    <a class="btn end-back" href="${esc(backHref)}">${t('app.back')}</a></div>`;
  // Ro'yxat uzun bo'lsa, bolaning o'z qatorini ko'rinadigan joyga keltiramiz (faqat ro'yxat ichida)
  const list = el.querySelector('.end-list'), meRow = el.querySelector('.is-me');
  if (list && meRow) list.scrollTop = Math.max(0, meRow.offsetTop - list.clientHeight / 2);
}

/**
 * "Siz xonadan chiqarildingiz" ekrani; 4 soniyadan keyin asosiy ekranga qaytaradi.
 * @param {HTMLElement} el @param {{backHref?:string}} [o]
 * @returns {()=>void} taymerni to'xtatuvchi cleanup
 */
export function renderKicked(el, { backHref = '#/' } = {}) {
  el.className = 'modal';
  el.hidden = false;
  el.innerHTML = `<div class="modal__card end" role="alertdialog">
    <h2>${t('kick.title')}</h2><p class="muted">${t('kick.text')}</p>
    <a class="btn end-back" href="${esc(backHref)}">${t('app.back')}</a></div>`;
  const timer = setTimeout(() => { location.hash = backHref; }, 4000);
  return () => clearTimeout(timer);
}