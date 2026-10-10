import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { computeMetrics } from './typing.js';
import { guestSessionSchema, guestResultSchema } from '../schemas/typing.js';

const router = Router();

// Access token kalitidan ajratilgan kalit: mehmon tokeni access token sifatida ishlamaydi
const GUEST_SECRET = crypto
  .createHmac('sha256', process.env.JWT_ACCESS_SECRET)
  .update('guest-typing')
  .digest('hex');

const TOKEN_TTL_SEC = 15 * 60;
const MIN_TIME_SEC = 2;
const MAX_WPM_FLAG = 150;

// Ishlatilgan tokenlar: jti -> tugash vaqti (ms). Token eskirgach yozuv o'chiriladi.
const usedTokens = new Map();

function pruneUsed() {
  const now = Date.now();
  for (const [jti, exp] of usedTokens) {
    if (exp <= now) usedTokens.delete(jti);
  }
}

// POST /api/v1/guest/session: login talab qilinmaydi
router.post('/session', validate({ body: guestSessionSchema }), async (req, res) => {
  const { content_id, language } = req.validated.body;

  const { rows } = content_id
    ? await query(
        `SELECT id, data FROM contents
          WHERE id = $1 AND type = 'typing_text' AND is_published = true AND deleted_at IS NULL`,
        [content_id]
      )
    : await query(
        `SELECT id, data FROM contents
          WHERE type = 'typing_text' AND is_published = true AND deleted_at IS NULL
          AND ($1::text IS NULL OR language = $1)
          ORDER BY random() LIMIT 1`,
        [language ?? null]
      );

  const content = rows[0];
  if (!content) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Matnli kontent topilmadi');
  }

  const startedAt = Date.now();
  const guestToken = jwt.sign(
    {
      typ: 'guest_typing',
      jti: crypto.randomUUID(),
      cid: content.id,
      text: content.data.text,
      started_at: startedAt,
    },
    GUEST_SECRET,
    { algorithm: 'HS256', expiresIn: TOKEN_TTL_SEC }
  );

  res.status(201).json({
    guest_token: guestToken,
    content_id: content.id,
    target_text: content.data.text,
    started_at: new Date(startedAt).toISOString(),
    expires_in: TOKEN_TTL_SEC,
  });
});

// POST /api/v1/guest/results: hisoblanadi, lekin saqlanmaydi. Token bir marta ishlaydi.
router.post('/results', validate({ body: guestResultSchema }), (req, res) => {
  const { guest_token, typed_text } = req.validated.body;

  let payload;
  try {
    payload = jwt.verify(guest_token, GUEST_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Mashq sessiyasi muddati tugagan');
    }
    throw new AppError(401, 'TOKEN_INVALID', "Mashq sessiyasi noto'g'ri");
  }
  if (payload.typ !== 'guest_typing' || !payload.jti) {
    throw new AppError(401, 'TOKEN_INVALID', "Mashq sessiyasi noto'g'ri");
  }

  pruneUsed();
  if (usedTokens.has(payload.jti)) {
    throw new AppError(409, 'TOKEN_USED', 'Bu mashq natijasi allaqachon yuborilgan');
  }

  const elapsedSec = (Date.now() - payload.started_at) / 1000;
  if (elapsedSec < MIN_TIME_SEC) {
    // Bu holatda token sarflanmaydi, o'quvchi keyinroq qayta urinishi mumkin
    throw new AppError(400, 'TOO_FAST', 'Natija juda tez yuborildi');
  }

  // Natija qabul qilindi: tokenni sarflaymiz (token muddati tugaguncha saqlanadi)
  usedTokens.set(payload.jti, payload.exp * 1000);

  const m = computeMetrics(payload.text, typed_text, elapsedSec);

  res.json({
    result: {
      wpm: m.wpm,
      accuracy: m.accuracy,
      time_sec: m.timeSec,
      text_length: payload.text.length,
      flagged: m.wpm > MAX_WPM_FLAG,
      saved: false,
    },
  });
});

export default router;
