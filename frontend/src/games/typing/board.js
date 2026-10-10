/** @file Typing xonasi: o'yinchilar progress paneli (`room:snapshot`). Host uchun "Chiqarish" tugmasi. */
import { esc } from '../../utils/dom.js';
import { t } from '../../i18n/index.js';

/**
 * @param {HTMLElement} el
 * @param {{targetLength?:number, players?:{id:any,nickname:string,correct:number,finished:boolean,kicked?:boolean}[]}} snap
 * @param {{kickable?:boolean}} [opts]
 */
export function renderBoard(el, snap, { kickable = false } = {}) {
  const total = snap.targetLength || 0;
  el.innerHTML = [...(snap.players || [])]
    .sort((a, b) => b.correct - a.correct)
    .map((p) => {
      const pct = total ? Math.min(100, Math.round((p.correct / total) * 100)) : 0;
      const kick = kickable && !p.kicked
        ? `<button class="kick" data-kick="${esc(p.id)}" aria-label="${t('host.kick')}: ${esc(p.nickname)}">✕</button>` : '';
      return `<div class="row ${kickable ? 'row--kick' : ''} ${p.kicked ? 'is-kicked' : ''}"><span>${esc(p.nickname)}${p.finished ? ' 🏁' : ''}${p.kicked ? ' 🚫' : ''}</span><div class="bar"><i style="width:${pct}%"></i></div>${kick}</div>`;
    }).join('');
}
