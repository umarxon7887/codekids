// Mock backend: sof o'yin mantig'i (socket'siz, test qilish oson). Shartnoma: backend javobi + bizning takliflar (⚠️ bilan).
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export function makeMaze(size, seed) { // size TOQ bo'lishi kerak; start (1,1), exit (size-2,size-2)
  const r = rng(seed), g = Array.from({ length: size }, () => Array(size).fill('1')), st = [[1, 1]]; g[1][1] = '0';
  while (st.length) {
    const [x, y] = st.at(-1);
    const n = DIRS.map(([dx, dy]) => [x + dx * 2, y + dy * 2, dx, dy]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && g[ny][nx] === '1');
    if (!n.length) { st.pop(); continue; }
    const [nx, ny, dx, dy] = n[Math.floor(r() * n.length)]; g[y + dy][x + dx] = '0'; g[ny][nx] = '0'; st.push([nx, ny]);
  }
  const start = { x: 1, y: 1 }, exit = { x: size - 2, y: size - 2 }, odd = [];
  for (let y = 1; y < size; y += 2) for (let x = 1; x < size; x += 2) if (!(x === 1 && y === 1) && !(x === exit.x && y === exit.y)) odd.push({ x, y });
  for (let i = odd.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [odd[i], odd[j]] = [odd[j], odd[i]]; }
  return { size, grid: g.map((row) => row.join('')), start, exit, checkpoints: odd.slice(0, Math.min(12, Math.round(odd.length / 3))) };
}

export const QUESTIONS = [
  { text: 'Dasturda amalni qayta-qayta bajarish uchun nima ishlatiladi?', options: ['Sikl (loop)', 'O\'zgaruvchi', 'Izoh'], answer: 0 },
  { text: 'Shart bo\'yicha tanlov qaysi so\'z bilan yoziladi?', options: ['for', 'if', 'print'], answer: 1 },
  { text: '3 + 4 * 2 nechaga teng?', options: ['14', '11', '10'], answer: 1 },
  { text: 'O\'zgaruvchi nima uchun kerak?', options: ['Ma\'lumotni saqlash', 'Rasm chizish', 'Kompyuterni o\'chirish'], answer: 0 },
  { text: 'Algoritm bu...', options: ['Qadamlar ketma-ketligi', 'Dastur nomi', 'Klaviatura turi'], answer: 0 },
  { text: 'Xatoni topish va tuzatish jarayoni nima deyiladi?', options: ['Kompilyatsiya', 'Debugging', 'Dizayn'], answer: 1 },
  { text: 'Qaysi biri sikl emas?', options: ['while', 'for', 'else'], answer: 2 },
  { text: 'True va False qanday tur?', options: ['Matn', 'Mantiqiy (boolean)', 'Kasr son'], answer: 1 },
];
const DIRNAME = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const dirOf = (a, b) => (b.y < a.y ? 'up' : b.y > a.y ? 'down' : b.x < a.x ? 'left' : 'right');
const err = (code, message) => ({ ok: false, error: { code, message } });
const shuffled = (n, r) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class LabyrinthRoom {
  constructor({ code = '1234', size = 11, seed = 42, durationMs = 600000, cooldownMs = 200, lockMs = 5000, lives = 3, mode = 'standard' } = {}) {
    Object.assign(this, { code, durationMs, cooldownMs, lockMs, maxLives: lives });
    this.mode = mode === 'kids' ? 'kids' : 'standard'; // noma'lum qiymat -> 'standard' (hozirgi xulq saqlanadi)
    this.maze = makeMaze(size, seed); this.players = new Map(); this.status = 'waiting'; this.endsAt = null; this.finishCount = 0; this.rnd = rng(seed + 1);
  }
  join(deviceId, nickname) {
    let p = this.players.get(deviceId);
    if (!p) { // ⚠️ id = xona ichidagi ID (account UUID emas)
      p = { id: `p${this.players.size + 1}`, nickname: nickname ?? `O'quvchi ${this.players.size + 1}`, x: 1, y: 1, lives: this.mode === 'kids' ? null : this.maxLives, score: 0, finished: false, eliminated: false, rank: null,
            pending: null, asked: 0, cleared: [], lastAt: 0, lockedUntil: 0 };
      this.players.set(deviceId, p);
    }
    return p;
  }
  start(now) { if (this.status !== 'waiting') return; this.status = 'active'; this.endsAt = now + this.durationMs; }
  finishRoom() { this.status = 'finished'; }
  pub(p) { return { id: p.id, nickname: p.nickname, x: p.x, y: p.y, lives: p.lives, score: p.score, finished: p.finished, eliminated: p.eliminated, rank: p.rank }; }
  playersPublic() { return [...this.players.values()].map((p) => this.pub(p)).sort((a, b) => b.score - a.score); }
  update(now) { return { status: this.status, endsAt: this.endsAt, serverNow: now, players: this.playersPublic() }; } // ⚠️ endsAt/serverNow/id/rank — taklif
  questionView(p) { return p.pending && { index: p.pending.qi, text: QUESTIONS[p.pending.qi].text, options: p.pending.order.map((i) => QUESTIONS[p.pending.qi].options[i]) }; }
  init(p, now) {
    const { size, grid, start, exit, checkpoints } = this.maze;
    return { grid, size, start, exit, checkpoints, status: this.status, mode: this.mode, endsAt: this.endsAt, serverNow: now,
      you: p && { ...this.pub(p), question: this.questionView(p), cleared: p.cleared, lockedUntil: p.lockedUntil || null }, players: this.playersPublic() };
  }
  #isCheckpoint(x, y) { return this.maze.checkpoints.some((c) => c.x === x && c.y === y); }

  move(p, direction, now) { // shartnoma: { direction: up|down|left|right } — server maqsad katakni o'zi hisoblaydi
    if (this.status === 'finished') return err('ROOM_FINISHED', 'O\'yin tugagan');
    if (this.status !== 'active') return err('ROOM_NOT_ACTIVE', 'O\'yin hali boshlanmagan');
    const dv = DIRNAME[direction]; if (!dv) return err('VALIDATION_ERROR', 'direction: up|down|left|right');
    if (p.finished) return err('PLAYER_FINISHED', 'Siz tugatgansiz');
    if (p.pending) return err('QUESTION_PENDING', 'Avval savolga javob bering');
    if (now < p.lockedUntil) return err('LOCKED', 'Biroz kuting');
    if (now - p.lastAt < this.cooldownMs) return err('TOO_FAST', 'Juda tez');
    const x = p.x + dv[0], y = p.y + dv[1];
    if (this.maze.grid[y]?.[x] !== '0') return err('BLOCKED', 'Bu yo\'nalishda devor bor');
    p.lastAt = now; p.x = x; p.y = y;
    if (x === this.maze.exit.x && y === this.maze.exit.y) { // ⚠️ o'rin bo'yicha bonus
      p.finished = true; p.rank = ++this.finishCount; p.score += [50, 30, 20][p.rank - 1] ?? 10;
      return { ok: true, x, y, finished: true, question: null };
    }
    if (this.#isCheckpoint(x, y) && !p.cleared.some((c) => c.x === x && c.y === y)) { // ⚠️ har o'yinchiga o'z savol tartibi va aralashtirilgan variantlar
      const qi = (hash(p.id) + p.asked++) % QUESTIONS.length;
      p.pending = { qi, order: shuffled(QUESTIONS[qi].options.length, this.rnd) };
    }
    return { ok: true, x, y, finished: false, question: this.questionView(p) };
  }

  answer(p, choice, now) {
    if (this.status !== 'active') return err('ROOM_NOT_ACTIVE', 'O\'yin faol emas');
    if (!p.pending) return err('NO_PENDING_QUESTION', 'Savol yo\'q');
    const { qi, order } = p.pending;
    if (!Number.isInteger(choice) || choice < 0 || choice >= order.length) return err('INVALID_CHOICE', 'Noto\'g\'ri variant');
    const q = QUESTIONS[qi], correct = order[choice] === q.answer, correctIndex = order.indexOf(q.answer);
    p.pending = null;
    if (correct) { p.score += 10; p.cleared.push({ x: p.x, y: p.y }); }
    else { // ⚠️ jon -1, 5 soniya to'xtash, oxirgi tozalangan checkpoint'ga qaytarish
      p.lockedUntil = now + this.lockMs;
      const back = p.cleared.at(-1) ?? this.maze.start; p.x = back.x; p.y = back.y;
      if (p.lives !== null && --p.lives <= 0) { p.eliminated = true; p.finished = true; } // kids: jon yo'q, hech kim chiqib ketmaydi
    }
    return { ok: true, correct, correctIndex, lives: p.lives, score: p.score, finished: p.finished, eliminated: p.eliminated, x: p.x, y: p.y, lockedUntil: p.lockedUntil || null };
  }
}

export function bfsPath(grid, from, to) { // testlar va botlar uchun
  const key = (x, y) => `${x},${y}`, prev = new Map([[key(from.x, from.y), null]]), q = [[from.x, from.y]];
  while (q.length) { const [x, y] = q.shift(); if (x === to.x && y === to.y) break;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (grid[ny]?.[nx] === '0' && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); } } }
  const path = []; let c = [to.x, to.y]; while (c && prev.has(key(...c))) { path.unshift({ x: c[0], y: c[1] }); c = prev.get(key(...c)); } return path.slice(1);
}
