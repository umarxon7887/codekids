/** @file Typing xonasi: o'yinchilar progress paneli (`room:snapshot` asosida). */
import { esc } from '../../utils/dom.js';

/**
 * @param {HTMLElement} el
 * @param {{targetLength?:number, players?:{nickname:string,correct:number,finished:boolean}[]}} snap
 */
export function renderBoard(el, snap) {
  const total = snap.targetLength || 0;
  el.innerHTML = [...(snap.players || [])]
    .sort((a, b) => b.correct - a.correct)
    .map((p) => {
      const pct = total ? Math.min(100, Math.round((p.correct / total) * 100)) : 0;
      return `<div class="row"><span>${esc(p.nickname)}${p.finished ? ' 🏁' : ''}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`;
    }).join('');
}
