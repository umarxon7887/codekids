import 'dotenv/config'; // ESM'da import'lar tartib bilan bajariladi, shuning uchun birinchi bo'lishi shart

import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { logger } from './logger.js';
import { query, closeDb } from './db.js';
import { helmetMiddleware, corsMiddleware, apiLimiter } from './middleware/security.js';
import authRouter from './routes/auth.js';
import { notFound, errorHandler } from './errors.js';
import contentsRouter from './routes/contents.js';
import typingRouter from './routes/typing.js';
import roomsRouter from './routes/rooms.js';
import teacherRouter from './routes/teacher.js';
import guestRouter from './routes/guest.js';
import { createSocketServer } from './socket/index.js';
import { stopRoomTicker } from './socket/rooms.js';

const PORT = Number(process.env.PORT) || 3000;
const API = '/api/v1';

const app = express();

// Render kabi proxy ortida ishlaganda haqiqiy IP ni olish uchun
// (rate limit to'g'ri ishlashi uchun)
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(API, (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(API, apiLimiter);

// Sog'liqni tekshirish: server va baza ishlayaptimi
app.get(`${API}/health`, async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', uptime: Math.round(process.uptime()) });
  } catch (err) {
    next(err);
  }
});
app.use(`${API}/auth`, authRouter);
app.use(`${API}/contents`, contentsRouter);
app.use(`${API}/typing`, typingRouter);
app.use(`${API}/guest`, guestRouter);
app.use(`${API}/rooms`, roomsRouter);
app.use(`${API}/teacher`, teacherRouter);
// Keyingi bosqichlarda bu yerga route'lar ulanadi:
// app.use(`${API}/auth`, authRouter);
// app.use(`${API}/contents`, contentsRouter);
// va hokazo

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const io = createSocketServer(server);

// Socket.io keyingi bosqichda shu yerga ulanadi (server, socket/index.js orqali)

server.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'CodeKids backend ishga tushdi');
});

// ---------- Graceful shutdown ----------

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "To'xtatish boshlandi");

  // Yangi ulanishlarni qabul qilmaymiz, mavjudlari tugashini kutamiz
    stopRoomTicker();
    io.close(async () => {
    try {
      await closeDb();
      logger.info("Baza ulanishi yopildi, server to'xtadi");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Yopishda xato');
      process.exit(1);
    }
  });

  // Agar 10 soniyada yopilmasa, majburan to'xtatamiz
  setTimeout(() => {
    logger.warn("Majburiy to'xtatish");
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Ushlanmagan promise xatosi');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Ushlanmagan xato, server to\'xtaydi');
  shutdown('uncaughtException');
});

export default app;