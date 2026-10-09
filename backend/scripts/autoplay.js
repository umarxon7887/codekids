import { io } from 'socket.io-client';

const [, , token, code] = process.argv;
const name = process.env.NAME || token.slice(-6);
const KNOWN = { '2+2 nechta?': '4', 'Suvning formulasi?': 'H2O', 'Haftada necha kun bor?': '7' };
const MOVES = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (x, y) => `${x},${y}`;

const socket = io(process.env.WS_URL || 'http://localhost:3000', { auth: { token } });
const emit = (ev, data) => new Promise((resolve) => socket.emit(ev, data, resolve));

let init = null;
socket.on('labyrinth:init', (d) => { init = d; });
socket.on('labyrinth:finished', (d) => console.log(`[${name}] FINISHED EVENT`, JSON.stringify(d)));
socket.on('connect_error', (e) => { console.log(`[${name}] connect_error`, e.message); process.exit(1); });

function bfs(grid, size, from, to, avoid) {
  const prev = new Map([[key(from.x, from.y), null]]);
  const q = [{ x: from.x, y: from.y }];
  while (q.length) {
    const cur = q.shift();
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of Object.values(MOVES)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const kk = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (grid[ny][nx] !== '0' || prev.has(kk)) continue;
      if (avoid.has(kk) && !(nx === to.x && ny === to.y)) continue;
      prev.set(kk, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  const target = key(to.x, to.y);
  if (!prev.has(target)) return null;
  const steps = [];
  let cur = target;
  while (prev.get(cur)) {
    const [px, py] = prev.get(cur).split(',').map(Number);
    const [cx, cy] = cur.split(',').map(Number);
    const dx = cx - px;
    const dy = cy - py;
    steps.unshift(Object.keys(MOVES).find((n) => MOVES[n][0] === dx && MOVES[n][1] === dy));
    cur = prev.get(cur);
  }
  return steps;
}

socket.on('connect', async () => {
  const j = await emit('labyrinth:join', { code });
  if (!j.ok) {
    console.log(`[${name}] join xato`, JSON.stringify(j.error));
    process.exit(1);
  }

  const { grid, size, exit } = init;
  const pos = { x: init.you.x, y: init.you.y };
  const cleared = new Set(init.you.cleared.map((c) => key(c.x, c.y)));
  const cps = new Set(init.checkpoints.map((c) => key(c.x, c.y)));

  const answer = async (q) => {
    const want = KNOWN[q.text];
    let choice = q.options.indexOf(want);
    if (choice < 0) choice = 0;
    const ack = await emit('labyrinth:answer', { code, choice });
    if (!ack.ok) {
      console.log(`[${name}] javob xato`, JSON.stringify(ack.error));
      return null;
    }
    pos.x = ack.x;
    pos.y = ack.y;
    if (ack.correct) cleared.add(key(ack.x, ack.y));
    console.log(`[${name}] "${q.text}" -> ${ack.correct ? "TO'G'RI" : "NOTO'G'RI"} lives=${ack.lives} score=${ack.score}`);
    if (!ack.correct && !ack.eliminated) await sleep(5300);
    return ack;
  };

  const run = async () => {
    if (init.you.question) {
      const r = await answer(init.you.question);
      if (!r || r.eliminated) return;
    }
    while (true) {
      const avoid = new Set([...cps].filter((c) => !cleared.has(c)));
      const steps = bfs(grid, size, pos, exit, avoid) ?? bfs(grid, size, pos, exit, new Set());
      if (!steps || steps.length === 0) return;

      await sleep(250);
      const ack = await emit('labyrinth:move', { code, direction: steps[0] });
      if (!ack.ok) {
        if (ack.error.code === 'LOCKED') { await sleep(5300); continue; }
        if (ack.error.code === 'TOO_FAST') { await sleep(300); continue; }
        console.log(`[${name}] move xato`, JSON.stringify(ack.error));
        return;
      }
      pos.x = ack.x;
      pos.y = ack.y;
      if (ack.finished) { console.log(`[${name}] finish`); return; }
      if (ack.question) {
        const r = await answer(ack.question);
        if (!r || r.eliminated) return;
      }
    }
  };

  await run();

  await emit('labyrinth:join', { code });
  const me = init.you;
  console.log(`[${name}] YAKUNIY`, JSON.stringify({ rank: me.rank, score: me.score, finished: me.finished, eliminated: me.eliminated }));
  socket.close();
  process.exit(0);
});
