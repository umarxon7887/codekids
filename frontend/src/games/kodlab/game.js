/**
 * @file Kibi labirinti: blokli dasturlash o'yini (#/kod-labirint).
 * O'quvchi bloklardan dastur yig'adi (Oldinga yur, Chapga/O'ngga buril, Takrorla N), Kibi izometrik 3D plitalar
 * ustida dasturni bajaradi va zaryadlovchiga yetishi kerak. 50 daraja (levels.js), yulduzlar blok soniga qarab.
 * Progress serverda (GET/POST /api/v1/kodlab): yechim serverda qayta bajariladi, o'tilgan daraja va yangi yulduzlar uchun coin.
 * localStorage ck_kl_<user id> = {daraja indeksi: yulduz} faqat tez ko'rsatish uchun nusxa (home.js ham o'qiydi).
 */
import '../../styles/kl.css';
import { BASE_URL } from '../../core/config.js';
import { getUser } from '../../core/state.js';
import { api } from '../../core/api.js';
import { coinSvg } from '../../ui/tl/coin.js';
import { html } from '../../utils/dom.js';
import { t, getLang, langButton } from '../../i18n/index.js';
import { LEVELS } from './levels.js';
import { sfx, musicStart, musicStop, isMuted, isMusicOn, toggleMute, toggleMusic } from './sound.js';

const A = (f) => `${BASE_URL}kl/${f}`;
const IMG = {
  path: A('tile-path.webp'), start: A('tile-start.webp'), goal: A('goal.webp'),
  say: A('kibi-say.webp'), back: A('kibi-back.webp'), front: A('kibi-front.webp'), head: A('kibi-head.webp'),
  win: `${BASE_URL}it/kibi/galaba.webp`, oops: `${BASE_URL}it/kibi/dalda.webp`,
};
const SV = (d, w = 2.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  F: SV('<path d="M12 20V5M6 11l6-6 6 6"/>', 3),
  L: SV('<path d="M18 20v-6a5 5 0 0 0-5-5H5M9 4 4 9l5 5"/>', 3),
  R: SV('<path d="M6 20v-6a5 5 0 0 1 5-5h8M15 4l5 5-5 5"/>', 3),
  REP: SV('<path d="M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5"/>', 3),
};
const UI = {
  back: SV('<path d="M15 5l-7 7 7 7"/>', 3),
  lock: SV('<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  code: SV('<path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/>'),
  reset: SV('<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="#fff"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="#fff"/></svg>',
  music: (on) => SV(`<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>${on ? '' : '<path d="M3 3l18 18"/>'}`, 2.4),
  sound: (off) => SV(`<path d="M4 9h4l5-4v14l-5-4H4z"/>${off ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/>'}`, 2.4),
};
const RATIO = 0.545; // plita ustki yuzasining balandligi / kengligi
const IMGH = 0.725; // plita rasmining balandligi / kengligi
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const STEP_MS = 520, MAX_STEPS = 60;

/** Progressni o'qish: {indeks: yulduz}. Kalit home.js da ham ishlatiladi. */
function loadProgress(user) {
  try { return JSON.parse(localStorage.getItem(`ck_kl_${user?.id ?? 'guest'}`) || '{}') || {}; } catch { return {}; }
}

export function mountKodLab(root) {
  const user = getUser();
  const KEY = `ck_kl_${user?.id ?? 'guest'}`;
  const lang = getLang() === 'ru' ? 1 : 0;
  let best = loadProgress(user);
  const firstOpen = LEVELS.findIndex((_, i) => !best[i]);
  let lv = firstOpen < 0 ? LEVELS.length - 1 : firstOpen;
  let prog = [], cursor = { p: null, i: 0 }, uid = 1, running = false;
  let K = { x: 0, y: 0, d: 0 }, cells = {}, GEO = null;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  const view = html(`
    <section class="kl">
      <div class="kl-wrap">
        <header class="kl-top">
          <a class="kl-rbtn kl-glass" href="#/" aria-label="${t('kl.back')}" title="${t('kl.back')}">${UI.back}</a>
          <div class="kl-brand kl-glass"><img src="${IMG.head}" alt=""><h1>${t('kl.title')}</h1></div>
          <span class="kl-sp"></span>
          <button class="kl-rbtn kl-glass" data-music type="button" aria-label="${t('kl.music')}" title="${t('kl.music')}"></button>
          <button class="kl-rbtn kl-glass" data-mute type="button" aria-label="${t('kl.sound')}" title="${t('kl.sound')}"></button>
          <span class="kl-coins kl-glass" data-coins title="${t('home.coins')}" hidden>${coinSvg(24)}<b></b></span>
          ${langButton('kl-lang kl-glass')}
        </header>
        <nav class="kl-levels" data-levels aria-label="${t('kl.title')}"></nav>
        <div class="kl-main">
          <div class="kl-stage">
            <div class="kl-say" data-saybox><img src="${IMG.say}" alt="Kibi"><div class="kl-saytx"><div class="kl-sayname">Kibi<span data-saylv></span></div><div data-say></div></div></div>
            <div class="kl-board" data-board></div>
          </div>
          <div class="kl-editor kl-glass">
            <div class="kl-edhead"><h2>${UI.code}<span>${t('kl.prog')}</span></h2><span class="kl-cells" data-count title="${t('kl.blocks')}"></span></div>
            <div class="kl-prog" data-prog></div>
            <details class="kl-code"><summary>${t('kl.code')}</summary><pre data-code></pre></details>
          </div>
        </div>
      </div>
      <div class="kl-palette"><div class="kl-dock kl-glass">
        <div class="kl-blocks" data-palette></div>
        <div class="kl-controls">
          <button class="kl-rbtn" data-reset type="button" aria-label="${t('kl.reset')}" title="${t('kl.reset')}">${UI.reset}</button>
          <button class="kl-play" data-run type="button"></button>
        </div>
      </div></div>
      <div class="kl-sheet" data-sheet hidden><div class="kl-card">
        <img data-shimg alt=""><h3 data-shh></h3><div class="kl-stars" data-shstars></div><p data-shp></p><p class="kl-earn" data-shcoin hidden></p>
        <button class="kl-big" data-shbtn type="button"></button>
      </div></div>
    </section>`);
  const $ = (s) => view.querySelector(s);
  const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch { /* yashirin rejim */ } };
  const showCoins = (n) => { const c = $('[data-coins]'); c.querySelector('b').textContent = String(n); c.hidden = false; };
  const toWire = (list) => list.map((b) => (b.type === 'REP' ? { t: 'REP', n: b.n, b: toWire(b.body) } : { t: b.type }));
  /** Serverdagi progress asosiy: kelgach qurilmadagi nusxa almashtiriladi. */
  function applyServer(progress) {
    best = {}; for (const [k, v] of Object.entries(progress || {})) best[k] = v;
    saveLocal();
  }
  view.style.setProperty('--kl-sky', `url("${A('sky.webp')}")`);
  // blok rasmlari (kl.css border-image va fonlarda ishlatadi)
  for (const [k, f] of Object.entries({ bF: 'blk-f', bL: 'blk-l', bR: 'blk-r', bREP: 'blk-rep', bC: 'blk-loop', hF: 'hex-f', hL: 'hex-l', hR: 'hex-r', hREP: 'hex-rep', chip: 'hex-chip' })) {
    view.style.setProperty(`--kl-${k}`, `url("${A(`${f}.webp`)}")`);
  }

  /* ---------- dastur modeli ---------- */
  const countBlocks = (list = prog) => list.reduce((s, b) => s + 1 + (b.body ? countBlocks(b.body) : 0), 0);
  const find = (id, list = prog) => { for (const b of list) { if (b.id === id) return b; if (b.body) { const r = find(id, b.body); if (r) return r; } } return null; };
  const listOf = (p) => (p === null ? prog : find(p).body);
  const removeId = (id, list = prog) => { const i = list.findIndex((b) => b.id === id); if (i >= 0) { list.splice(i, 1); return true; } return list.some((b) => b.body && removeId(id, b.body)); };
  function* exec(list) { for (const b of list) { if (b.type === 'REP') { for (let i = 0; i < b.n; i++) yield* exec(b.body); } else yield b; } }

  /* ---------- yuqori qism ---------- */
  function renderTop() {
    $('[data-music]').innerHTML = UI.music(isMusicOn()); $('[data-music]').classList.toggle('off', !isMusicOn());
    $('[data-mute]').innerHTML = UI.sound(isMuted()); $('[data-mute]').classList.toggle('off', isMuted());
    $('[data-levels]').innerHTML = LEVELS.map((_, i) => {
      const locked = i > 0 && !best[i - 1] && i !== lv;
      return `${i ? '<span class="kl-lvline"></span>' : ''}<button class="kl-lv ${best[i] ? 'done' : ''}" type="button" data-lv="${i}" aria-label="${t('kl.level', { n: i + 1 })}" ${i === lv ? 'aria-current="true"' : ''} ${locked ? 'disabled' : ''}>${best[i] ? `<span class="kl-st">${'★'.repeat(best[i])}</span>` : ''}${locked ? UI.lock : i + 1}</button>`;
    }).join('');
    requestAnimationFrame(() => {
      const cur = $('.kl-lv[aria-current="true"]'), nav = $('[data-levels]');
      if (cur && nav) nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2;
    });
    $('[data-say]').innerHTML = LEVELS[lv].hint[lang]; // matnlar levels.js dan (faqat <b> teglari)
    $('[data-saylv]').textContent = t('kl.level', { n: lv + 1 });
    const sb = $('[data-saybox]');
    if (sb.dataset.lv !== String(lv)) { sb.dataset.lv = lv; sb.classList.remove('in'); void sb.offsetWidth; sb.classList.add('in'); }
    const run = $('[data-run]');
    run.innerHTML = running ? UI.stop : UI.play;
    run.classList.toggle('stop', running);
    run.setAttribute('aria-label', t(running ? 'kl.stop' : 'kl.run')); run.title = t(running ? 'kl.stop' : 'kl.run');
  }

  /* ---------- taxta (izometrik) ---------- */
  const pos = (x, y) => ({ l: GEO.ox + (x - y) * GEO.W / 2, t: GEO.oy + (x + y - GEO.vmin) * GEO.H / 2 });
  function renderBoard() {
    const L = LEVELS[lv], b = $('[data-board]');
    b.innerHTML = ''; cells = {};
    const P = [];
    L.map.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '#') P.push({ x, y, c }); if (c === 'S') K = { x, y, d: L.dir }; }));
    const us = P.map((p) => p.x - p.y), vs = P.map((p) => p.x + p.y);
    const umin = Math.min(...us), umax = Math.max(...us), vmin = Math.min(...vs), vmax = Math.max(...vs);
    const bw = b.clientWidth || 340, span = (umax - umin) / 2 + 1;
    // taxta balandligi: noutbukda sahna bo'yi, telefonda ekranning uchdan biri (sahifa skroll bo'lmaydi)
    const maxH = innerWidth > 780 ? Math.max(200, b.parentElement.clientHeight - $('[data-saybox]').offsetHeight - 12) : Math.max(170, innerHeight * 0.34);
    const W = Math.min(150, (bw / span) * 0.96, maxH / ((vmax - vmin) * RATIO / 2 + IMGH + 0.95)), H = W * RATIO, head = W * 0.95;
    GEO = { W, H, vmin, ox: (bw - span * W) / 2 - umin * W / 2, oy: head };
    b.style.height = `${(vmax - vmin) * H / 2 + W * IMGH + head + 6}px`;
    P.sort((a, c) => (a.x + a.y) - (c.x + c.y)).forEach((p) => {
      const im = document.createElement('img'), q = pos(p.x, p.y);
      im.className = `kl-t${p.c === 'G' ? ' goal' : ''}`; im.alt = ''; im.draggable = false;
      im.src = p.c === 'G' ? IMG.goal : p.c === 'S' ? IMG.start : IMG.path;
      Object.assign(im.style, { left: `${q.l}px`, top: `${q.t}px`, width: `${W}px`, zIndex: (p.x + p.y) * 2 });
      b.appendChild(im); cells[`${p.x},${p.y}`] = im;
    });
    const k = document.createElement('div');
    k.className = 'kl-kibi'; k.dataset.kibi = '';
    k.innerHTML = '<div class="kl-shadow"></div><div class="kl-spr"><img alt="Kibi" draggable="false"></div>';
    b.appendChild(k); placeKibi(true);
  }
  function placeKibi(instant, fx, fy) {
    const k = $('[data-kibi]'); if (!k) return;
    const W = GEO.W, kw = W * 0.5, kh = W * 1.02, q = pos(fx ?? K.x, fy ?? K.y);
    if (instant) k.style.transition = 'none';
    Object.assign(k.style, { width: `${kw}px`, height: `${kh}px`, left: `${q.l + W / 2 - kw / 2}px`, top: `${q.t + GEO.H * 0.6 - kh * 0.97}px` });
    // 4 yo'nalish: orqa/old rasm + ko'zgu. Tepaga = orqa ko'zgu, chapga = orqa, pastga = old, o'ngga = old ko'zgu
    const im = k.querySelector('img');
    im.src = K.d === 0 || K.d === 3 ? IMG.back : IMG.front;
    im.classList.toggle('flip', K.d === 0 || K.d === 1);
    if (instant) { void k.offsetWidth; k.style.transition = ''; }
  }
  function anim(cls, ms) {
    const k = $('[data-kibi]'); if (!k) return;
    k.classList.remove(cls); void k.offsetWidth; k.classList.add(cls);
    later(() => k.classList.remove(cls), ms);
  }

  /* ---------- dastur paneli ---------- */
  const del = (id) => `<button class="kl-x" type="button" data-del="${id}" aria-label="${t('kl.del')}">×</button>`;
  function blkHTML(b) {
    if (b.type === 'REP') {
      return `<div class="kl-loop"><div class="kl-head"><span class="kl-blk REP" data-id="${b.id}"><span class="kl-ic">${ICON.REP}</span>${t('kl.REP')}
        <span class="kl-stepper"><button type="button" data-dec="${b.id}" aria-label="−">−</button><span>${b.n}</span><button type="button" data-inc="${b.id}" aria-label="+">+</button></span>${t('kl.times')}</span>${del(b.id)}</div>
        <div class="kl-body">${listHTML(b.body, b.id)}</div></div>`;
    }
    return `<div class="kl-row"><span class="kl-blk ${b.type}" data-id="${b.id}"><span class="kl-ic">${ICON[b.type]}</span>${t(`kl.${b.type}`)}</span>${del(b.id)}</div>`;
  }
  function slot(p, i, inside, end) {
    const on = cursor.p === p && cursor.i === i;
    const txt = on ? (inside && i === 0 ? t('kl.inside') : t('kl.addHere')) : end ? (p === null ? t('kl.addEnd') : t('kl.inside')) : '';
    return `<button class="kl-slot ${on ? 'on' : end ? 'end' : ''}" type="button" data-p="${p ?? ''}" data-i="${i}">${txt}</button>`;
  }
  function listHTML(list, p) {
    let h = '';
    list.forEach((b, i) => { h += slot(p, i, p !== null) + blkHTML(b); });
    return h + slot(p, list.length, p !== null && !list.length, list.length > 0 || p !== null);
  }
  const FN = [{ F: 'oldinga();', L: 'chapga();', R: 'ongga();' }, { F: 'vperyod();', L: 'nalevo();', R: 'napravo();' }][lang];
  function toCode(list, ind) {
    const v = 'ijk'[ind.length / 2] || 'n';
    return list.map((b) => (b.type === 'REP' ? `${ind}for (let ${v} = 0; ${v} < ${b.n}; ${v}++) {\n${toCode(b.body, `${ind}  `)}\n${ind}}` : ind + FN[b.type])).join('\n');
  }
  function renderProg() {
    const L = LEVELS[lv], n = countBlocks();
    $('[data-prog]').innerHTML = (prog.length ? '' : `<div class="kl-empty">${t('kl.empty')}</div>`) + listHTML(prog, null);
    $('[data-count]').innerHTML = `<span class="kl-bat ${n >= L.max ? 'full' : ''}" aria-hidden="true">${Array.from({ length: L.max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span>${n}/${L.max}</span>`;
    $('[data-palette]').innerHTML = L.blocks.map((k) => `<button class="kl-blk ${k}" type="button" data-add="${k}" ${n >= L.max || running ? 'disabled' : ''}><span class="kl-ic">${ICON[k]}</span>${t(`kl.${k}`)}</button>`).join('');
    $('[data-code]').textContent = toCode(prog, '') || '// …';
    if (!running) reveal($('.kl-slot.on'));
  }
  /** Dastur ro'yxati ichida elementni ko'rinadigan joyga suradi (sahifaning o'zi skroll bo'lmaydi). */
  function reveal(el) {
    const box = $('[data-prog]'); if (!el) return;
    const a = el.getBoundingClientRect(), c = box.getBoundingClientRect();
    if (a.top < c.top + 8) box.scrollTop -= c.top + 8 - a.top;
    else if (a.bottom > c.bottom - 8) box.scrollTop += a.bottom - c.bottom + 8;
  }

  /* ---------- ishga tushirish ---------- */
  function stop() {
    running = false; clearTimers();
    view.querySelectorAll('.kl-blk.active').forEach((b) => b.classList.remove('active'));
    renderTop(); renderProg();
  }
  function resetPos() { stop(); renderBoard(); }
  function loadLevel() { stop(); prog = []; cursor = { p: null, i: 0 }; renderTop(); renderBoard(); renderProg(); }
  function run() {
    renderBoard();
    const L = LEVELS[lv];
    running = true; renderTop(); renderProg(); sfx.start();
    const it = exec(prog); let steps = 0;
    const at = (x, y) => (L.map[y] || '')[x] || '#';
    const tick = () => {
      view.querySelectorAll('.kl-blk.active').forEach((b) => b.classList.remove('active'));
      const n = it.next();
      if (n.done) return finish('short');
      if (++steps > MAX_STEPS) return finish('loop');
      const b = n.value;
      const cur = view.querySelector(`[data-prog] [data-id="${b.id}"]`);
      cur?.classList.add('active'); reveal(cur);
      if (b.type === 'L' || b.type === 'R') {
        K.d = (K.d + (b.type === 'L' ? 3 : 1)) % 4; anim('turn', 300); later(() => placeKibi(), 120); sfx.turn();
      } else {
        const dx = DX[K.d], dy = DY[K.d];
        if (at(K.x + dx, K.y + dy) === '#') {
          placeKibi(false, K.x + dx * 0.3, K.y + dy * 0.3); sfx.bump();
          later(() => { placeKibi(); anim('bump', 450); later(() => finish('wall'), 650); }, 230);
          return;
        }
        K.x += dx; K.y += dy; placeKibi(); anim('walk', 380); sfx.step();
        cells[`${K.x},${K.y}`]?.classList.add('trail');
        if (at(K.x, K.y) === 'G') { later(() => { anim('win', 1400); sfx.win(); later(() => finish('win'), 1300); }, 400); return; }
      }
      later(tick, window.KL_FAST || STEP_MS);
    };
    later(tick, 350);
  }
  function finish(kind) {
    running = false; renderTop(); renderProg();
    const L = LEVELS[lv], n = countBlocks(), s = $('[data-sheet]'), btn = $('[data-shbtn]');
    s.className = `kl-sheet ${kind === 'win' ? 'good' : 'bad'}`; s.hidden = false; delete btn.dataset.next;
    if (kind === 'win') {
      const st = n <= L.opt ? 3 : n <= L.opt + 2 ? 2 : 1;
      best[lv] = Math.max(best[lv] || 0, st);
      saveLocal(); sendSolve(lv);
      $('[data-shimg]').src = IMG.win; $('[data-shh]').textContent = t('kl.winH');
      $('[data-shp]').textContent = n <= L.opt ? t('kl.winBest', { n }) : t('kl.winMore', { n, o: L.opt });
      const stars = $('[data-shstars]');
      stars.hidden = false; stars.innerHTML = [1, 2, 3].map((i) => `<span class="${i <= st ? 'on' : ''}">★</span>`).join('');
      for (let i = 0; i < st; i++) later(() => sfx.star(i), 250 + i * 220);
      if (lv < LEVELS.length - 1) { btn.textContent = `${t('kl.next')} →`; btn.dataset.next = String(lv + 1); } else btn.textContent = t('kl.last');
      renderTop();
    } else {
      $('[data-shcoin]').hidden = true;
      $('[data-shimg]').src = IMG.oops; sfx.fail(); $('[data-shstars]').hidden = true;
      $('[data-shh]').textContent = t(`kl.${kind}H`); $('[data-shp]').textContent = t(`kl.${kind}P`);
      btn.textContent = t('kl.again');
    }
    btn.focus({ preventScroll: true });
  }

  /** G'alabani serverga yuboradi; coin natija oynasida ko'rinadi. Tarmoq xatosida faqat qurilmada qoladi. */
  function sendSolve(level) {
    const el = $('[data-shcoin]'); el.hidden = true;
    api.post('/kodlab/solve', { level, program: toWire(prog) }).then((r) => {
      if (r.progress) { applyServer(r.progress); renderTop(); }
      if (typeof r.coins_total === 'number') showCoins(r.coins_total);
      if (r.coins_earned > 0 && level === lv && !$('[data-sheet]').hidden) {
        el.innerHTML = `${coinSvg(28)}<b>+${r.coins_earned}</b> ${t('kl.coin')}`; el.hidden = false;
      }
    }).catch(() => {});
  }

  /* ---------- hodisalar ---------- */
  view.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el || !view.contains(el)) return;
    const d = el.dataset;
    if ('music' in d) { toggleMusic(); renderTop(); return; }
    if ('mute' in d) { toggleMute(); renderTop(); sfx.add(); return; }
    if (d.lv) { lv = +d.lv; sfx.tick(); loadLevel(); return; }
    if ('shbtn' in d) { $('[data-sheet]').hidden = true; if (d.next) { lv = +d.next; loadLevel(); } else resetPos(); return; }
    if ('run' in d) { if (running) stop(); else run(); return; }
    if (running) return;
    if (d.add) {
      if (countBlocks() >= LEVELS[lv].max) return;
      const b = { id: uid++, type: d.add };
      if (b.type === 'REP') { b.n = 3; b.body = []; }
      listOf(cursor.p).splice(cursor.i, 0, b); sfx.add();
      cursor = b.type === 'REP' ? { p: b.id, i: 0 } : { p: cursor.p, i: cursor.i + 1 };
      resetPos(); return;
    }
    if (d.del) {
      removeId(+d.del); sfx.del();
      if (cursor.p !== null && !find(cursor.p)) cursor = { p: null, i: prog.length };
      else cursor.i = Math.min(cursor.i, listOf(cursor.p).length);
      resetPos(); return;
    }
    if (d.inc || d.dec) { const b = find(+(d.inc || d.dec)); b.n = Math.max(2, Math.min(10, b.n + (d.inc ? 1 : -1))); sfx.tick(); renderProg(); return; }
    if (el.classList.contains('kl-slot')) { cursor = { p: d.p === '' ? null : +d.p, i: +d.i }; renderProg(); return; }
    if ('reset' in d) resetPos();
  });
  $('[data-sheet]').addEventListener('click', (e) => { if (e.target === e.currentTarget) { e.currentTarget.hidden = true; resetPos(); } });

  const onResize = () => { if (!running) renderBoard(); };
  // darajalar yo'lagi: sichqoncha g'ildiragi gorizontal suradi (skroll chizig'i yashirilgan)
  $('[data-levels]').addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  const onPointer = () => { if (isMusicOn()) musicStart(); };
  const onVis = () => { if (document.hidden) musicStop(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('pointerdown', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  root.replaceChildren(view);
  loadLevel();
  let alive = true;
  api.get('/kodlab').then((r) => {
    if (!alive) return;
    applyServer(r.progress); showCoins(r.coins);
    if (!running && !countBlocks() && $('[data-sheet]').hidden) {
      const f = LEVELS.findIndex((_, i) => !best[i]); lv = f < 0 ? LEVELS.length - 1 : f; loadLevel();
    } else renderTop();
  }).catch(() => {});

  return () => {
    alive = false; clearTimers(); musicStop();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('visibilitychange', onVis);
  };
}

