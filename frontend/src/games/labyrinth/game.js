/**
 * @file Labirint o'yini (server-authoritative). Oqim:
 *   labyrinth:join {code} -> labyrinth:init (grid, you, players) -> labyrinth:start (host)
 *   harakat: labyrinth:move {code,direction} -> ack {x,y,finished,question}
 *   checkpoint: savol -> labyrinth:answer {code,choice}
 *   holat: labyrinth:update / labyrinth:finished
 * Harakat optimistik chiziladi, ack kelgach serverdagi x,y bilan tuzatiladi.
 */
import { connectSocket, emitAck } from '../../core/socket.js';
import { MOVE_COOLDOWN_MS } from '../../core/config.js';
import { showError, toast } from '../../core/toast.js';
import { MazeRenderer } from './renderer.js';
import { html, esc, sleep } from '../../utils/dom.js';
import { formatTime } from '../../utils/format.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SILENT = new Set(['BLOCKED', 'TOO_FAST', 'LOCKED', 'OFFLINE', 'RATE_LIMITED']);
/** ISO yoki epoch-ms -> ms. @param {any} v */
const ts = (v) => (v == null ? 0 : typeof v === 'number' ? v : Date.parse(v) || 0);

/**
 * @param {HTMLElement} root
 * @param {{code:string, host?:boolean}} opts host=true: ustoz (o'ynamaydi, boshlaydi va kuzatadi)
 * @returns {Promise<()=>void>} cleanup
 */
export async function mountLabyrinth(root, { code, host = false }) {
  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost">←</a><h2>Labirint <small>${esc(code)}</small></h2><span id="lab-time" class="pill">--:--</span></div>
      <div class="hud" id="hud" ${host ? 'hidden' : ''}><span id="hud-lives"></span><span id="hud-score">⭐ 0</span><span id="hud-rank"></span></div>
      <div class="game__stage"><div class="skeleton" id="lab-skel"></div><canvas id="maze" hidden></canvas></div>
      <div id="lab-lock" class="banner banner--warn" hidden></div>
      <div id="lab-wait" class="banner" ${host ? 'hidden' : ''}>Ustoz o'yinni boshlashini kuting...</div>
      <button id="lab-start" class="btn btn--big" hidden>▶ Boshlash</button>
      <div class="dpad" id="dpad" ${host ? 'hidden' : ''}>
        <button data-dir="up" aria-label="Yuqori">▲</button><button data-dir="left" aria-label="Chap">◀</button>
        <button data-dir="down" aria-label="Pastga">▼</button><button data-dir="right" aria-label="O'ng">▶</button>
      </div>
      <div id="lab-board" class="result" hidden></div>
      <div id="lab-modal" class="modal" hidden></div>
    </section>`));

  const $ = (s) => root.querySelector(s);
  const canvas = $('#maze');
  const renderer = new MazeRenderer(canvas);
  const socket = connectSocket();
  const cleanups = [];

  let offset = 0, status = 'waiting', endsAt = 0, lockedUntil = 0, playerId = null;
  let me = { x: 0, y: 0 }, grid = null, size = 0;
  let finished = false, busy = false, lastStep = 0, question = null, joinedOnce = false;
  let cooldown = MOVE_COOLDOWN_MS;

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

  function board(players, title) {
    const el = $('#lab-board');
    const sorted = [...(players || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.score - a.score);
    el.hidden = false;
    el.innerHTML = `<h3>${title}</h3>${sorted.map((p, i) => `<div class="row"><span>${p.rank || i + 1}. ${esc(p.nickname)}${p.eliminated ? ' 💀' : p.finished ? ' 🏁' : ''}</span><b>${esc(p.score ?? 0)}</b></div>`).join('')}`;
  }

  function showQuestion(q) {
    question = q;
    const m = $('#lab-modal');
    m.hidden = false;
    m.innerHTML = `<div class="modal__card"><h3>${esc(q.text)}</h3>
      <div class="opts">${q.options.map((o, i) => `<button class="btn btn--opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <p id="lab-fb" class="fb"></p></div>`;
    m.querySelectorAll('.btn--opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
  }

  async function answer(choice) {
    const m = $('#lab-modal');
    const btns = [...m.querySelectorAll('.btn--opt')];
    btns.forEach((b) => { b.disabled = true; });
    try {
      const r = await emitAck('labyrinth:answer', { code, choice }, 8000, { queue: false });
      btns[r.correctIndex]?.classList.add('is-right');
      if (!r.correct) btns[choice]?.classList.add('is-wrong');
      $('#lab-fb').textContent = r.correct ? "To'g'ri! +10 ball" : "Noto'g'ri. 5 soniya kutasiz.";
      await sleep(1200);
      m.hidden = true;
      question = null;
      me = { x: r.x, y: r.y };
      if (r.correct) renderer.markCleared(r.x, r.y);
      renderer.setMe(r.x, r.y, true);
      lockedUntil = ts(r.lockedUntil);
      hud(r);
      if (r.finished) { finished = true; toast(r.eliminated ? 'Jonlaringiz tugadi' : 'Marraga yetdingiz! 🎉', r.eliminated ? 'error' : 'success'); }
    } catch (e) {
      showError(e);
      btns.forEach((b) => { b.disabled = false; });
    }
  }

  /** @param {keyof typeof DIRS} dir */
  async function step(dir) {
    if (host || busy || finished || status !== 'active' || locked()) return;
    if (question) return showQuestion(question);
    const t = performance.now();
    if (t - lastStep < cooldown) return;
    const [dx, dy] = DIRS[dir];
    const nx = me.x + dx, ny = me.y + dy;
    if (grid[ny]?.[nx] === undefined || String(grid[ny][nx]) === '1') return;
    lastStep = t;
    busy = true;
    renderer.setMe(nx, ny); // optimistik
    try {
      const r = await emitAck('labyrinth:move', { code, direction: dir }, 3000, { queue: false });
      me = { x: r.x, y: r.y };
      renderer.setMe(r.x, r.y, true);
      if (r.finished) { finished = true; toast('Marraga yetdingiz! 🎉', 'success'); }
      if (r.question) showQuestion(r.question);
    } catch (e) {
      renderer.setMe(me.x, me.y, true);
      if (e.code === 'TOO_FAST' || e.code === 'RATE_LIMITED') cooldown = Math.min(400, cooldown + 25);
      if (!SILENT.has(e.code)) showError(e);
    } finally { busy = false; }
  }

  // ---- server eventlari ----
  const onInit = (init) => {
    $('#lab-skel')?.remove();
    canvas.hidden = false;
    syncClock(init.serverNow);
    grid = init.grid; size = init.size;
    renderer.load({ grid, size, start: init.start, exit: init.exit, checkpoints: init.checkpoints });
    renderer.start();
    setStatus(init.status, init.endsAt);
    const you = init.you;
    if (you) {
      playerId = you.id;
      me = { x: you.x, y: you.y };
      renderer.setMe(me.x, me.y, true);
      renderer.setCleared(you.cleared);
      finished = !!(you.finished || you.eliminated);
      lockedUntil = ts(you.lockedUntil);
      hud(you);
      if (you.question) showQuestion(you.question);
    }
    renderer.setPlayers(init.players || [], playerId);
    if (host) board(init.players, 'Ishtirokchilar');
  };
  const onUpdate = (u) => {
    syncClock(u.serverNow);
    setStatus(u.status, u.endsAt);
    renderer.setPlayers(u.players || [], playerId);
    const mine = (u.players || []).find((p) => p.id === playerId);
    if (mine) { hud(mine); if (mine.finished) finished = true; }
    if (host) board(u.players, 'Reyting');
  };
  const onFinished = ({ players }) => { status = 'finished'; board(players, "O'yin tugadi 🏆"); };
  const onReconnect = () => { if (joinedOnce) emitAck('labyrinth:join', { code }).catch(showError); };

  socket.on('labyrinth:init', onInit);
  socket.on('labyrinth:update', onUpdate);
  socket.on('labyrinth:finished', onFinished);
  socket.on('connect', onReconnect);
  cleanups.push(() => {
    socket.off('labyrinth:init', onInit); socket.off('labyrinth:update', onUpdate);
    socket.off('labyrinth:finished', onFinished); socket.off('connect', onReconnect);
  });

  // ---- boshqaruv ----
  const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  const onKey = (e) => { const d = keyMap[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (d) { e.preventDefault(); step(d); } };
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

  $('#lab-start').onclick = async () => {
    try { const r = await emitAck('labyrinth:start', { code }); setStatus(r.status, r.endsAt); } catch (e) { showError(e); }
  };

  // taymer + qulf banneri
  const clock = setInterval(() => {
    $('#lab-time').textContent = status === 'active' && endsAt ? formatTime(endsAt - now()) : '--:--';
    const lock = $('#lab-lock');
    const left = Math.ceil((lockedUntil - now()) / 1000);
    lock.hidden = !(left > 0 && !finished);
    if (left > 0) lock.textContent = `⏳ Qulf: ${left} s`;
  }, 250);
  cleanups.push(() => clearInterval(clock));

  // ---- qo'shilish ----
  try {
    await emitAck('labyrinth:join', { code });
    joinedOnce = true;
  } catch (e) {
    showError(e);
    $('#lab-skel').textContent = "Xonaga qo'shilib bo'lmadi";
  }
  const initTimeout = setTimeout(() => { const s = $('#lab-skel'); if (s) s.textContent = "Xona ma'lumoti kelmadi. Qayta urinib ko'ring."; }, 10000);
  cleanups.push(() => clearTimeout(initTimeout));

  return () => { cleanups.forEach((fn) => fn()); renderer.destroy(); };
}
