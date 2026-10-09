import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool, { query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
} from '../services/tokens.js';

const router = Router();

const BCRYPT_ROUNDS = 12;

// Foydalanuvchi topilmasa ham bir xil vaqt sarflansin (email'larni taxmin qilishning oldini olish uchun)
const DUMMY_HASH = bcrypt.hashSync('codekids-dummy-password', BCRYPT_ROUNDS);

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    nickname: row.nickname,
  };
}

// POST /api/v1/auth/register
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  async (req, res) => {
    const data = req.validated.body;
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const { user, tokens } = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, role, nickname)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, nickname`,
        [data.email, passwordHash, data.role, data.nickname]
      );
      const newUser = rows[0];

      if (newUser.role === 'teacher') {
        await client.query(
          `INSERT INTO teacher_profiles
             (user_id, full_name, school, subjects, experience_years, age_group)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newUser.id,
            data.full_name,
            data.school ?? null,
            data.subjects ?? [],
            data.experience_years ?? null,
            data.age_group ?? null,
          ]
        );
      }

      const issued = await issueSession(client, newUser);
      return { user: newUser, tokens: issued };
    });

    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({ accessToken: tokens.accessToken, user: publicUser(user) });
  }
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  async (req, res) => {
    const { email, password } = req.validated.body;

    const { rows } = await query(
      'SELECT id, email, password_hash, role, nickname FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];

    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      throw new AppError(401, 'INVALID_CREDENTIALS', "Email yoki parol noto'g'ri");
    }

    const tokens = await issueSession(pool, user);

    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken, user: publicUser(user) });
  }
);

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  const tokens = await rotateRefreshToken(readRefreshCookie(req));

  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  await revokeRefreshToken(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).end();
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.nickname, u.avatar_url, u.created_at,
            tp.full_name, tp.school, tp.subjects, tp.experience_years, tp.age_group
       FROM users u
       LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.id = $1`,
    [req.user.id]
  );

  if (!rows[0]) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Foydalanuvchi topilmadi');
  }

  res.json({ user: rows[0] });
});

export default router;