/** @file Ustoz xona boshqaruvi: typing (kod, o'yinchilar, start, chiqarish, yopish, yakuniy natija). */
import { connectSocket, emitAck } from '../core/socket.js';
import { api } from '../core/api.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { renderBoard } from '../games/typing/board.js';
import { renderResults } from '../games/typing/results.js';

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
      <div class="game__bar"><a href="#/teacher" class="btn btn--ghost">←</a><h2>Typing xonasi</h2></div>
      <div class="bigcode">${esc(code)}</div>
      <p class="muted">O'quvchilar shu kodni kiritadi</p>
      <button id="start" class="btn btn--big">▶ Boshlash</button>
      <button id="close" class="btn btn--ghost">⏹ Xonani yopish</button>
      <div id="board" class="board"></div>
      <div id="kicks" class="kicks"></div>
      <div id="results" hidden></div>
    </section>`));

  const $ = (s) => root.querySelector(s);
  const socket = connectSocket();

  const onSnap = (snap) => {
    renderBoard($('#board'), snap);
    $('#start').hidden = snap.status !== 'waiting';
    const list = (snap.players || []).filter((p) => p.id);
    $('#kicks').innerHTML = list.map((p) =>
      `<div class="row"><span>${esc(p.nickname)}</span><button class="btn btn--ghost" data-kick="${esc(p.id)}">Chiqarish</button></div>`
    ).join('');
  };

  const onFinished = ({ players = [] }) => {
    $('#start').hidden = true;
    $('#close').hidden = true;
    $('#board').hidden = true;
    $('#kicks').hidden = true;
    const box = $('#results');
    box.hidden = false;
    renderResults(box, players, {
      title: 'Xona yopildi',
      onBack: () => { location.hash = '#/teacher'; },
    });
  };

  const onClick = async (e) => {
    const btn = e.target.closest('[data-kick]');
    if (!btn) return;
    if (!confirm("O'quvchini xonadan chiqarasizmi?")) return;
    try {
      await api.post(`/rooms/${code}/players/${btn.dataset.kick}/kick`, {});
      toast("O'quvchi chiqarildi", 'success');
    } catch (err) { showError(err); }
  };

  $('#start').onclick = async () => {
    try { await emitAck('room:start', { code }); } catch (e) { showError(e); }
  };
  $('#close').onclick = async () => {
    if (!confirm("Xonani yopasizmi? O'yin tugaydi.")) return;
    try { await api.post(`/rooms/${code}/close`, {}); } catch (e) { showError(e); }
  };

  socket.on('room:snapshot', onSnap);
  socket.on('room:finished', onFinished);
  root.addEventListener('click', onClick);

  try { await emitAck('room:join', { code }); } catch (e) { showError(e); }

  return () => {
    socket.off('room:snapshot', onSnap);
    socket.off('room:finished', onFinished);
    root.removeEventListener('click', onClick);
  };
}
