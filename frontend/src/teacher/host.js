/** @file Ustoz xona boshqaruvi: typing (kod, o'yinchilar, boshlash, yopish, chiqarish) yoki labirint (host rejimi). */
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
    <section class="game">
      <div class="game__bar"><a href="#/teacher" class="btn btn--ghost" aria-label="Orqaga">←</a><h2>Typing xonasi</h2></div>
      <div class="bigcode">${esc(code)}</div>
      <p class="muted">${t('host.codeHint')}</p>
      <div class="row2"><button id="start" class="btn btn--big">${t('host.start')}</button><button id="close" class="btn btn--danger">${t('host.close')}</button></div>
      <div id="board" class="board"></div>
      <div id="h-end" hidden></div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  const socket = connectSocket();
  let lastSnap = null, ended = false;

  function showEnd(players, title) {
    if (ended) return;
    ended = true;
    $('#board').hidden = true; $('#start').hidden = true; $('#close').hidden = true;
    renderEndScreen($('#h-end'), { title, players: fromPlayers(players, 'correct'), backHref: '#/teacher', scoreLabel: t('score.letters') });
  }

  const onSnap = (snap) => {
    lastSnap = snap;
    if (ended) return;
    renderBoard($('#board'), snap, { kickable: true });
    $('#start').hidden = snap.status !== 'waiting';
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
  return () => { socket.off('room:snapshot', onSnap); socket.off('room:finished', onFinished); };
}
