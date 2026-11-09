/** @file Ustoz xona boshqaruvi: typing (kod, o'yinchilar, boshlash, yopish, chiqarish) yoki labirint (host rejimi). */
import '../styles/teacher.css';
import { connectSocket, emitAck } from '../core/socket.js';
import { closeRoom, kickPlayer } from '../core/roomApi.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { t } from '../i18n/index.js';
import { renderBoard } from '../games/typing/board.js';
import { renderEndScreen, fromPlayers } from '../ui/endscreen.js';

const BACK = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const ST = { waiting: t('hs.waiting'), active: t('hs.active'), finished: t('hs.finished') };

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
      <div class="hs-top"><a href="#/teacher" class="qe-back" aria-label="${t('app.backShort')}">${BACK}</a>
        <div><b>${t('hs.typingRoom')}</b><small id="hs-st">${t('hs.waiting')}</small></div></div>
      <div class="hs-code">
        <span class="hs-lbl">${t('home.codeLabel').toUpperCase()}</span>
        <div class="hs-digits">${esc(code)}</div>
        <small>${t('hs.codeHint')}</small>
        <div class="hs-cbtn"><button class="btn" id="hs-copy">${t('hs.copy')}</button><button class="btn" id="hs-board">${t('hs.toBoard')}</button></div>
      </div>
      <div class="hs-acts"><button id="start" class="btn hs-go">▶ ${t('hs.start')}</button><button id="close" class="hs-end">${t('hs.close')}</button></div>
      <div id="board" class="board"></div>
      <div id="h-end" hidden></div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  const setSt = (txt) => { const e = $('#hs-st'); if (e) e.textContent = txt; };

  $('#hs-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast(t('hs.copied'), 'success'); } catch { toast(`${t('hs.code')}: ${code}`); }
  };
  $('#hs-board').onclick = () => {
    const o = html(`<div class="hs-full" role="dialog" aria-label="${t('home.codeLabel')}"><span>${t('home.codeLabel')}</span><b>${esc(code)}</b><small>${t('hs.path')}</small><button class="btn">${t('app.close')}</button></div>`);
    document.body.appendChild(o);
    o.requestFullscreen?.().catch(() => {});
    o.querySelector('button').onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); o.remove(); };
  };

  const socket = connectSocket();
  if (!socket.connected) setSt(t('hs.connecting'));
  const onConn = () => setSt(t('hs.connected'));
  const onConnErr = (e) => setSt(`${t('hs.connErr')}: ${e?.message || '?'}`);
  socket.on('connect', onConn);
  socket.on('connect_error', onConnErr);
  let lastSnap = null, ended = false;

  function showEnd(players, title) {
    if (ended) return;
    ended = true;
    // Yakuniy ekranda kod kartasi va boshqaruv tugmalari kerak emas: faqat reyting qoladi
    $('.hs').classList.add('is-ended');
    setSt(`${t('hs.ended')} · ${t('hs.students', { n: players.length })}`);
    $('#board').hidden = true; $('.hs-code').hidden = true; $('.hs-acts').hidden = true;
    renderEndScreen($('#h-end'), { title, players: fromPlayers(players, 'correct'), backHref: '#/teacher', scoreLabel: t('score.letters') });
  }

  const onSnap = (snap) => {
    lastSnap = snap;
    setSt(`${ST[snap.status] || ''} · ${t('hs.students', { n: (snap.players || []).length })}`);
    if (ended) return;
    renderBoard($('#board'), snap, { kickable: true });
    $('#start').hidden = snap.status !== 'waiting';
    if (snap.status === 'finished') showEnd(snap.players);
  };
  const onFinished = (d) => showEnd(d?.players || lastSnap?.players || []);
  socket.on('room:snapshot', onSnap);
  socket.on('room:finished', onFinished);

  $('#start').onclick = async () => {
    const b = $('#start'); const t0 = b.textContent;
    b.disabled = true; b.textContent = t('hs.starting');
    try { await emitAck('room:start', { code }); }
    catch (e) { showError(e); setSt(e.code === 'NO_PLAYERS' ? t('hs.noPlayers') : `${t('hs.error')}: ${e.message} (${e.code || '?'})`); }
    finally { b.disabled = false; b.textContent = t0; }
  };
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
  return () => {
    socket.off('room:snapshot', onSnap); socket.off('room:finished', onFinished);
    socket.off('connect', rejoin); socket.off('connect', onConn); socket.off('connect_error', onConnErr);
  };
}
