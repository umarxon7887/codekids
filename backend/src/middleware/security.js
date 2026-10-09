import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...corsOrigins, 'wss:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Origin yo'q bo'lsa (curl, mobil ilova, server-to-server) ruxsat beramiz
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true, // refresh token cookie uchun shart
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const jsonLimitHandler = (req, res) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: "Juda ko'p so'rov yuborildi, keyinroq urinib ko'ring",
    },
  });
};

// Umumiy API uchun
export const apiLimiter = rateLimit({
  windowMs,
  limit: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonLimitHandler,
});

// Login/register uchun qattiqroq: brute-force'dan himoya
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonLimitHandler,
});