/**
 * @file IT darslari: mini-o'yin mashqlari (typing va labirint).
 * Har biri lesson.js dagi boshqa mashqlar bilan bir xil shaklda: { markup, mount(el, ready), evaluate(), lock() }.
 * evaluate() Promise qaytarishi mumkin (labirintda qahramon yurib bo'lguncha kutiladi).
 */
import { BASE_URL } from '../../core/config.js';
import { esc } from '../../utils/dom.js';
import { ic } from './common.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Labirint xaritasi (backend/src/utils/maze.js bilan bir xil qoidalar) ----------
const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/** @param {string[]} grid @returns {{errors:string[], shortest:number|null, start:[number,number]|null, goal:[number,number]|null}} */
export function analyzeMaze(grid) {
  const errors = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (rows < 3 || rows > 10 || cols < 3 || cols > 10) errors.push("xarita 3×3 dan 10×10 gacha bo'lishi kerak");
  if (grid.some((r) => r.length !== cols || !/^[#.SG]+$/.test(r))) return { errors: [...errors, "qatorlar bir xil uzunlikda bo'lishi kerak"], shortest: null, start: null, goal: null };
  const find = (ch) => grid.flatMap((r, y) => [...r].map((c, x) => (c === ch ? [y, x] : null)).filter(Boolean));
  const s = find('S');
  const g = find('G');
  if (s.length !== 1) errors.push(s.length ? 'faqat bitta qahramon bo\'lishi kerak' : "qahramon (boshlanish joyi) yo'q");
  if (g.length !== 1) errors.push(g.length ? 'faqat bitta qasr bo\'lishi kerak' : "qasr (maqsad) yo'q");
  if (errors.length) return { errors, shortest: null, start: s[0] || null, goal: g[0] || null };
  const dist = grid.map((r) => Array(r.length).fill(-1));
  dist[s[0][0]][s[0][1]] = 0;
  const q = [s[0]];
  while (q.length) {
    const [y, x] = q.shift();
    for (const [dy, dx] of Object.values(DIRS)) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny < 0 || nx < 0 || ny >= rows || nx >= cols || grid[ny][nx] === '#' || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1;
      q.push([ny, nx]);
    }
  }
  const shortest = dist[g[0][0]][g[0][1]];
  if (shortest < 0) errors.push("qahramondan qasrgacha yo'l yo'q");
  return { errors, shortest: shortest < 0 ? null : shortest, start: s[0], goal: g[0] };
}

const HERO = `${BASE_URL}heroes/hero-01.webp`;
const CASTLE = `${BASE_URL}lab/castle-top.webp`;

/** Labirint taxtasi (o'quvchi darsida ham, muharrir ko'rinishida ham). */
function boardMarkup(grid) {
  const cols = grid[0].length;
  return `<div class="ls-maze" style="--cols:${cols};--rows:${grid.length};--wall:url('${BASE_URL}lab/tex-leaves.webp');--path:url('${BASE_URL}lab/tex-stone.webp')" tabindex="0" role="application"
      aria-label="Labirint: qahramonni qasrga olib bor">
    ${grid.map((r) => [...r].map((c) => `<span class="ls-cell ${c === '#' ? 'is-wall' : 'is-path'}">${c === 'G' ? `<img src="${CASTLE}" alt="" draggable="false">` : ''}</span>`).join('')).join('')}
    <span class="ls-hero"><img src="${HERO}" alt="" draggable="false"></span>
  </div>`;
}

/**
 * Labirint mashqi.
 * program: bola strelkalardan buyruqlar tuzadi va "Tekshirish" bosilganda qahramon shu bo'yicha yuradi;
 * direct: strelka tugmalari (yoki klaviatura) bilan qahramonni o'zi yurgizadi.
 */
export function mazeUi(ex) {
  // Muharrirdagi chala qoralama ham ko'rinishda ochilsin
  const grid = ex.grid?.length && ex.grid[0]?.length ? ex.grid : ['S.G'];
  const info = analyzeMaze(grid);
  const program = ex.mode !== 'direct';
  const limit = program && ex.max_commands ? ex.max_commands : 40;
  let pos = info.start ? [...info.start] : [0, 0];
  const cmds = [];
  let el;
  let ready;
  let locked = false;
  let busy = false;
  let moves = 0;

  const at = (y, x) => grid[y]?.[x];
  const place = (anim = true) => {
    const h = el.querySelector('.ls-hero');
    h.style.transition = anim && !reduced() ? '' : 'none';
    h.style.transform = `translate(${pos[1] * 100}%, ${pos[0] * 100}%)`;
  };
  const say = (msg, cls = '') => {
    const m = el.querySelector('.ls-maze-msg');
    m.textContent = msg;
    m.className = `ls-maze-msg ${cls}`;
  };
  const bump = async () => {
    const b = el.querySelector('.ls-maze');
    b.classList.remove('is-bump');
    void b.offsetWidth;
    b.classList.add('is-bump');
    await wait(reduced() ? 0 : 360);
  };
  /** Bir qadam: devor yoki chet bo'lsa false. */
  const step = (dir) => {
    const [dy, dx] = DIRS[dir];
    const ny = pos[0] + dy;
    const nx = pos[1] + dx;
    const c = at(ny, nx);
    if (!c || c === '#') return false;
    pos = [ny, nx];
    place();
    return true;
  };
  const atGoal = () => info.goal && pos[0] === info.goal[0] && pos[1] === info.goal[1];

  const drawProgram = () => {
    const list = el.querySelector('.ls-prog');
    list.innerHTML = cmds.length
      ? cmds.map((d, k) => `<li><button type="button" class="ls-cmd" data-k="${k}" aria-label="${k + 1}-buyruq: ${d === 'up' ? 'yuqoriga' : d === 'down' ? 'pastga' : d === 'left' ? 'chapga' : "o'ngga"}. O'chirish uchun bosing">${ARROW[d]}</button></li>`).join('')
      : '<li class="ls-prog-empty">Buyruqlarni pastdan qo\'sh</li>';
    list.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { if (locked || busy) return; cmds.splice(Number(b.dataset.k), 1); drawProgram(); }; });
    el.querySelector('.ls-prog-n').textContent = `${cmds.length} / ${limit}`;
    el.querySelectorAll('[data-dir]').forEach((b) => { b.disabled = locked || cmds.length >= limit; });
    ready(cmds.length > 0);
  };

  const pad = (label) => `<div class="ls-pad" role="group" aria-label="${label}">
    ${['up', 'left', 'down', 'right'].map((d) => `<button type="button" class="ls-arrow is-${d}" data-dir="${d}" aria-label="${d === 'up' ? 'Yuqoriga' : d === 'down' ? 'Pastga' : d === 'left' ? 'Chapga' : "O'ngga"}">${ARROW[d]}</button>`).join('')}
  </div>`;

  return {
    markup: `<div class="ls-mz">
        ${boardMarkup(grid)}
        <p class="ls-maze-msg" role="status" aria-live="polite"></p>
        ${program ? `
          <div class="ls-prog-h"><b>Dastur</b><span class="ls-prog-n"></span></div>
          <ol class="ls-prog" aria-label="Sening buyruqlaring"></ol>
          <div class="ls-mz-ctl">${pad("Buyruq qo'shish")}
            <button type="button" class="ls-mini" data-clear>${ic('undo', 16)}Tozalash</button></div>`
          : `<div class="ls-mz-ctl">${pad('Qahramonni yurgizish')}<span class="ls-moves" aria-live="polite"></span></div>`}
      </div>`,
    mount(root, r) {
      el = root;
      ready = r;
      place(false);
      if (program) {
        say(ex.max_commands ? `Ko'pi bilan ${ex.max_commands} ta buyruq bilan qasrga olib bor.` : 'Buyruqlarni tuz, keyin «Tekshirish» bos.');
        el.querySelectorAll('[data-dir]').forEach((b) => {
          b.onclick = () => { if (locked || busy || cmds.length >= limit) return; cmds.push(b.dataset.dir); drawProgram(); };
        });
        el.querySelector('[data-clear]').onclick = () => { if (locked || busy) return; cmds.length = 0; drawProgram(); };
        drawProgram();
      } else {
        say('Strelkalar bilan qahramonni qasrga olib bor.');
        const go = async (dir) => {
          if (locked || busy || atGoal()) return;
          if (!step(dir)) { busy = true; await bump(); busy = false; return; }
          moves += 1;
          el.querySelector('.ls-moves').textContent = `${moves} qadam`;
          if (atGoal()) { say('Qasrga yetding! Endi «Tekshirish» bos.', 'is-ok'); ready(true); }
        };
        el.querySelectorAll('[data-dir]').forEach((b) => { b.onclick = () => go(b.dataset.dir); });
        const board = el.querySelector('.ls-maze');
        board.addEventListener('keydown', (e) => {
          const d = KEYS[e.key];
          if (!d) return;
          e.preventDefault();
          go(d);
        });
        ready(false);
      }
    },
    async evaluate() {
      if (!program) return atGoal();
      busy = true;
      pos = [...info.start];
      place(false);
      for (const d of cmds) {
        await wait(reduced() ? 0 : 320);
        if (!step(d)) {
          await bump();
          say('Qahramon devorga urildi. Buyruqlarni tekshir.', 'is-bad');
          busy = false;
          return false;
        }
        if (atGoal()) break;
      }
      await wait(reduced() ? 0 : 300);
      busy = false;
      if (atGoal()) { say(`Qasrga yetding! ${cmds.length} ta buyruq.`, 'is-ok'); return true; }
      say('Qahramon qasrga yetmadi.', 'is-bad');
      return false;
    },
    lock() {
      locked = true;
      el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    },
  };
}

// ---------- Typing ----------
/** Berilgan matnni yozish; aniqlik chegarasidan o'tsa to'g'ri. */
export function typingUi(ex) {
  const target = ex.text || '';
  if (!target) {
    return {
      markup: '<p class="ls-hint">Yoziladigan matn hali kiritilmagan.</p>',
      mount(root, r) { r(false); },
      evaluate: () => false,
      lock() {},
    };
  }
  const same = (a, b) => (ex.case_sensitive ? a === b : a.toLowerCase() === b.toLowerCase());
  let el;
  let input;
  let ready;
  const score = () => {
    const v = input.value;
    let right = 0;
    for (let k = 0; k < target.length; k++) if (v[k] != null && same(v[k], target[k])) right += 1;
    return Math.round((right / target.length) * 100);
  };
  const draw = () => {
    const v = input.value;
    el.querySelectorAll('.ls-ch').forEach((s, k) => {
      s.className = `ls-ch${v[k] == null ? (k === v.length ? ' is-cur' : '') : same(v[k], target[k]) ? ' is-ok' : ' is-bad'}`;
    });
    el.querySelector('.ls-acc b').textContent = v.length ? `${score()}%` : '—';
    ready(v.length >= target.length);
  };
  return {
    markup: `<div class="ls-type">
        <p class="sr">Yoziladigan matn: ${esc(target)}</p>
        <p class="ls-type-target" aria-hidden="true">${target.split(/( )/).map((w) => (w === ' '
          ? '<span class="ls-ch ls-sp"> </span>'
          : `<span class="ls-w">${[...w].map((ch) => `<span class="ls-ch">${esc(ch)}</span>`).join('')}</span>`)).join('')}</p>
        <textarea class="ls-type-in" rows="2" maxlength="${target.length}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
          aria-label="Matnni shu yerga yoz" placeholder="Shu yerga yoz..."></textarea>
        <div class="ls-type-stat"><span class="ls-acc">Aniqlik: <b>—</b></span><span>Kerak: ${ex.min_accuracy}%${ex.case_sensitive ? ' · katta-kichik harf muhim' : ''}</span></div>
      </div>`,
    mount(root, r) {
      el = root;
      ready = r;
      input = el.querySelector('.ls-type-in');
      input.addEventListener('input', () => {
        if (input.value.includes('\n')) input.value = input.value.replace(/\n/g, '');
        draw();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (input.value.length >= target.length) root.closest('.ls')?.querySelector('.ls-btns .btn:not([disabled])')?.click();
      });
      draw();
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    },
    evaluate() {
      const acc = score();
      el.querySelector('.ls-acc').innerHTML = `Aniqlik: <b>${acc}%</b>`;
      return acc >= ex.min_accuracy;
    },
    lock() { input.readOnly = true; },
  };
}
