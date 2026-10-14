// 5 darajali labirint: har level o'z o'lchami, chalg'ituvchi tarmoqlari va savollar soni bilan.
// Hammasi seed'dan deterministik: bir xil seed + savollar soni = bir xil 5 ta labirint.
// Faqat sof mantiq (baza yoki socket yo'q), shuning uchun alohida sinab ko'rish oson.

import { mulberry32, exitCell, MOVES, toRows } from './mazeGenerator.js';

export const LEVEL_COUNT = 5;
export const MIN_QUESTIONS = LEVEL_COUNT; // har levelda kamida 1 ta savol bo'lishi uchun
export const MAX_CHECKPOINTS = 60; // savollar bundan ko'p bo'lsa, ortiqchasi almashtirish uchun zaxirada qoladi
export const START = { x: 1, y: 1 };

// size: labirint o'lchami (toq son). branch: 0..1, qancha ko'p bo'lsa chalg'ituvchi tarmoqlar va
// boshi berk ko'chalar shuncha ko'p (0 = uzun yaxlit yo'laklar, 1 = juda tarmoqli).
const LEVEL_SPECS = [
  { size: 9, branch: 0.1 },
  { size: 13, branch: 0.3 },
  { size: 17, branch: 0.5 },
  { size: 21, branch: 0.7 },
  { size: 27, branch: 0.9 },
];
// Savollar keyingi levellarda ko'proq bo'lishi uchun og'irliklar
const WEIGHTS = [1, 2, 3, 4, 5];
const MAX_SIZE = 41;

const key = (x, y) => `${x},${y}`;

/** Savollar sonini 5 levelga bo'ladi: har levelda kamida 1 ta, keyingilarida ko'proq. */
export function splitQuestions(total, levels = LEVEL_COUNT) {
  if (!Number.isInteger(total) || total < levels) {
    throw new Error(`Kamida ${levels} ta savol kerak`);
  }
  const counts = Array(levels).fill(1);
  const extra = total - levels;
  const w = WEIGHTS.slice(0, levels);
  const sumW = w.reduce((a, b) => a + b, 0);
  const shares = w.map((x) => (extra * x) / sumW);
  const floors = shares.map(Math.floor);
  let left = extra - floors.reduce((a, b) => a + b, 0);
  const order = shares
    .map((s, i) => ({ i, r: s - Math.floor(s) }))
    .sort((a, b) => b.r - a.r || b.i - a.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  // tartib saqlanadi: oldingi level hech qachon keyingisidan ko'p savolli bo'lmaydi
  return counts.map((c, i) => c + floors[i]).sort((a, b) => a - b);
}

/**
 * Growing Tree labirinti. Har qadamda aktiv ro'yxatdan:
 *  - `branch` ehtimol bilan tasodifiy katak (tarmoq ko'payadi),
 *  - aks holda eng oxirgi katak (uzun yaxlit yo'lak) tanlanadi.
 * Natija har doim "mukammal" labirint: barcha kataklar bir-biriga bog'langan, aylana yo'l yo'q.
 */
export function generateLevelMaze(seed, size, branch) {
  if (!Number.isInteger(size) || size < 5 || size % 2 === 0) {
    throw new Error("Labirint o'lchami toq va kamida 5 bo'lishi kerak");
  }
  const rand = mulberry32(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const steps = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  grid[1][1] = 0;
  const active = [[1, 1]];
  while (active.length > 0) {
    const idx = rand() < branch ? Math.floor(rand() * active.length) : active.length - 1;
    const [x, y] = active[idx];
    const options = steps.filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && grid[ny][nx] === 1;
    });
    if (options.length === 0) {
      active[idx] = active[active.length - 1];
      active.pop();
      continue;
    }
    const [dx, dy] = options[Math.floor(rand() * options.length)];
    grid[y + dy / 2][x + dx / 2] = 0;
    grid[y + dy][x + dx] = 0;
    active.push([x + dx, y + dy]);
  }
  return grid;
}

/**
 * Savol kataklari butun labirint bo'ylab tarqoq: har yangi katak oldingilardan (start, finish
 * va tanlanganlardan) iloji boricha uzoqroq tanlanadi. Labirint mukammal bo'lgani uchun
 * har qanday katakka start'dan yetib borish mumkin (boshi berk ko'chaga ham kirib, qaytib chiqiladi).
 */
export function pickCheckpoints(grid, size, count, seed) {
  const end = exitCell(size);
  const pool = [];
  for (let y = 1; y < size - 1; y += 2) {
    for (let x = 1; x < size - 1; x += 2) {
      if (grid[y][x] !== 0) continue;
      if ((x === START.x && y === START.y) || (x === end.x && y === end.y)) continue;
      pool.push({ x, y });
    }
  }
  if (pool.length < count) throw new Error("Labirintda savollar uchun joy yetmaydi");

  const rand = mulberry32(seed ^ 0x5bd1e995);
  const anchors = [START, end];
  const chosen = [];
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  while (chosen.length < count) {
    let best = -1;
    let bestScore = -1;
    const tries = Math.min(pool.length, 12);
    for (let t = 0; t < tries; t++) {
      const i = Math.floor(rand() * pool.length);
      const c = pool[i];
      let score = Infinity;
      for (const a of anchors) score = Math.min(score, dist(c, a));
      for (const a of chosen) score = Math.min(score, dist(c, a));
      if (score > bestScore) { bestScore = score; best = i; }
    }
    chosen.push(pool[best]);
    pool[best] = pool[pool.length - 1];
    pool.pop();
  }
  return chosen;
}

/** Katta savollar soni uchun labirint yetarlicha katta bo'lsin (kataklarning kamida 1/3 qismi bo'sh qoladi). */
function fitSize(base, count) {
  const cellsNeeded = count * 3 + 2;
  const side = Math.ceil(Math.sqrt(cellsNeeded));
  return Math.min(MAX_SIZE, Math.max(base, side * 2 + 1));
}

const levelSeed = (seed, i) => (seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;

/** @returns {{level:number,size:number,branch:number,grid:number[][],rows:string[],start:{x:number,y:number},exit:{x:number,y:number},checkpoints:{x:number,y:number}[],checkpointKeys:Set<string>}[]} */
export function buildLevels(seed, questionCount) {
  const checkpointCount = Math.min(questionCount, MAX_CHECKPOINTS);
  const counts = splitQuestions(checkpointCount);
  return LEVEL_SPECS.map((spec, i) => {
    const size = fitSize(spec.size, counts[i]);
    const s = levelSeed(seed, i);
    const grid = generateLevelMaze(s, size, spec.branch);
    const checkpoints = pickCheckpoints(grid, size, counts[i], s);
    return {
      level: i + 1,
      size,
      branch: spec.branch,
      grid,
      rows: toRows(grid),
      start: { ...START },
      exit: exitCell(size),
      checkpoints,
      checkpointKeys: new Set(checkpoints.map((c) => key(c.x, c.y))),
    };
  });
}

/** Start'dan finish'gacha eng qisqa (mukammal labirintda yagona) yo'l: katak kalitlari. Testlar va o'lchovlar uchun. */
export function solutionPath(grid, size, from = START, to = exitCell(size)) {
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) break;
    for (const { dx, dy } of Object.values(MOVES)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (grid[ny][nx] !== 0 || prev.has(k)) continue;
      prev.set(k, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  const out = [];
  let k = key(to.x, to.y);
  while (typeof k === 'string' && prev.has(k)) {
    out.unshift(k);
    k = prev.get(k);
  }
  return out;
}