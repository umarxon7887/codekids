/**
 * @file Kibi labirinti: progress va coinlar. O'quvchi yuborgan dastur serverda qayta bajariladi
 * (frontend/src/games/kodlab/game.js qoidalari bilan bir xil), yulduz shu yerda hisoblanadi.
 * Coin: daraja birinchi marta o'tilganda KL_COINS.solve, har yangi yulduz uchun KL_COINS.star.
 */
import { AppError } from '../errors.js';
import { KL_LEVELS } from '../data/kodlabLevels.js';

export const KL_COINS = { solve: 5, star: 3 };
const MAX_STEPS = 60;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

const countBlocks = (list) => list.reduce((s, b) => s + 1 + (b.b ? countBlocks(b.b) : 0), 0);
const usesOnly = (list, allowed) => list.every((b) => allowed.includes(b.t) && (!b.b || usesOnly(b.b, allowed)));
const depth = (list) => list.reduce((m, b) => Math.max(m, b.b ? 1 + depth(b.b) : 0), 0);
function* exec(list) {
  for (const b of list) {
    if (b.t === 'REP') { for (let i = 0; i < b.n; i++) yield* exec(b.b); } else yield b;
  }
}

/** Dasturni bajaradi: 'win' | 'wall' | 'short' | 'loop'. */
export function simulate(L, program) {
  const y0 = L.map.findIndex((r) => r.includes('S'));
  const K = { x: L.map[y0].indexOf('S'), y: y0, d: L.dir };
  const at = (x, y) => (L.map[y] || '')[x] || '#';
  let steps = 0;
  for (const b of exec(program)) {
    if (++steps > MAX_STEPS) return 'loop';
    if (b.t === 'L') K.d = (K.d + 3) % 4;
    else if (b.t === 'R') K.d = (K.d + 1) % 4;
    else {
      const nx = K.x + DX[K.d], ny = K.y + DY[K.d];
      if (at(nx, ny) === '#') return 'wall';
      K.x = nx; K.y = ny;
      if (at(nx, ny) === 'G') return 'win';
    }
  }
  return 'short';
}

export const starsFor = (L, n) => (n <= L.opt ? 3 : n <= L.opt + 2 ? 2 : 1);

async function progressOf(db, userId) {
  const { rows } = await db.query('SELECT level, stars FROM kodlab_progress WHERE user_id = $1', [userId]);
  const progress = {};
  for (const r of rows) progress[r.level] = r.stars;
  return progress;
}

/** GET: { progress: {indeks: yulduz}, coins, total } */
export async function getKodlab(db, user) {
  const [progress, u] = await Promise.all([
    progressOf(db, user.id),
    db.query('SELECT coins FROM users WHERE id = $1', [user.id]),
  ]);
  return { progress, coins: u.rows[0]?.coins ?? 0, total: KL_LEVELS.length, rewards: KL_COINS };
}

/** POST solve: dasturni tekshiradi, eng yaxshi natijani saqlaydi va coin beradi. */
export async function solveLevel(withTransaction, user, { level, program }) {
  const L = KL_LEVELS[level];
  const n = countBlocks(program);
  if (n > L.max || depth(program) > 4 || !usesOnly(program, L.blocks)) {
    throw new AppError(400, 'KL_BAD_PROGRAM', "Dastur bu daraja qoidalariga mos emas");
  }
  return withTransaction(async (client) => {
    if (level > 0) {
      const { rows } = await client.query(
        'SELECT 1 FROM kodlab_progress WHERE user_id = $1 AND level = $2',
        [user.id, level - 1]
      );
      if (!rows.length) throw new AppError(403, 'KL_LOCKED', 'Avval oldingi darajani o\'ting');
    }
    const result = simulate(L, program);
    if (result !== 'win') {
      return { result, ...(await totals(client, user.id)), coins_earned: 0 };
    }
    const stars = starsFor(L, n);
    const { rows: prev } = await client.query(
      'SELECT stars FROM kodlab_progress WHERE user_id = $1 AND level = $2 FOR UPDATE',
      [user.id, level]
    );
    const before = prev[0]?.stars ?? 0;
    await client.query(
      `INSERT INTO kodlab_progress (user_id, level, stars, best_blocks) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, level) DO UPDATE SET
         stars = GREATEST(kodlab_progress.stars, EXCLUDED.stars),
         best_blocks = LEAST(kodlab_progress.best_blocks, EXCLUDED.best_blocks),
         attempts = kodlab_progress.attempts + 1,
         updated_at = now()`,
      [user.id, level, stars, n]
    );
    const coins = [];
    if (!before) coins.push({ reason: 'kodlab', amount: KL_COINS.solve, ref: `L${level + 1}` });
    if (stars > before) coins.push({ reason: 'kodlab_star', amount: (stars - before) * KL_COINS.star, ref: `L${level + 1}S${stars}` });
    const earned = coins.reduce((s, c) => s + c.amount, 0);
    for (const c of coins) {
      await client.query(
        'INSERT INTO coin_events (user_id, amount, reason, ref) VALUES ($1, $2, $3, $4)',
        [user.id, c.amount, c.reason, c.ref]
      );
    }
    const { rows: u } = await client.query(
      'UPDATE users SET coins = coins + $2 WHERE id = $1 RETURNING coins',
      [user.id, earned]
    );
    return {
      result, stars, best_stars: Math.max(before, stars), blocks: n,
      coins_earned: earned, coins_total: u[0]?.coins ?? 0,
      progress: await progressOf(client, user.id),
    };
  });
}

async function totals(db, userId) {
  const { rows } = await db.query('SELECT coins FROM users WHERE id = $1', [userId]);
  return { coins_total: rows[0]?.coins ?? 0 };
}
