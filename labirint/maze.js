// Ishlatish:  node maze.js [eni] [bo'yi] [seed] [--solution]
// Masalan:    node maze.js 10 10
//             node maze.js 10 10 12345 --solution
const W = +process.argv[2] || 10;
const H = +process.argv[3] || 10;
const seed = +process.argv[4] || Math.floor(Math.random() * 1e9);
const showSolution = process.argv.includes('--solution');

// Seed bilan ishlaydigan tasodifiy son generatori (mulberry32)
function makeRng(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = makeRng(seed);

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // shimol, sharq, janub, g'arb
const open = Array.from({ length: H }, () =>
  Array.from({ length: W }, () => [false, false, false, false]));
const seen = Array.from({ length: H }, () => Array(W).fill(false));

// 1) Recursive Backtracker (DFS, stek bilan)
const sx = Math.floor(rand() * W), sy = Math.floor(rand() * H);
const stack = [[sx, sy]];
seen[sy][sx] = true;
while (stack.length) {
  const [x, y] = stack[stack.length - 1];
  const nb = [];
  DIRS.forEach(([dx, dy], d) => {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[ny][nx]) nb.push(d);
  });
  if (!nb.length) { stack.pop(); continue; }
  const d = nb[Math.floor(rand() * nb.length)];
  const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
  open[y][x][d] = true;
  open[ny][nx][(d + 2) % 4] = true; // qarama-qarshi devorni ham buzamiz
  seen[ny][nx] = true;
  stack.push([nx, ny]);
}

// 2) BFS: berilgan katakdan eng uzoq katakni va yo'lni topadi
function bfs(fx, fy) {
  const dist = Array.from({ length: H }, () => Array(W).fill(-1));
  const prev = {};
  dist[fy][fx] = 0;
  const q = [[fx, fy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    DIRS.forEach(([dx, dy], d) => {
      if (!open[y][x][d]) return;
      const nx = x + dx, ny = y + dy;
      if (dist[ny][nx] < 0) {
        dist[ny][nx] = dist[y][x] + 1;
        prev[nx + ',' + ny] = [x, y];
        q.push([nx, ny]);
      }
    });
  }
  return { last: q[q.length - 1], prev, dist };
}

// 3) Boshi va oxiri: eng uzun yo'l bo'ladigan ikki chekka katak
const a = bfs(Math.floor(rand() * W), Math.floor(rand() * H)).last;
const b = bfs(a[0], a[1]);
const start = a, end = b.last;

const path = new Set();
for (let c = end; c; c = b.prev[c[0] + ',' + c[1]]) path.add(c[0] + ',' + c[1]);

// 4) Terminalda chizish
const R = 2 * H + 1, C = 2 * W + 1;
const g = Array.from({ length: R }, () => Array(C).fill('##'));
const put = (r, c, s) => { g[r][c] = s; };
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const mark = path.has(x + ',' + y) && showSolution ? '. ' : '  ';
    put(2 * y + 1, 2 * x + 1, mark);
    DIRS.forEach(([dx, dy], d) => {
      if (!open[y][x][d]) return;
      const both = path.has(x + ',' + y) && path.has((x + dx) + ',' + (y + dy));
      put(2 * y + 1 + dy, 2 * x + 1 + dx, both && showSolution ? '. ' : '  ');
    });
  }
}
put(2 * start[1] + 1, 2 * start[0] + 1, 'S ');
put(2 * end[1] + 1, 2 * end[0] + 1, 'E ');

console.log(g.map(r => r.join('')).join('\n'));
console.log(`\nO'lcham: ${W}x${H} | seed: ${seed} | eng qisqa yo'l: ${b.dist[end[1]][end[0]]} qadam`);
