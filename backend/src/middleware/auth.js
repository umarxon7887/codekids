import { AppError } from '../errors.js';
import { verifyAccessToken } from '../services/tokens.js';

/**
 * Authorization: Bearer <access_token> ni tekshiradi.
 * Muvaffaqiyatli bo'lsa req.user = { id, role } qo'yiladi.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'TOKEN_MISSING', 'Avtorizatsiya talab qilinadi'));
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Faqat ko'rsatilgan rollar uchun ruxsat beradi.
 * Masalan: router.post('/', requireAuth, requireRole('teacher'), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'TOKEN_MISSING', 'Avtorizatsiya talab qilinadi'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Bu amal uchun ruxsat yo\'q'));
    }
    next();
  };
}

export default requireAuth;