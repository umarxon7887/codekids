/**
 * @file Botlar bilan poyga (Typing Race, xonasiz). Hamma narsa serverda hisoblanadi:
 * botlar tezligi sessiya id'sidan (sha256) chiqadi, shuning uchun bazaga alohida yozish shart emas —
 * natijada ham, statistikada ham xuddi shu botlar qayta hisoblanadi. Frontend faqat ko'rsatadi.
 */
import { createHash } from 'node:crypto';

export const BOT_COUNT = 3;
/** Daraja (1..4) bo'yicha botlar WPM oralig'i. */
export const BOT_LEVELS = { 1: [8, 14], 2: [15, 22], 3: [23, 32], 4: [33, 45] };
/** 3-2-1 hisoblash: sessiya yaratilgandan keyin shuncha soniya yozib bo'lmaydi, vaqtdan ayiriladi. */
export const RACE_COUNTDOWN_SEC = 3;
/** O'rin uchun coin: 1-, 2-, 3-o'rin. */
export const RACE_COINS = { 1: 10, 2: 5, 3: 2 };
/** Kuniga poygadan ko'pi bilan shuncha coin. */
export const RACE_DAILY_CAP = 50;
/** Coin uchun eng kam aniqlik (%). */
export const RACE_MIN_ACCURACY = 90;

/** Sessiya uchun botlar: [{ wpm }] (doim bir xil chiqadi). */
export function botsFor(sessionId, level) {
  const [min, max] = BOT_LEVELS[level] || BOT_LEVELS[1];
  return Array.from({ length: BOT_COUNT }, (_, i) => {
    const h = createHash('sha256').update(`${sessionId}:${i}`).digest();
    const f = h.readUInt32BE(0) / 0x100000000;
    return { wpm: Math.round((min + f * (max - min)) * 10) / 10 };
  });
}

/** O'rin: o'yinchidan tezroq botlar soni + 1 (teng bo'lsa o'yinchi oldinda). */
export function placeOf(wpm, bots) {
  return 1 + bots.filter((b) => b.wpm > wpm).length;
}

/**
 * Har daraja bo'yicha g'alabalar (1-o'rin) soni va ochiq darajalar.
 * Chempion (4) darajasi Qiyin (3) darajada kamida bir marta 1-o'rin olgandan keyin ochiladi.
 */
export async function raceStats(run, userId) {
  const { rows } = await run(
    `SELECT session_id, level, wpm FROM typing_results
      WHERE user_id = $1 AND game_mode = 'race' AND room_id IS NULL AND flagged = false
      ORDER BY created_at DESC LIMIT 1000`,
    [userId]
  );
  const wins = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const races = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of rows) {
    const lv = Number(r.level) || 1;
    races[lv] += 1;
    if (placeOf(Number(r.wpm), botsFor(r.session_id, lv)) === 1) wins[lv] += 1;
  }
  return { wins, races, unlocked: [1, 2, 3, ...(wins[3] > 0 ? [4] : [])] };
}

/**
 * Natija saqlangandan keyin (o'sha tranzaksiyada): o'rin va coin.
 * @param {import('pg').PoolClient} client
 */
export async function settleRace(client, userId, session, m, flagged) {
  const bots = botsFor(session.id, session.level);
  const place = placeOf(m.wpm, bots);
  let amount = flagged || m.accuracy < RACE_MIN_ACCURACY ? 0 : RACE_COINS[place] || 0;
  let capped = false;
  if (amount) {
    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS s FROM coin_events
        WHERE user_id = $1 AND reason = 'race' AND day = (now() AT TIME ZONE 'Asia/Tashkent')::date`,
      [userId]
    );
    const left = Math.max(0, RACE_DAILY_CAP - rows[0].s);
    if (left < amount) { amount = left; capped = true; }
  }
  if (amount) {
    await client.query(
      'INSERT INTO coin_events (user_id, amount, reason, ref) VALUES ($1, $2, $3, $4)',
      [userId, amount, 'race', `L${session.level}P${place}`]
    );
  }
  const { rows: u } = await client.query(
    'UPDATE users SET coins = coins + $2 WHERE id = $1 RETURNING coins',
    [userId, amount]
  );
  return { place, bots, coins_earned: amount, coins_total: u[0]?.coins ?? 0, capped };
}
