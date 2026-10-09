import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors.js';
import { query, withTransaction } from '../db.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error("JWT_ACCESS_SECRET o'rnatilmagan yoki juda qisqa (kamida 32 belgi)");
}

const ISSUER = 'codekids-api';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL_MS = (Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30) * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

// ---------- Access token (JWT) ----------

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, typ: 'access' },
    ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: ACCESS_TTL, issuer: ISSUER }
  );
}

export function verifyAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'], issuer: ISSUER });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Token muddati tugagan');
    }
    throw new AppError(401, 'TOKEN_INVALID', "Token noto'g'ri");
  }

  if (payload.typ !== 'access') {
    throw new AppError(401, 'TOKEN_INVALID', "Token noto'g'ri");
  }

  return { id: payload.sub, role: payload.role };
}

// ---------- Refresh token (tasodifiy satr, bazada faqat hash) ----------

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// client: pool yoki transaction client (ikkalasida ham .query bor)
async function insertRefreshToken(client, { userId, familyId }) {
  const raw = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const { rows } = await client.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, familyId, hashRefreshToken(raw), expiresAt]
  );

  return { raw, id: rows[0].id };
}

// Login/register: yangi oila (family) ochiladi
export async function issueSession(client, user) {
  const familyId = crypto.randomUUID();
  const { raw } = await insertRefreshToken(client, { userId: user.id, familyId });

  return {
    accessToken: signAccessToken(user),
    refreshToken: raw,
  };
}

// Refresh: eski token almashtiriladi (rotation)
export async function rotateRefreshToken(rawToken) {
  if (!rawToken) {
    throw new AppError(401, 'TOKEN_MISSING', 'Refresh token topilmadi');
  }

  // Tranzaksiya ichida faqat natija qaytariladi, xato otilmaydi.
  // Aks holda ROLLBACK bo'lib, reuse'da oilani bekor qilish ham ortga qaytib ketardi.
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT rt.id, rt.user_id, rt.family_id, rt.expires_at, rt.revoked_at, u.role
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        FOR UPDATE OF rt`,
      [hashRefreshToken(rawToken)]
    );

    const row = rows[0];

    if (!row) {
      return { status: 'invalid' };
    }

    // Eski, allaqachon almashtirilgan token qayta ishlatildi:
    // token o'g'irlangan bo'lishi mumkin, butun oilani bekor qilamiz
    if (row.revoked_at) {
      await client.query(
        `UPDATE refresh_tokens
            SET revoked_at = now()
          WHERE family_id = $1 AND revoked_at IS NULL`,
        [row.family_id]
      );
      return { status: 'reused' };
    }

    if (row.expires_at <= new Date()) {
      return { status: 'expired' };
    }

    const { raw, id: newId } = await insertRefreshToken(client, {
      userId: row.user_id,
      familyId: row.family_id,
    });

    await client.query(
      `UPDATE refresh_tokens
          SET revoked_at = now(), replaced_by = $2
        WHERE id = $1`,
      [row.id, newId]
    );

    return {
      status: 'ok',
      userId: row.user_id,
      role: row.role,
      refreshToken: raw,
    };
  });

  switch (result.status) {
    case 'ok':
      return {
        accessToken: signAccessToken({ id: result.userId, role: result.role }),
        refreshToken: result.refreshToken,
      };
    case 'reused':
      throw new AppError(401, 'TOKEN_REUSED', 'Sessiya bekor qilindi, qayta kiring');
    case 'expired':
      throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token muddati tugagan');
    default:
      throw new AppError(401, 'TOKEN_INVALID', "Refresh token noto'g'ri");
  }
}

// Logout: bitta tokenni bekor qilish
export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;

  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashRefreshToken(rawToken)]
  );
}

// ---------- Cookie yordamchilari ----------

const cookieOptions = () => ({
  httpOnly: true,
  secure: COOKIE_SECURE,
  // Frontend boshqa domenda bo'lsa cross-site cookie uchun 'none' kerak (secure bilan birga)
  sameSite: COOKIE_SECURE ? 'none' : 'lax',
  path: REFRESH_COOKIE_PATH,
});

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: REFRESH_TTL_MS,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

export function readRefreshCookie(req) {
  return req.cookies?.[REFRESH_COOKIE];
}