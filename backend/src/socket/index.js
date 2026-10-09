import { Server } from 'socket.io';
import { logger } from '../logger.js';
import { verifyAccessToken } from '../services/tokens.js';
import { registerRoomHandlers, startRoomTicker, stopRoomTicker } from './rooms.js';
import { registerLabyrinthHandlers } from './labyrinth.js';
import { setIo } from './bus.js';

const EVENTS_PER_SECOND = 15;
const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    maxHttpBufferSize: 100 * 1024,
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  // Auth: token (ro'yxatdan o'tgan) yoki deviceId (mehmon, faqat solo rejim uchun)
  io.use((socket, next) => {
    const auth = socket.handshake.auth ?? {};

    if (typeof auth.token === 'string' && auth.token.length > 0) {
      try {
        socket.data.user = verifyAccessToken(auth.token);
        return next();
      } catch (err) {
        return next(new Error(err.code ?? 'TOKEN_INVALID'));
      }
    }

    if (auth.guest === true && typeof auth.deviceId === 'string' && DEVICE_ID_RE.test(auth.deviceId)) {
      socket.data.guest = { deviceId: auth.deviceId };
      return next();
    }

    return next(new Error('AUTH_REQUIRED'));
  });

  io.on('connection', (socket) => {
    if (socket.data.user) socket.join(`user:${socket.data.user.id}`);
    // Throttling: sekundiga EVENTS_PER_SECOND tadan ortig'i tashlab yuboriladi
    let windowStart = Date.now();
    let count = 0;

    socket.use((packet, next) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        count = 0;
      }
      count += 1;

      if (count > EVENTS_PER_SECOND) {
        socket.emit('app:error', {
          error: { code: 'RATE_LIMITED', message: "Juda ko'p hodisa yuborildi" },
        });
        return; // next() chaqirilmaydi: paket qayta ishlanmaydi
      }
      next();
    });

    registerRoomHandlers(socket);
    registerLabyrinthHandlers(socket);

    logger.debug({ socketId: socket.id, guest: Boolean(socket.data.guest) }, 'Socket ulandi');
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket uzildi');
    });
  });

  setIo(io);
  startRoomTicker(io);
  return io;
}

export async function closeSocketServer(io) {
  stopRoomTicker();
  await io.close();
}