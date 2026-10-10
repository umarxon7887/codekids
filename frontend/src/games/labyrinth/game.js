/**
 * @file Labirint o'yini (server-authoritative, 3D). Oqim:
 *   labyrinth:join {code} -> labyrinth:init -> labyrinth:start (host)
 *   labyrinth:move {code,direction} -> ack {x,y,finished,question}; labyrinth:answer {code,choice}
 *   labyrinth:update / labyrinth:finished; chiqarish: `kicked` yoki KICKED xatosi; yopish: ROOM_CLOSED.
 * Harakat optimistik chiziladi, ack'dagi x,y bilan tuzatiladi. BLOCKED/TOO_FAST/LOCKED jim o'tkaziladi.
 */
import { connectSocket, emitAck } from '../../core/socket.js';
import { getUser } from '../../core/state.js';
import { closeRoom, kickPlayer } from '../../core/roomApi.js';
import { MOVE_COOLDOWN_MS } from '../../core/config.js';
import { showError, toast } from '../../core/toast.js';
import { html, esc, sleep } from '../../utils/dom.js';
import { formatTime } from '../../utils/format.js';
import { t } from '../../i18n/index.js';
import { renderEndScreen, renderKicked, fromPlayers } from '../../ui/endscreen.js';
import { createRenderer } from './factory.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SILENT = new Set(['BLOCKED', 'TOO_FAST', 'LOCKED']);
/** ISO yoki epoch-ms -> ms. @param {any} v */
const ts = (v) => (v == null ? 0 : typeof v === 'number' ? v : Date.parse(v) || 0);

/**
 * @param {HTMLElement} root
 * @param {{code:string, host?:boolean}} opts host=true: ustoz (o'ynamaydi; boshlaydi, kuzatadi, yopadi, chiqaradi)
 * @returns {Promise<()=>void>} cleanup
 */
export async function mountLabyrinth(root, { code, host = false }) {
  root.classList.toggle('lab-host', host);
  root.onclick = (e) => { if (e.target.closest('[data-board-toggle]')) root.classList.toggle('lab-board-open'); };
  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="${host ? '#/teacher' : '#/'}" class="btn btn--ghost lab-back" aria-label="Orqaga">◀</a><h2>Labirint <small>${esc(code)}</small></h2><span id="lab-time" class="pill">--:--</span></div>
      <div class="hud" id="hud" ${host ? 'hidden' : ''}><span id="hud-lives"></span><span id="hud-score">⭐ 0</span><span id="hud-rank"></span></div>
      <div class="game__stage"><div class="skeleton" id="lab-skel"></div><canvas id="maze" hidden></canvas></div>
      <div id="lab-lock" class="banner banner--warn" hidden></div>
      <div id="lab-wait" class="banner" ${host ? 'hidden' : ''}>Ustoz o'yinni boshlashini kuting...</div>
      <div class="row2" ${host ? '' : 'hidden'}>
        <button id="lab-start" class="btn btn--big" hidden>${t('host.start')}</button>
        <button id="lab-close" class="btn btn--danger">${t('host.close')}</button>
      </div>
      <div class="dpad" id="dpad" ${host ? 'hidden' : ''}>
        <button data-dir="up" aria-label="Yuqori">▲</button><button data-dir="left" aria-label="Chap">◀</button>
        <button data-dir="down" aria-label="Pastga">▼</button><button data-dir="right" aria-label="O'ng">▶</button>
      </div>
      <div id="lab-board" class="result board" hidden></div>
      <div id="lab-end" hidden></div>
      <div id="lab-modal" class="modal" hidden></div>
    </section>`));

  const $ = (s) => root.querySelector(s);
  const canvas = $('#maze');
  const socket = connectSocket();
  const cleanups = [];
  const me = getUser();
  let renderer = null;

  let offset = 0, status = 'waiting', endsAt = 0, lockedUntil = 0, playerId = null;
  let pos = { x: 0, y: 0 }, grid = null;
  let finished = false, busy = false, lastStep = 0, question = null, joinedOnce = false;
  let lastPlayers = [], endShown = false, kickStop = () => {};

  const now = () => Date.now() + offset;
  const syncClock = (serverNow) => { if (serverNow != null) offset = ts(serverNow) - Date.now(); };
  const locked = () => now() < lockedUntil;

  function setStatus(s, e) {
    if (s) status = s;
    if (e != null) endsAt = ts(e);
    $('#lab-wait').hidden = host || status !== 'waiting';
    $('#lab-start').hidden = !(host && status === 'waiting');
  }

  /** @param {{lives?:number|null,score?:number,rank?:number|null}} p */
  function hud(p) {
    if (!p || host) return;
    $('#hud-lives').textContent = p.lives == null ? '' : '❤️'.repeat(Math.max(0, p.lives));
    if (p.score != null) $('#hud-score').textContent = `⭐ ${p.score}`;
    if (p.rank) $('#hud-rank').textContent = `#${p.rank}`;
  }

  /** Host: jonli reyting + "Chiqarish" tugmalari. */
  function hostBoard(players) {
    if (!(players || []).length) { const b0 = $('#lab-board'); b0.hidden = false; b0.innerHTML = '<p class="muted">Hali o\'yinchilar yo\'q. O\'quvchilar kodni kiritganda shu yerda chiqadi.</p>'; return; }
    const el = $('#lab-board');
    el.hidden = false;
    const sorted = [...(players || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.score - a.score);
    el.innerHTML = `<h3>Reyting</h3>${sorted.map((p, i) => `<div class="row row--kick ${p.kicked ? 'is-kicked' : ''}">
      <span>${p.rank || i + 1}. ${esc(p.nickname)}${p.eliminated ? ' 💀' : p.finished ? ' 🏁' : ''}${p.kicked ? ' 🚫' : ''}</span><b>${esc(p.score ?? 0)}</b>
      ${p.kicked ? '' : `<button class="kick" data-kick="${esc(p.id)}" aria-label="${t('host.kick')}: ${esc(p.nickname)}">✕</button>`}</div>`).join('')}`;
  }

  function showEnd(players, title) {
    if (endShown) return;
    endShown = true;
    $('#lab-modal').hidden = true;
    $('#lab-board').hidden = true;
    $('#lab-start').hidden = true;
    $('#lab-close').hidden = true;
    renderEndScreen($('#lab-end'), {
      title, players: fromPlayers(players, 'score'), meId: playerId, meNick: me?.nickname,
      backHref: host ? '#/teacher' : '#/', modal: !host,
    });
  }

  function showKicked() {
    if (host || endShown) return;
    endShown = true; finished = true;
    $('#lab-modal').hidden = true;
    kickStop = renderKicked($('#lab-end'));
  }

  /** Xato kodlariga qarab holat o'zgarishi. @returns {boolean} xato qayta ishlandimi */
  function handleStateError(e) {
    if (e.code === 'KICKED' || e.code === 'NOT_A_PARTICIPANT') { showKicked(); return true; }
    if (e.code === 'ROOM_CLOSED' || e.code === 'ROOM_FINISHED') { showEnd(lastPlayers, t('end.closed')); return true; }
    return false;
  }

  function showQuestion(q) {
    question = q;
    const m = $('#lab-modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal__card"><h3>${esc(q.text)}</h3>
      <div class="opts">${q.options.map((o, i) => `<button class="btn btn--opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <p id="lab-fb" class="fb" role="status"></p></div>`;
    m.querySelectorAll('.btn--opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
  }

  async function answer(choice) {
    const m = $('#lab-modal');
    const btns = [...m.querySelectorAll('.btn--opt')];
    btns.forEach((b) => { b.disabled = true; });
    try {
      const r = await emitAck('labyrinth:answer', { code, choice });
      btns[r.correctIndex]?.classList.add('is-right');
      if (!r.correct) btns[choice]?.classList.add('is-wrong');
      $('#lab-fb').textContent = r.correct ? "To'g'ri! +10 ball" : "Noto'g'ri. 5 soniya kutasiz.";
      await sleep(1200);
      m.hidden = true;
      question = null;
      pos = { x: r.x, y: r.y };
      if (r.correct) renderer.markCleared(r.x, r.y);
      renderer.setMe(r.x, r.y);
      lockedUntil = ts(r.lockedUntil);
      hud(r);
      if (r.finished) { finished = true; toast(r.eliminated ? 'Jonlaringiz tugadi' : 'Marraga yetdingiz! 🎉', r.eliminated ? 'error' : 'success'); }
    } catch (e) {
      if (handleStateError(e)) return;
      showError(e);
      btns.forEach((b) => { b.disabled = false; });
    }
  }

  /** @param {keyof typeof DIRS} dir */
  async function step(dir) {
    if (host || busy || finished || endShown || status !== 'active' || locked()) return;
    if (question) return showQuestion(question);
    const tNow = performance.now();
    if (tNow - lastStep < MOVE_COOLDOWN_MS) return;
    const [dx, dy] = DIRS[dir];
    const nx = pos.x + dx, ny = pos.y + dy;
    if (grid[ny]?.[nx] === undefined || String(grid[ny][nx]) === '1') return;
    lastStep = tNow;
    busy = true;
    renderer.setMe(nx, ny); // optimistik
    try {
      const r = await emitAck('labyrinth:move', { code, direction: dir });
      pos = { x: r.x, y: r.y };
      renderer.setMe(r.x, r.y);
      if (r.finished) { finished = true; toast('Marraga yetdingiz! 🎉', 'success'); }
      if (r.question) showQuestion(r.question);
    } catch (e) {
      renderer.setMe(pos.x, pos.y); // silliq rollback (uzoq bo'lsa renderer o'zi sakraydi)
      if (!handleStateError(e) && !SILENT.has(e.code)) showError(e);
    } finally { busy = false; }
  }

  // ---- server eventlari ----
  const onInit = (init) => {
    $('#lab-skel')?.remove();
    canvas.hidden = false;
    syncClock(init.serverNow);
    grid = init.grid;
    renderer.load({ grid, size: init.size, start: init.start, exit: init.exit, checkpoints: init.checkpoints });
    renderer.start();
    setStatus(init.status, init.endsAt);
    const you = init.you;
    if (you) {
      playerId = you.id;
      pos = { x: you.x, y: you.y };
      renderer.setMe(pos.x, pos.y, true);
      renderer.setCleared(you.cleared);
      finished = !!(you.finished || you.eliminated);
      lockedUntil = ts(you.lockedUntil);
      hud(you);
      if (you.question) showQuestion(you.question);
    }
    lastPlayers = init.players || [];
    renderer.setPlayers(lastPlayers, playerId);
    if (host) hostBoard(lastPlayers);
    if (init.status === 'finished') showEnd(lastPlayers, t('end.title'));
  };
  const onUpdate = (u) => {
    syncClock(u.serverNow);
    setStatus(u.status, u.endsAt);
    lastPlayers = u.players || lastPlayers;
    renderer.setPlayers(lastPlayers, playerId);
    const mine = lastPlayers.find((p) => p.id === playerId);
    if (mine) { hud(mine); if (mine.finished) finished = true; if (mine.kicked) showKicked(); }
    if (host && !endShown) hostBoard(lastPlayers);
  };
  const onFinished = ({ players }) => { status = 'finished'; lastPlayers = players || lastPlayers; showEnd(lastPlayers, t('end.title')); };
  const onKicked = () => showKicked();
  const onClosed = () => showEnd(lastPlayers, t('end.closed'));
  const onReconnect = () => { if (joinedOnce && !endShown) emitAck('labyrinth:join', { code }).catch((e) => { if (!handleStateError(e)) showError(e); }); };

  const handlers = {
    'labyrinth:init': onInit, 'labyrinth:update': onUpdate, 'labyrinth:finished': onFinished,
    kicked: onKicked, connect: onReconnect,
  };
  Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
  cleanups.push(() => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn)));

  // ---- renderer (3D, WebGL bo'lmasa 2D) ----
  renderer = await createRenderer(canvas);
  const onLowPower = (e) => renderer.setLowPower(e.detail);
  window.addEventListener('ck:lowpower', onLowPower);
  cleanups.push(() => window.removeEventListener('ck:lowpower', onLowPower));

  // ---- boshqaruv ----
  const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  const onKey = (e) => { const d = keyMap[e.key]; if (d) { e.preventDefault(); step(d); } };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  root.querySelectorAll('#dpad button').forEach((btn) => {
    let timer;
    const dir = btn.dataset.dir;
    const stop = () => clearInterval(timer);
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); step(dir); timer = setInterval(() => step(dir), MOVE_COOLDOWN_MS); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
    cleanups.push(stop);
  });

  let sx = 0, sy = 0;
  canvas.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  // ---- host amallari ----
  $('#lab-start').onclick = async () => {
    try { const r = await emitAck('labyrinth:start', { code }); setStatus(r.status, r.endsAt); } catch (e) { showError(e); }
  };
  $('#lab-close').onclick = async () => {
    if (!confirm(t('host.confirmClose'))) return;
    try {
      await closeRoom(code);
      toast(t('host.closedToast'), 'success');
      setTimeout(() => showEnd(lastPlayers, t('end.closed')), 1200); // server event kelmasa ham
    } catch (e) { showError(e); }
  };
  $('#lab-board').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-kick]');
    if (!b || !confirm(t('host.confirmKick'))) return;
    try { await kickPlayer(code, b.dataset.kick); toast(t('host.kicked'), 'success'); } catch (e) { showError(e); }
  });

  // taymer + qulf banneri (+ 3D qahramon holati)
  const clock = setInterval(() => {
    $('#lab-time').textContent = status === 'active' && endsAt ? formatTime(endsAt - now()) : '--:--';
    const left = Math.ceil((lockedUntil - now()) / 1000);
    const isLocked = left > 0 && !finished;
    const lock = $('#lab-lock');
    lock.hidden = !isLocked;
    if (isLocked) lock.textContent = `⏳ Qulf: ${left} s`;
    renderer?.setLocked(isLocked);
  }, 250);
  cleanups.push(() => clearInterval(clock));

  // ---- qo'shilish ----
  try {
    await emitAck('labyrinth:join', { code });
    joinedOnce = true;
  } catch (e) {
    if (!handleStateError(e)) showError(e);
    $('#lab-skel')?.replaceChildren(document.createTextNode("Xonaga qo'shilib bo'lmadi"));
  }
  const initTimeout = setTimeout(() => {
    const s = $('#lab-skel');
    if (s) s.textContent = "Xona ma'lumoti kelmadi. Qayta urinib ko'ring.";
  }, 10000);
  cleanups.push(() => clearTimeout(initTimeout));

  return () => { cleanups.forEach((fn) => fn()); kickStop(); renderer?.destroy(); };
}
