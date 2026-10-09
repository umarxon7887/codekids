import 'dotenv/config';
import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL muhit o'zgaruvchisi o'rnatilmagan");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Neon bo'sh ulanishni bir necha daqiqadan keyin yopadi.
  // Pool ulanishni undan oldinroq tashlaydi, shunda yopiq ulanish qayta ishlatilmaydi.
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
});

pool.on('error', (err) => {
  logger.warn({ err: err.message }, 'PostgreSQL bo\'sh ulanishi yopildi (pool uni tashlaydi)');
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closeDb() {
  await pool.end();
}

export default pool;