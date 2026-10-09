import crypto from 'node:crypto';
import { query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';

// 0, O, 1, I belgilari chiqarilgan: bolalar kodni o'qiganda adashmasligi uchun
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 5;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const LABYRINTH_START_LIVES = 3;

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// Xona ma'lumotini tashqariga chiqarish: settings faqat host'ga ko'rinadi
export function publicRoom(room, { includeSettings = false } = {}) {
  const out = {
    id: room.id,
    code: room.code,
    game_type: room.game_type,
    content_id: room.content_id ?? null,
    topic: room.topic ?? null,
    level: room.level ?? null,
    status: room.status,
    max_players: room.max_players,
    duration_minutes: room.duration_minutes,
    expires_at: room.expires_at,
  };
  if (includeSettings) out.settings = room.settings;
  return out;
}

export async function createRoom(hostId, data) {
  if (data.content_id) {
    const { rows } = await query(
      `SELECT type, data FROM contents
        WHERE id = $1 AND is_published = true AND deleted_at IS NULL`,
      [data.content_id]
    );
    if (!rows[0]) {
      throw new AppError(404, 'CONTENT_NOT_FOUND', 'Kontent topilmadi yoki nashr etilmagan');
    }
        const expected = data.game_type === 'typing' ? 'typing_text' : 'questions';
    if (data.game_type === 'labyrinth' && rows[0].type === 'questions' && (rows[0].data?.questions?.length ?? 0) < 3) {
      throw new AppError(400, 'TOO_FEW_QUESTIONS', "Labirint uchun kamida 3 ta savol kerak");
    }
    if (rows[0].type !== expected) {
      throw new AppError(400, 'CONTENT_TYPE_MISMATCH', "Kontent turi o'yinga mos emas");
    }
  }

  // Labirint seed'i serverda yaratiladi, frontend uni tanlay olmaydi
  const settings =
    data.game_type === 'labyrinth'
      ? {
          labyrinth_seed: crypto.randomInt(1, 2_147_483_647),
          rows: data.labyrinth.size,
          cols: data.labyrinth.size,
          mode: data.mode === 'kids' ? 'kids' : 'standard',
        }
      : {};

  const expiresAt = new Date(Date.now() + ROOM_TTL_MS);

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    try {
      const { rows } = await query(
        `INSERT INTO game_rooms
           (host_id, code, game_type, content_id, topic, level,
            max_players, duration_minutes, settings, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, code, game_type, content_id, topic, level, status,
                   max_players, duration_minutes, settings, expires_at`,
        [
          hostId,
          generateRoomCode(),
          data.game_type,
          data.content_id ?? null,
          data.topic ?? null,
          data.level,
          data.max_players,
          data.duration_minutes,
          JSON.stringify(settings),
          expiresAt,
        ]
      );
      return rows[0];
    } catch (err) {
      // 23505: kod bandligi, qayta urinib ko'ramiz
      if (err.code !== '23505') throw err;
    }
  }

  throw new AppError(503, 'CODE_GENERATION_FAILED', 'Xona kodini yaratib bo\'lmadi, qayta urining');
}

// Xonaga qo'shilish. FOR UPDATE: bir vaqtda kelgan so'rovlar max_players'ni buzmaydi
export async function joinRoom(userId, code) {
  return withTransaction(async (client) => {
    const { rows: roomRows } = await client.query(
      `SELECT id, host_id, code, game_type, content_id, topic, level, status,
              max_players, duration_minutes, expires_at
         FROM game_rooms
        WHERE code = $1
          FOR UPDATE`,
      [code]
    );
    const room = roomRows[0];
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
    }
    if (room.host_id === userId) {
      throw new AppError(400, 'HOST_CANNOT_JOIN', "O'qituvchi o'z xonasiga o'yinchi sifatida kira olmaydi");
    }

    // Allaqachon qo'shilgan bo'lsa (qayta ulanish), xona holatidan qat'i nazar qaytaramiz
    const { rows: existing } = await client.query(
      `SELECT id, nickname, score, correct, lives, finished, kicked
         FROM game_players
        WHERE room_id = $1 AND user_id = $2`,
      [room.id, userId]
    );
    if (existing[0]) {
      if (existing[0].kicked) throw new AppError(403, 'KICKED', "Siz bu xonadan chiqarilgansiz");
      return { room, player: existing[0], joined: false };
    }

    if (new Date(room.expires_at) <= new Date()) {
      throw new AppError(410, 'ROOM_EXPIRED', 'Xona muddati tugagan');
    }
    if (room.status === 'finished') {
      throw new AppError(409, 'ROOM_CLOSED', 'Xona yopilgan');
    }
    if (room.status !== 'waiting') {
      throw new AppError(409, 'ROOM_NOT_JOINABLE', "Xona allaqachon boshlangan yoki yopilgan");
    }

    const { rows: countRows } = await client.query(
      'SELECT count(*)::int AS n FROM game_players WHERE room_id = $1',
      [room.id]
    );
    if (countRows[0].n >= room.max_players) {
      throw new AppError(409, 'ROOM_FULL', "Xona to'lgan");
    }

    const { rows: userRows } = await client.query(
      'SELECT nickname FROM users WHERE id = $1',
      [userId]
    );

    const isLabyrinth = room.game_type === 'labyrinth';
    const { rows: playerRows } = await client.query(
      `INSERT INTO game_players (room_id, user_id, nickname, lives)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nickname, score, correct, lives, finished`,
      [room.id, userId, userRows[0].nickname, isLabyrinth ? LABYRINTH_START_LIVES : null]
    );

    return { room, player: playerRows[0], joined: true };
  });
}

// Xonani olish. Host har qanday xonani ko'radi, o'yinchi faqat o'z xonasini
export async function getRoomForUser(code, userId) {
  const { rows } = await query('SELECT * FROM game_rooms WHERE code = $1', [code]);
  const room = rows[0];
  if (!room) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
  }

  const isHost = room.host_id === userId;
  if (!isHost) {
    const { rows: p } = await query(
      'SELECT 1 FROM game_players WHERE room_id = $1 AND user_id = $2 AND kicked = false',
      [room.id, userId]
    );
    if (!p[0]) {
      throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
    }
  }

  return { room, isHost };
}

export async function listPlayers(roomId) {
  const { rows } = await query(
    `SELECT id, nickname, score, correct, lives, finished, joined_at
       FROM game_players
      WHERE room_id = $1 AND kicked = false
      ORDER BY joined_at`,
    [roomId]
  );
  return rows;
}