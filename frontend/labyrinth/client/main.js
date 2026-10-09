// Hammasini bog'lovchi modul (backend shartnomasi bo'yicha).
// ui — sizning interfeysingiz (DOM/React). Kerakli metodlar:
//   setConnection(status) · showWaiting(bool) · setHud(me) · setTimer(localEndsAtMs|null) · toast(text)
//   showQuestion(q, onChoose(choiceIndex)) · showAnswerResult({correct, correctIndex?}) · closeQuestion()
//   showLock(localUntilMs) · showAuthRequired?() · showSpectator(bool) · showFinish({me, players, final}) · setScoreboard?(players)
// makeAvatar(isMe) -> THREE.Object3D. Yurish animatsiyasi uchun: obj.userData.onTick = (dt, isMoving) => {...}
import * as THREE from 'three';
import { DIRECTION, ERR, State } from './constants.js';
import { GameStateMachine } from './state-machine.js';
import { SocketManager } from './socket-manager.js';
import { MazeRenderer } from './maze-renderer.js';
import { PlayerView } from './smooth-movement.js';
import { InputController } from './input.js';

// getToken: () => Promise<string> (ApiClient.getToken) · onAuthError: () => Promise (ApiClient.refresh)
export function startLabyrinth({ canvas, io, serverUrl, code, getToken, onAuthError, ui, makeAvatar, assets }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(5, 12, 6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8a6a, 1), sun);

  const fsm = new GameStateMachine(), maze = new MazeRenderer(scene, assets);
  const net = new SocketManager({ io, url: serverUrl, code, getToken, onAuthError, moveIntervalMs: 200 });
  const input = new InputController(canvas, { mode: 'swipe' });
  const views = new Map(); // 'self' | playerKey -> PlayerView
  const tmp = new THREE.Vector3();
  let me = null, selfId = null, selfName = null, status = 'waiting', endsAt = null, clockOffset = 0, lockedUntil = 0;
  let mazeKey = '', host = false, lastPlayers = [], resyncAt = 0, warnedId = false;
  const toLocal = (serverTs) => serverTs - clockOffset; // server vaqtini client soatiga o'tkazish (soat farqi uchun)

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (maze.size) maze.fitCamera(camera); };
  addEventListener('resize', resize); resize();

  const newView = (key, isMe) => { const v = new PlayerView(makeAvatar(isMe)); views.set(key, v); scene.add(v.object); return v; };
  const dropView = (key) => { const v = views.get(key); if (v) { scene.remove(v.object); views.delete(key); } };
  const isSelf = (p) => (selfId && p.id ? p.id === selfId : !selfId && !!selfName && p.nickname === selfName);

  // ---- Server -> client ----
  net.on('connection', ({ status: s }) => { ui.setConnection(s); if (s === 'online') fsm.go(State.GENERATING); });
  net.on('error', (e) => { if (e.fatal) ui.showAuthRequired?.(); else ui.toast(e.message); });

  net.on('init', (d) => { // reconnect'da ham keladi: labirint o'zgarmagan bo'lsa qayta qurmaymiz
    const key = `${d.size}:${d.grid.join('')}:${d.checkpoints?.length ?? 0}`;
    if (key !== mazeKey) { maze.build(d); maze.fitCamera(camera); mazeKey = key; [...views.keys()].forEach(dropView); }
    clockOffset = d.serverNow ? d.serverNow - Date.now() : 0;
    endsAt = d.endsAt ?? null; status = d.status; host = !d.you; // host uchun you === null
    if (d.you) {
      me = { ...d.you }; selfId = me.id ?? net.playerId ?? null; selfName = me.nickname ?? null;
      (views.get('self') ?? newView('self', true)).teleport(maze.cellToWorld(me.x, me.y, tmp));
      (me.cleared ?? []).forEach((c) => maze.markCleared(c.x, c.y));
      lockedUntil = me.lockedUntil ? toLocal(me.lockedUntil) : 0;
      if (!selfId && !warnedId) { warnedId = true; console.warn('players[].id / you.id yo\'q: o\'z avatarim ikki marta chizilishi mumkin'); }
    } else { me = null; dropView('self'); }
    lastPlayers = d.players; syncPlayers(d.players); applyStatus();
    if (me?.question) openQuestion(me.question); // qayta ulanishda kutilayotgan savol
  });

  net.on('update', (u) => {
    const prev = status; status = u.status; lastPlayers = u.players;
    if (u.endsAt) { endsAt = u.endsAt; ui.setTimer(toLocal(endsAt)); }
    syncPlayers(u.players);
    if (status === 'active' && !endsAt && !net.busy) net.join(); // endsAt yo'q -> init orqali olamiz
    if (prev !== status) applyStatus();
  });

  net.on('finished', ({ players }) => { // vaqt tugadi
    status = 'finished'; lastPlayers = players; input.stop(); fsm.go(State.FINISHED);
    ui.showFinish({ me, players, final: true });
  });

  function syncPlayers(list) {
    const seen = new Set();
    for (const p of list) {
      if (isSelf(p)) { seen.add('self'); mergeSelf(p); continue; }
      const key = p.id ?? p.nickname; seen.add(key);
      const w = maze.cellToWorld(p.x, p.y, tmp), v = views.get(key);
      if (!v) newView(key, false).teleport(w); else v.pushWaypoint(w);
      views.get(key).object.visible = !p.eliminated;
    }
    for (const key of [...views.keys()]) if (key !== 'self' && !seen.has(key)) dropView(key);
    ui.setScoreboard?.(list);
  }

  function mergeSelf(p) { // o'z pozitsiyam ack'dan keladi; update faqat qolgan maydonlar + respawn uchun
    if (!me) return;
    Object.assign(me, { lives: p.lives, score: p.score, finished: p.finished, eliminated: p.eliminated, rank: p.rank });
    if (!net.busy && (p.x !== me.x || p.y !== me.y)) { me.x = p.x; me.y = p.y; views.get('self')?.pushWaypoint(maze.cellToWorld(p.x, p.y, tmp)); }
    ui.setHud(me);
    if (me.eliminated) spectate(); else if (me.finished) finishSelf();
  }

  function applyStatus() {
    if (status === 'waiting') { fsm.go(State.LOBBY); ui.showWaiting(true); return; }
    ui.showWaiting(false); ui.setTimer(endsAt ? toLocal(endsAt) : null);
    if (status === 'finished') { fsm.go(State.FINISHED); return; }
    if (me?.eliminated) spectate(); else if (me?.finished) finishSelf(); else if (fsm.state !== State.ANSWERING) fsm.go(State.PLAYING);
  }
  const spectate = () => { fsm.spectator = true; fsm.go(State.FINISHED); input.stop(); ui.showSpectator(true); }; // eliminated: finished ham true bo'ladi — shuning uchun avval shu tekshiriladi
  const finishSelf = () => { fsm.go(State.FINISHED); input.stop(); ui.showFinish({ me, players: lastPlayers, final: false }); };

  // ---- Client -> server ----
  function openQuestion(q) {
    if (!fsm.go(State.ANSWERING)) return;
    input.stop();
    ui.showQuestion(q, async (choice) => handleAnswer(await net.answer(choice)));
  }

  function handleAnswer(res) {
    if (!res?.ok) {
      if (res?.error?.code === ERR.NO_PENDING_QUESTION) { ui.closeQuestion(); fsm.go(State.PLAYING); } else ui.toast(res?.error?.message ?? 'Xato'); // TIMEOUT: savol ochiq qoladi, qayta bosish mumkin
      return;
    }
    ui.showAnswerResult(res);
    if (res.correct) maze.markCleared(me.x, me.y); // respawn'dan OLDIN (checkpoint shu yerda)
    Object.assign(me, { lives: res.lives, score: res.score, finished: res.finished, eliminated: res.eliminated });
    if (res.x != null && (res.x !== me.x || res.y !== me.y)) { me.x = res.x; me.y = res.y; views.get('self').pushWaypoint(maze.cellToWorld(res.x, res.y, tmp)); }
    if (res.lockedUntil) { lockedUntil = toLocal(res.lockedUntil); ui.showLock(lockedUntil); }
    ui.setHud(me);
    if (res.eliminated) spectate(); else if (res.finished) finishSelf(); else fsm.go(State.PLAYING);
  }

  function handleMove(res) {
    if (!res) return;
    if (res.ok) {
      me.x = res.x; me.y = res.y; views.get('self').pushWaypoint(maze.cellToWorld(res.x, res.y, tmp));
      if (res.finished) { me.finished = true; finishSelf(); }
      if (res.question) openQuestion(res.question);
      return;
    }
    switch (res.error?.code) {
      case ERR.BLOCKED: input.stop(); break;                                   // devorga urildi
      case ERR.QUESTION_PENDING: if (Date.now() > resyncAt) { resyncAt = Date.now() + 2000; net.join(); } break; // sinxron emas: init savolni qaytaradi
      case ERR.PLAYER_FINISHED: me.finished = true; if (me.eliminated) spectate(); else finishSelf(); break;
      case ERR.ROOM_NOT_ACTIVE: case ERR.ROOM_FINISHED: input.stop(); break;
      default: break;                                                          // TOO_FAST, RATE_LIMITED, LOCKED, VALIDATION_ERROR, TIMEOUT: jimgina (cooldown o'zi moslashadi)
    }
  }

  // ---- O'yin tsikli ----
  const clock = new THREE.Clock();
  let raf = 0;
  (function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05), self = views.get('self');
    // Server tasdig'ini kutamiz (busy), lekin avatar yo'lda bo'lsa ham keyingi niyatni yuboramiz (backlog <= 1) -> uzluksiz harakat.
    if (fsm.canMove && me && self && !me.finished && Date.now() >= lockedUntil && self.backlog <= 1 && net.ready) {
      const dir = input.pull();
      if (dir) {
        const nx = me.x + dir.dx, ny = me.y + dir.dy;
        if (!maze.isWalkable(nx, ny)) input.stop(); else net.move(DIRECTION(dir.dx, dir.dy)).then(handleMove); // oldindan filtr faqat UX uchun; haqiqiy tekshiruv serverda
      }
    }
    views.forEach((v) => { v.update(dt); v.object.userData.onTick?.(dt, v.isMoving); });
    maze.update(dt);
    renderer.render(scene, camera);
  })();

  return { fsm, net, dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); net.dispose(); renderer.dispose(); } };
}
