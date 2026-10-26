/**
 * @file IT darslaridagi mini-labirint xaritasi.
 * Xarita — teng uzunlikdagi qatorlar: '#' devor, '.' yo'l, 'S' qahramon (boshlanish), 'G' qasr (maqsad).
 * Frontend (ui/it/maze.js) ham xuddi shu qoidalar bilan ishlaydi.
 */

export const MAZE_MIN = 3;
export const MAZE_MAX = 10;
export const MAZE_ROW = /^[#.SG]+$/;

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * Xaritani tekshiradi.
 * @param {string[]} grid
 * @returns {{errors:string[], shortest:number|null}} shortest — S dan G gacha eng kam qadam
 */
export function analyzeMaze(grid) {
  const errors = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (rows < MAZE_MIN || rows > MAZE_MAX || cols < MAZE_MIN || cols > MAZE_MAX) {
    errors.push(`xarita ${MAZE_MIN}×${MAZE_MIN} dan ${MAZE_MAX}×${MAZE_MAX} gacha bo'lishi kerak`);
  }
  if (grid.some((r) => r.length !== cols || !MAZE_ROW.test(r))) {
    errors.push("xarita qatorlari bir xil uzunlikda bo'lishi kerak");
    return { errors, shortest: null };
  }
  const find = (ch) => {
    const out = [];
    grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([y, x]); }));
    return out;
  };
  const s = find('S');
  const g = find('G');
  if (s.length !== 1) errors.push(s.length ? 'xaritada faqat bitta qahramon bo\'lishi kerak' : "xaritada qahramon (boshlanish joyi) yo'q");
  if (g.length !== 1) errors.push(g.length ? 'xaritada faqat bitta qasr bo\'lishi kerak' : "xaritada qasr (maqsad) yo'q");
  if (errors.length) return { errors, shortest: null };

  // Eng qisqa yo'l (kenglik bo'yicha qidiruv)
  const dist = grid.map((r) => Array(r.length).fill(-1));
  const [sy, sx] = s[0];
  dist[sy][sx] = 0;
  const queue = [[sy, sx]];
  while (queue.length) {
    const [y, x] = queue.shift();
    for (const [dy, dx] of DIRS) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
      if (grid[ny][nx] === '#' || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1;
      queue.push([ny, nx]);
    }
  }
  const shortest = dist[g[0][0]][g[0][1]];
  if (shortest < 0) {
    errors.push("qahramondan qasrgacha yo'l yo'q");
    return { errors, shortest: null };
  }
  return { errors, shortest };
}
