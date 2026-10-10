/** @file Yakuniy reyting ekrani va "chiqarildingiz" ekrani (typing + labirint uchun umumiy). */
import { esc } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Backend o'yinchi ro'yxatini umumiy shaklga keltiradi.
 * @param {any[]} players @param {'correct'|'score'} scoreKey
 */
export const fromPlayers = (players, scoreKey) => (players || []).map((p) => ({
  id: p.id, nickname: p.nickname, score: p[scoreKey] ?? 0, rank: p.rank,
  finished: p.finished, eliminated: p.eliminated, kicked: p.kicked,
}));

/**
 * @param {HTMLElement} el
 * @param {{title?:string, players:any[], meId?:any, meNick?:string, backHref?:string, scoreLabel?:string, modal?:boolean}} o
 */
export function renderEndScreen(el, { title, players, meId = null, meNick = '', backHref = '#/', scoreLabel = t('score.points'), modal = false }) {
  const sorted = [...players].sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || (b.score || 0) - (a.score || 0));
  el.hidden = false;
  if (modal) el.className = 'modal';
  el.innerHTML = `<div class="modal__card end">
    <h2>${esc(title || t('end.title'))}</h2>
    <ol class="ranking">${sorted.map((p, i) => {
      const me = (p.id != null && p.id === meId) || (meNick && p.nickname === meNick);
      const badge = p.kicked ? ' 🚫' : p.eliminated ? ' 💀' : '';
      return `<li class="${me ? 'is-me' : ''}"><span>${MEDALS[i] || `${i + 1}.`} ${esc(p.nickname)}${badge}${me ? ` <small>(${t('end.you')})</small>` : ''}</span><b>${esc(p.score)} ${esc(scoreLabel)}</b></li>`;
    }).join('')}</ol>
    <a class="btn btn--big" href="${esc(backHref)}">${t('app.back')}</a></div>`;
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
    <a class="btn btn--big" href="${esc(backHref)}">${t('app.back')}</a></div>`;
  const timer = setTimeout(() => { location.hash = backHref; }, 4000);
  return () => clearTimeout(timer);
}
