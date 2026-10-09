import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { createSessionSchema, submitResultSchema } from '../schemas/typing.js';

const router = Router();

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 daqiqada tugamagan session yaroqsiz
const MIN_TIME_SEC = 2;                // bundan tez yozilgan natija qabul qilinmaydi
const MAX_WPM_FLAG = 150;              // shu chegaradan oshsa flagged = true

// Server o'zi hisoblaydi: frontend hech qanday raqam yubormaydi
export function computeMetrics(target, typed, elapsedSec) {
  let correct = 0;
  const len = Math.min(target.length, typed.length);
  for (let i = 0; i < len; i++) {
    if (target[i] === typed[i]) correct++;
  }

  const minutes = Math.max(elapsedSec, 1) / 60;
  const wpm = (correct / 5) / minutes; // sof WPM: to'g'ri belgilar / 5 / daqiqa
  const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 0;

  return {
    wpm: Math.round(wpm * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
    timeSec: Math.round(elapsedSec),
  };
}

// POST /api/v1/typing/sessions: o'yin boshlanadi, matn serverda tanlanadi
router.post(
  '/sessions',
  requireAuth,
  validate({ body: createSessionSchema }),
  async (req, res) => {
    const d = req.validated.body;

    const { rows: found } = await query(
      `SELECT id, data
         FROM contents
        WHERE id = $1
          AND type = 'typing_text'
          AND is_published = true
          AND deleted_at IS NULL`,
      [d.content_id]
    );
    if (!found[0]) {
      throw new AppError(404, 'CONTENT_NOT_FOUND', 'Matnli kontent topilmadi');
    }

    const targetText = found[0].data.text;
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    let roomId = null;
    if (d.room_code) {
      const { rows: roomRows } = await query(
        `SELECT id, game_type, status, content_id, expires_at
           FROM game_rooms
          WHERE code = $1`,
        [d.room_code]
      );
      const room = roomRows[0];
      if (!room) {
        throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
      }
      if (room.game_type !== 'typing') {
        throw new AppError(400, 'WRONG_GAME_TYPE', "Bu xona typing o'yini uchun emas");
      }
      if (room.status === 'finished' || new Date(room.expires_at) <= new Date()) {
        throw new AppError(409, 'ROOM_FINISHED', "O'yin tugagan");
      }
      if (room.content_id !== d.content_id) {
        throw new AppError(400, 'CONTENT_MISMATCH', "Matn xona kontenti bilan mos emas");
      }
      const { rows: p } = await query(
        'SELECT 1 FROM game_players WHERE room_id = $1 AND user_id = $2',
        [room.id, req.user.id]
      );
      if (!p[0]) {
        throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
      }
      roomId = room.id;
    }

    const { rows } = await query(
      `INSERT INTO typing_sessions
         (user_id, content_id, game_mode, language, level, target_text, expires_at, room_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, started_at, expires_at`,
      [req.user.id, d.content_id, d.game_mode, d.language, d.level, targetText, expiresAt, roomId]
    );

    // target_text faqat shu javobda chiqadi, natija endpoint'ida qaytarilmaydi
    res.status(201).json({
      session_id: rows[0].id,
      started_at: rows[0].started_at,
      expires_at: rows[0].expires_at,
      target_text: targetText,
    });
  }
);

// POST /api/v1/typing/results: o'yin tugadi, server hisoblaydi
router.post(
  '/results',
  requireAuth,
  validate({ body: submitResultSchema }),
  async (req, res) => {
    const { session_id, typed_text } = req.validated.body;

    const result = await withTransaction(async (client) => {
      // FOR UPDATE: bir vaqtda ikki marta yuborilsa, faqat bittasi o'tadi
      const { rows } = await client.query(
        `SELECT id, user_id, content_id, game_mode, language, level,
                target_text, started_at, expires_at, consumed_at, room_id
           FROM typing_sessions
          WHERE id = $1 AND user_id = $2
          FOR UPDATE`,
        [session_id, req.user.id]
      );
      const session = rows[0];

      if (!session) {
        throw new AppError(404, 'SESSION_NOT_FOUND', "O'yin sessiyasi topilmadi");
      }
      if (session.consumed_at) {
        throw new AppError(409, 'SESSION_USED', "Bu sessiya allaqachon ishlatilgan");
      }

      const now = Date.now();
      if (new Date(session.expires_at).getTime() < now) {
        throw new AppError(400, 'SESSION_EXPIRED', "O'yin sessiyasi muddati tugagan");
      }

      const elapsedSec = (now - new Date(session.started_at).getTime()) / 1000;
      if (elapsedSec < MIN_TIME_SEC) {
        throw new AppError(400, 'TOO_FAST', "Natija juda tez yuborildi");
      }

      const m = computeMetrics(session.target_text, typed_text, elapsedSec);
      const flagged = m.wpm > MAX_WPM_FLAG;

      await client.query(
        'UPDATE typing_sessions SET consumed_at = now() WHERE id = $1',
        [session.id]
      );

      const { rows: inserted } = await client.query(
        `INSERT INTO typing_results
           (user_id, session_id, content_id, game_mode, language, level,
            wpm, accuracy, time_sec, text_length, flagged, room_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, wpm, accuracy, time_sec, text_length, flagged, created_at`,
        [
          req.user.id,
          session.id,
          session.content_id,
          session.game_mode,
          session.language,
          session.level,
          m.wpm,
          m.accuracy,
          m.timeSec,
          session.target_text.length,
          flagged,
          session.room_id ?? null,
        ]
      );

      if (session.content_id) {
        await client.query(
          'UPDATE contents SET plays_count = plays_count + 1 WHERE id = $1',
          [session.content_id]
        );
      }

      const row = inserted[0];
      return {
        ...row,
        wpm: Number(row.wpm),
        accuracy: Number(row.accuracy),
       };
    });

    res.status(201).json({ result });
  }
);

export default router;