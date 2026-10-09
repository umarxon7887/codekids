/** @file Yakuniy natija ekrani (o'quvchi va ustoz uchun umumiy). */
import { esc } from '../../utils/dom.js';

/**
 * @param {HTMLElement} el
 * @param {{nickname:string,correct?:number,rank?:number,kicked?:boolean}[]} players
 * @param {{title?:string, onBack?:()=>void}} [opts]
 */
export function renderResults(el, players = [], { title = "O'yin tugadi", onBack } = {}) {
  const sorted = [...players].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (b.correct ?? 0) - (a.correct ?? 0));
  const rows = sorted.map((p, i) =>
    `<div class="row"><span>${i + 1}. ${esc(p.nickname)}${p.kicked ? ' (chiqarilgan)' : ''}</span><b>${p.correct ?? 0}</b></div>`
  ).join('') || '<p class="muted">Natijalar yo\'q</p>';
  el.innerHTML = `<div class="card"><h2>${esc(title)} 🏆</h2>${rows}<button id="res-back" class="btn btn--big">Asosiy ekranga qaytish</button></div>`;
  el.querySelector('#res-back').onclick = () => onBack?.();
}
