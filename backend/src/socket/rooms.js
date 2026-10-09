import { query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { joinRoomSchema, socketProgressPayload } from '../schemas/rooms.js';
import {
  getRoom,
  setRoom,
  deleteRoom,
  markDirty,
  takeDirtyRooms,
  allRooms,
} from './roomStore.js';

const TICK_MS = 250;
const FINISHED_ROOM_TTL_MS = 5 * 60 * 1000;
let tickTimer = null;

const channel = (code) => `room:${code}`;

// ---------- Xatolarni standart formatga keltirish ----------

export function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err?.name === 'ZodError') {
    return new AppError(400, 'VALIDATION_ERROR', err.issues[0]?.message ?? "Ma'lumot noto'g'ri");
  }
  logger.error({ err }, 'Socket handler xatosi');
  return new AppError(500, 'INTERNAL_ERROR', 'Ichki server xatosi');
}

// Har bir event uchun: xato bo'lsa app:error yuboriladi, ack ham {ok:false, error} qaytaradi
export function wrapHandler(socket, event, fn) {
  socket.on(event, async (payload, ack) => {
    try {
      const result = await fn(socket, payload ?? {});
      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      const e = toAppError(err);
      const error = { code: e.code, message: e.message };
      socket.emit('app:error', { event, error });
      if (typeof ack === 'function') ack({ ok: false, error });
    }
  });
}

// Mehmon (deviceId) reytingli xonaga kira olmaydi
function requireUser(socket) {
  const user = socket.data.user;
  if (socket.data.guest || !user) {
    throw new AppError(403, 'GUEST_NOT_ALLOWED', "Xonaga faqat ro'yxatdan o'tgan foydalanuvchi kiradi");
  }
  return user;
}

// ---------- Xona holatini yuklash ----------

async function loadRoomFromDb(code) {
  const { rows } = await query(
    `SELECT r.id, r.host_id, r.code, r.game_type, r.status,
            r.duration_minutes, r.started_at, r.ended_at,
            c.data->>'text' AS target_text
       FROM game_rooms r
       LEFT JOIN contents c ON c.id = r.content_id
      WHERE r.code = $1`,
    [code]
  );
  const row = rows[0];
  if (!row) throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
  if (row.game_type !== 'typing') {
    throw new AppError(400, 'WRONG_GAME_TYPE', "Bu xona typing o'yini uchun emas");
  }

  const durationMs = row.duration_minutes * 60 * 1000;
  const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;

  const room = {
    gameType: 'typing',
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    status: row.status,
    durationMs,
    targetLength: row.target_text ? row.target_text.length : 0,
    startedAt,
    endsAt: startedAt ? startedAt + durationMs : null,
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    players: new Map(),
  };

  setRoom(room);
  await syncPlayers(room);
  return room;
}

// REST orqali qo'shilgan o'yinchilarni xotiraga qo'shadi
async function syncPlayers(room) {
  const { rows } = await query(
    `SELECT id, user_id, nickname, correct, finished
       FROM game_players
      WHERE room_id = $1 AND user_id IS NOT NULL AND kicked = false`,
    [room.id]
  );

  let added = false;
  for (const p of rows) {
    if (!room.players.has(p.user_id)) {
      room.players.set(p.user_id, {
        id: p.id,
        userId: p.user_id,
        nickname: p.nickname,
        correct: p.correct,
        finished: p.finished,
      });
      added = true;
    }
  }
  if (added) markDirty(room.code);
}

async function loadRoom(code) {
  let room = getRoom(code);
  if (!room) room = await loadRoomFromDb(code);
  if (room.gameType !== 'typing') {
    throw new AppError(400, 'WRONG_GAME_TYPE', "Bu xona typing o'yini uchun emas");
  }
  if (room.status === 'waiting') await syncPlayers(room);
  return room;
}

// Klientga yuboriladigan holat: userId lar yashirin, faqat ko'rinadigan ma'lumot
function snapshot(room) {
  return {
    code: room.code,
    status: room.status,
    startedAt: room.startedAt,
    endsAt: room.endsAt,
    targetLength: room.targetLength,
    players: [...room.players.values()]
      .filter((p) => !p.kicked)
      .map((p) => ({ id: p.id, nickname: p.nickname, correct: p.correct, finished: p.finished }))
      .sort((a, b) => b.correct - a.correct),
  };
}

// ---------- Event handlerlar ----------

export function registerRoomHandlers(socket) {
  // room:join: xonaning jonli kanaliga ulanish (faqat host yoki o'yinchi)
  wrapHandler(socket, 'room:join', async (s, payload) => {
    const user = requireUser(s);
    const { code } = joinRoomSchema.parse(payload);
    const room = await loadRoom(code);

    if (user.id !== room.hostId && !room.players.has(user.id)) {
      throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
    }

    if (room.players.get(user.id)?.kicked) throw new AppError(403, 'KICKED', "Siz bu xonadan chiqarilgansiz");
    s.join(channel(code));
    s.data.roomCode = code;
    s.emit('room:snapshot', snapshot(room));
    const me = room.players.get(user.id);
    return { joined: true, you: me ? { correct: me.correct, finished: me.finished } : null };
  });

  // room:start: faqat host boshlaydi
  wrapHandler(socket, 'room:start', async (s, payload) => {
    const user = requireUser(s);
    const { code } = joinRoomSchema.parse(payload);
    const room = await loadRoom(code);

    if (user.id !== room.hostId) {
      throw new AppError(403, 'FORBIDDEN', "Faqat o'qituvchi o'yinni boshlay oladi");
    }
    if (room.status !== 'waiting') {
      throw new AppError(409, 'ROOM_NOT_STARTABLE', "Xona allaqachon boshlangan yoki tugagan");
    }
    if (room.players.size === 0) {
      throw new AppError(409, 'NO_PLAYERS', "Kamida bitta o'yinchi kerak");
    }

    const startedAt = new Date();
    const endsAt = startedAt.getTime() + room.durationMs;

    // Avval baza, keyin xotira: baza yozilmasa, holat buzilmaydi
    await query(
      `UPDATE game_rooms SET status = 'active', started_at = $2 WHERE id = $1`,
      [room.id, startedAt]
    );

    room.status = 'active';
    room.startedAt = startedAt.getTime();
    room.endsAt = endsAt;
    markDirty(code);

    return { status: 'active' };
  });

  // room:progress: o'yinchining jonli natijasi (faqat ko'rsatish uchun)
  wrapHandler(socket, 'room:progress', async (s, payload) => {
    const user = requireUser(s);
    const { code, correct } = socketProgressPayload.parse(payload);
    const room = await loadRoom(code);

    if (room.status !== 'active') {
      throw new AppError(409, 'ROOM_NOT_ACTIVE', "O'yin hali boshlanmagan yoki tugagan");
    }

    const player = room.players.get(user.id);
    if (player?.kicked) throw new AppError(403, 'KICKED', "Siz bu xonadan chiqarilgansiz");
    if (!player) {
      throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
    }
    if (player.finished) {
      return { correct: player.correct, finished: true };
    }
    if (correct < player.correct) {
      throw new AppError(400, 'PROGRESS_DECREASED', "Natija kamayishi mumkin emas");
    }
    if (correct > room.targetLength) {
      throw new AppError(400, 'PROGRESS_OUT_OF_RANGE', "Natija matn uzunligidan katta");
    }

    player.correct = correct;
    if (room.targetLength > 0 && correct === room.targetLength) {
      player.finished = true;
      player.finishedAt = Date.now();
    }
    markDirty(code);

    return { correct: player.correct, finished: player.finished };
  });
}

// ---------- Tick: vaqt tugashi va snapshot broadcast ----------

async function finishRoom(room) {
  const endedAt = new Date();
  rankPlayers(room).forEach((p, i) => { p.rank = i + 1; });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE game_rooms SET status = 'finished', ended_at = $2 WHERE id = $1`,
      [room.id, endedAt]
    );
    for (const p of room.players.values()) {
      await client.query(
        `UPDATE game_players SET correct = $3, finished = $4, rank = $5
          WHERE room_id = $1 AND user_id = $2`,
        [room.id, p.userId, p.correct, p.finished, p.rank ?? null]
      );
    }
  });

  room.status = 'finished';
  room.endedAt = endedAt.getTime();
}

async function tick(io) {
  const now = Date.now();

  for (const room of allRooms()) {
    if (room.gameType !== 'typing') continue;
    if (room.status === 'active' && room.endsAt && now >= room.endsAt) {
      await closeTypingRoom(io, room);
      markDirty(room.code);
    } else if (room.status === 'finished' && room.endedAt && now - room.endedAt > FINISHED_ROOM_TTL_MS) {
      deleteRoom(room.code);
    }
  }

  for (const room of takeDirtyRooms()) {
    io.to(channel(room.code)).emit('room:snapshot', snapshot(room));
  }
}

export function startRoomTicker(io) {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    tick(io).catch((err) => logger.error({ err }, 'Tick xatosi'));
  }, TICK_MS);
}

export function stopRoomTicker() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}
function rankPlayers(room) {
  return [...room.players.values()].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished) return (a.finishedAt ?? 0) - (b.finishedAt ?? 0);
    return b.correct - a.correct;
  });
}

export async function closeTypingRoom(io, room) {
  if (room.status === 'finished') return;
  await finishRoom(room);
  io.to(channel(room.code)).emit('room:finished', {
    players: rankPlayers(room).map((p) => ({ nickname: p.nickname, correct: p.correct, finished: p.finished, rank: p.rank, kicked: p.kicked === true })),
  });
}
