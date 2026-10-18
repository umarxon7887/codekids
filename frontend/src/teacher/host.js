/** @file Ustoz xona boshqaruvi: typing (kod, o'yinchilar, boshlash, yopish, chiqarish) yoki labirint (host rejimi). */
import '../styles/teacher.css';
import { connectSocket, emitAck } from '../core/socket.js';
import { closeRoom, kickPlayer } from '../core/roomApi.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { renderBoard } from '../games/typing/board.js';
import { renderEndScreen, fromPlayers } from '../ui/endscreen.js';

/**
 * @param {HTMLElement} root
 * @param {{code:string, game:'typing'|'labyrinth'}} opts
 * @returns {Promise<()=>void>}
 */
export async function mountHost(root, { code, game }) {
  if (game === 'labyrinth') {
    return (await import('../games/labyrinth/game.js')).mountLabyrinth(root, { code, host: true });
  }
  root.replaceChildren(html(`
    <section class="hs">
      <div class="hs-top"><a href="#/teacher" class="qe-back" aria-label="Orqaga"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>
        <div><b>Typing xonasi</b><small id="hs-st">Kutilmoqda</small></div></div>
      <div class="hs-code">
        <span class="hs-lbl">XONA KODI</span>
        <div class="hs-digits">${esc(code)}</div>
        <small>O'quvchilar bosh sahifada shu kodni yozib kiradi</small>
        <div class="hs-cbtn"><button class="btn" id="hs-copy">Nusxa olish</button><button class="btn" id="hs-board">Doskaga</button></div>
      </div>
      <div class="hs-acts"><button id="start" class="btn hs-go">▶ O'yinni boshlash</button><button id="close" class="hs-end">Xonani yopish</button></div>
      <div id="board" class="board"></div>
      <div id="h-end" hidden></div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  $('#hs-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast('Kod nusxalandi', 'success'); } catch { toast(`Kod: ${code}`); }
  };
  $('#hs-board').onclick = () => {
    const o = html(`<div class="hs-full" role="dialog" aria-label="Xona kodi"><span>Xona kodi</span><b>${esc(code)}</b><small>Bosh sahifa → «Xonaga kirish»</small><button class="btn">Yopish</button></div>`);
    document.body.appendChild(o);
    o.requestFullscreen?.().catch(() => {});
    o.querySelector('button').onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); o.remove(); };
  };
  const socket = connectSocket();
  let lastSnap = null, ended = false;

  $('#codecard').onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast('Kod nusxalandi', 'success'); } catch { /* clipboard ruxsat bermasa jim */ }
  };

  function showEnd(players, title) {
    if (ended) return;
    ended = true;
    $('#board').hidden = true; $('#start').hidden = true; $('#close').hidden = true; $('#h-chip').hidden = true;
    renderEndScreen($('#h-end'), { title, players: fromPlayers(players, 'correct'), backHref: '#/teacher', scoreLabel: t('score.letters') });
  }

  const onSnap = (snap) => {
    lastSnap = snap;
    const stEl = root.querySelector('#hs-st');
    if (stEl) stEl.textContent = ({ waiting: 'Kutilmoqda', active: "O'yin ketmoqda", finished: 'Tugadi' }[snap.status] || '') + ` · ${(snap.players || []).length} o'quvchi`;
    if (ended) return;
    renderBoard($('#board'), snap, { kickable: true });
    $('#start').hidden = snap.status !== 'waiting';
    const n = (snap.players || []).length;
    $('#h-chip').textContent = snap.status === 'active' ? `🏎️ Poyga ketmoqda · ${n} ta o'quvchi` : `👥 ${n} ta o'quvchi qo'shildi`;
    if (snap.status === 'finished') showEnd(snap.players);
  };
  const onFinished = (d) => showEnd(d?.players || lastSnap?.players || []);
  socket.on('room:snapshot', onSnap);
  socket.on('room:finished', onFinished);

  $('#start').onclick = async () => { try { await emitAck('room:start', { code }); } catch (e) { showError(e); } };
  $('#close').onclick = async () => {
    if (!confirm(t('host.confirmClose'))) return;
    try {
      await closeRoom(code);
      toast(t('host.closedToast'), 'success');
      setTimeout(() => showEnd(lastSnap?.players || [], t('end.closed')), 1200); // server event kelmasa ham
    } catch (e) { showError(e); }
  };
  $('#board').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-kick]');
    if (!b || !confirm(t('host.confirmKick'))) return;
    try { await kickPlayer(code, b.dataset.kick); toast(t('host.kicked'), 'success'); } catch (e) { showError(e); }
  });

  try { await emitAck('room:join', { code }); } catch (e) { showError(e); }
  const rejoin = () => emitAck('room:join', { code }).catch(() => {}); // ulanish tiklansa xonaga qayta qo'shilish
  socket.on('connect', rejoin);
  return () => { socket.off('room:snapshot', onSnap); socket.off('room:finished', onFinished); socket.off('connect', rejoin); };
}
