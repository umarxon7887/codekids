import { query } from '../db.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { generateMaze, toRows, exitCell, MOVES, mulberry32 } from '../utils/mazeGenerator.js';
import { joinRoomSchema, labyrinthMoveSchema, labyrinthAnswerSchema } from '../schemas/rooms.js';
import { getRoom, setRoom, deleteRoom } from './roomStore.js';
import { wrapHandler } from './rooms.js';

const START_LIVES = 3;
const MOVE_COOLDOWN_MS = 200;
const LOCK_MS = 5000;
const ANSWER_SCORE = 10;
const RANK_BONUS = [50, 30, 20];
const DEFAULT_BONUS = 10;
const MIN_QUESTIONS = 3;
const START = { x: 1, y: 1 };
const FINISHED_ROOM_TTL_MS = 5 * 60 * 1000;

const channel = (code) => `room:${code}`;
const cellKey = (x, y) => `${x},${y}`;

function requireUser(socket) {
  const user = socket.data.user;
  if (socket.data.guest || !user) {
    throw new AppError(403, 'GUEST_NOT_ALLOWED', "Xonaga faqat ro'yxatdan o'tgan foydalanuvchi kiradi");
  }
  return user;
}

// ---------- Deterministik yordamchilar ----------

function hashStr(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFor(text) {
  return mulberry32(hashStr(text));
}

function shuffle(items, rand) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start'dan finish'gacha asosiy yo'l katakchalari (BFS)
function mainPathKeys(grid, size) {
  const end = exitCell(size);
  const prev = new Map([[cellKey(START.x, START.y), null]]);
  const queue = [START];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === end.x && cur.y === end.y) break;

    for (const { dx, dy } of Object.values(MOVES)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = cellKey(nx, ny);
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (grid[ny][nx] === 1 || prev.has(k)) continue;
      prev.set(k, cellKey(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }

  const path = new Set();
  let k = cellKey(end.x, end.y);
  while (typeof k === 'string' && prev.has(k)) {
    path.add(k);
    k = prev.get(k);
  }
  return path;
}

// 6–12 checkpoint, yarmi asosiy yo'lda. Start va finish checkpoint emas.
function pickCheckpoints(grid, size, seed) {
  const count = Math.min(12, Math.max(6, Math.floor(size / 2)));
  const end = exitCell(size);
  const onPath = mainPathKeys(grid, size);

  const cells = [];
  for (let y = 1; y < size - 1; y += 2) {
    for (let x = 1; x < size - 1; x += 2) {
      if (grid[y][x] === 1) continue;
      if ((x === START.x && y === START.y) || (x === end.x && y === end.y)) continue;
      cells.push({ x, y });
    }
  }

  const rand = mulberry32(seed ^ 0x5bd1e995);
  const pathCells = shuffle(cells.filter((c) => onPath.has(cellKey(c.x, c.y))), rand);
  const offCells = shuffle(cells.filter((c) => !onPath.has(cellKey(c.x, c.y))), rand);

  const half = Math.ceil(count / 2);
  const chosen = [...pathCells.slice(0, half), ...offCells.slice(0, count - half)];
  const rest = [...pathCells.slice(half), ...offCells.slice(count - half)];
  while (chosen.length < count && rest.length > 0) chosen.push(rest.shift());

  return shuffle(chosen, rand);
}

function bonusFor(rank) {
  return RANK_BONUS[rank - 1] ?? DEFAULT_BONUS;
}

function isCleared(player, x, y) {
  return player.cleared.some((c) => c.x === x && c.y === y);
}

function isPendingShape(v) {
  return Boolean(v) && typeof v === 'object'
    && Number.isInteger(v.index) && Array.isArray(v.perm)
    && Number.isInteger(v.at?.x) && Number.isInteger(v.at?.y);
}

function questionView(room, pending) {
  const q = room.questions[pending.index];
  return {
    index: pending.index,
    text: q.text,
    options: pending.perm.map((i) => q.options[i]),
  };
}

// Savol berish: tartib va variantlar har o'yinchi uchun deterministik
function serveQuestion(room, player, at) {
  const index = player.qOrder[player.qPos % player.qOrder.length];
  const q = room.questions[index];
  const perm = shuffle([...q.options.keys()], rngFor(`${room.seed}:${player.id}:${player.qPos}`));
  player.qPos += 1;
  player.pendingQuestion = { index, perm, at };
  return questionView(room, player.pendingQuestion);
}

// ---------- Xonani yuklash ----------

async function loadLabyrinthRoom(code) {
  const { rows } = await query(
    `SELECT r.id, r.host_id, r.code, r.game_type, r.status, r.duration_minutes,
            r.started_at, r.ended_at, r.settings, c.data AS content_data
       FROM game_rooms r
       LEFT JOIN contents c ON c.id = r.content_id
      WHERE r.code = $1`,
    [code]
  );
  const row = rows[0];
  if (!row) throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
  if (row.game_type !== 'labyrinth') {
    throw new AppError(400, 'WRONG_GAME_TYPE', "Bu xona labirint o'yini uchun emas");
  }

  const questions = row.content_data?.questions ?? [];
  if (questions.length < MIN_QUESTIONS) {
    throw new AppError(500, 'ROOM_MISCONFIGURED', "Xonada kamida 3 ta savol bo'lishi kerak");
  }

  const size = row.settings.rows;
  const seed = row.settings.labyrinth_seed;
  const grid = generateMaze(seed, size);
  const checkpoints = pickCheckpoints(grid, size, seed);

  const { rows: fin } = await query(
    'SELECT count(*)::int AS n FROM game_players WHERE room_id = $1 AND finished = true AND lives > 0',
    [row.id]
  );

  const durationMs = row.duration_minutes * 60 * 1000;
  const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;

  return {
    gameType: 'labyrinth',
    mode: row.settings.mode === 'kids' ? 'kids' : 'standard',
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    status: row.status,
    size,
    seed,
    grid,
    rows: toRows(grid),
    questions,
    checkpoints,
    checkpointKeys: new Set(checkpoints.map((c) => cellKey(c.x, c.y))),
    finishCount: fin[0].n,
    durationMs,
    startedAt,
    endsAt: startedAt ? startedAt + durationMs : null,
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
    endTimer: null,
    players: new Map(),
  };
}

async function getRoomOrLoad(code) {
  let room = getRoom(code);
  if (!room) {
    const loaded = await loadLabyrinthRoom(code);
    room = getRoom(code) ?? loaded;
    setRoom(room);
  }
  if (room.gameType !== 'labyrinth') {
    throw new AppError(400, 'WRONG_GAME_TYPE', "Bu xona labirint o'yini uchun emas");
  }
  return room;
}

// REST orqali qo'shilgan yoki qayta ulangan o'yinchini bazadan tiklash
async function ensurePlayer(room, userId) {
  const known = room.players.get(userId);
  if (known?.kicked) throw new AppError(403, 'KICKED', "Siz bu xonadan chiqarilgansiz");
  if (known) return known;

  const { rows } = await query(
    `SELECT id, nickname, lives, score, finished, position_x, position_y, state, kicked
       FROM game_players WHERE room_id = $1 AND user_id = $2`,
    [room.id, userId]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.kicked) throw new AppError(403, 'KICKED', "Siz bu xonadan chiqarilgansiz");

  const saved = row.state ?? {};
  const player = {
    id: row.id,
    userId,
    nickname: row.nickname,
    x: row.position_x ?? START.x,
    y: row.position_y ?? START.y,
    lives: room.mode === 'kids' ? null : (row.lives ?? START_LIVES),
    score: row.score,
    finished: row.finished,
    eliminated: row.lives === 0,
    rank: saved.rank ?? null,
    cleared: Array.isArray(saved.cleared) ? saved.cleared : [],
    pendingQuestion: isPendingShape(saved.pendingQuestion) ? saved.pendingQuestion : null,
    qPos: Number.isInteger(saved.qPos) ? saved.qPos : 0,
    qOrder: shuffle([...room.questions.keys()], rngFor(`${room.seed}:${row.id}:order`)),
    lockedUntil: saved.lockedUntil ?? null,
    lastMoveAt: 0,
  };
  room.players.set(userId, player);
  return player;
}

async function savePlayer(room, p) {
  await query(
    `UPDATE game_players
        SET position_x = $3, position_y = $4, lives = $5, score = $6, finished = $7, state = $8
      WHERE room_id = $1 AND user_id = $2`,
    [
      room.id,
      p.userId,
      p.x,
      p.y,
      p.lives,
      p.score,
      p.finished,
      JSON.stringify({
        cleared: p.cleared,
        pendingQuestion: p.pendingQuestion,
        qPos: p.qPos,
        rank: p.rank,
        lockedUntil: p.lockedUntil,
      }),
    ]
  );
}

// ---------- Klientga yuboriladigan shakllar ----------

function publicPlayers(room) {
  return [...room.players.values()]
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      x: p.x,
      y: p.y,
      lives: p.lives,
      score: p.score,
      finished: p.finished,
      eliminated: p.eliminated,
      rank: p.rank,
      kicked: p.kicked === true,
    }))
    .sort((a, b) => b.score - a.score);
}

function playerView(room, p) {
  return {
    id: p.id,
    cleared: p.cleared,
    x: p.x,
    y: p.y,
    lives: p.lives,
    score: p.score,
    finished: p.finished,
    eliminated: p.eliminated,
    rank: p.rank,
    question: p.pendingQuestion ? questionView(room, p.pendingQuestion) : null,
    lockedUntil: p.lockedUntil,
  };
}

export function broadcast(io, room) {
  io.to(channel(room.code)).emit('labyrinth:update', {
    status: room.status,
    endsAt: room.endsAt,
    serverNow: Date.now(),
    players: publicPlayers(room),
  });
}

// Ack avval ketishi uchun broadcast keyingi tsiklga qoldiriladi
function broadcastLater(io, room) {
  setImmediate(() => broadcast(io, room));
}

// ---------- Tugatish va taymer ----------

export async function finishRoom(io, room) {
  if (room.status === 'finished') return;
  room.status = 'finished';
  room.endedAt = Date.now();
  if (room.endTimer) clearTimeout(room.endTimer);

  await query(
    `UPDATE game_rooms SET status = 'finished', ended_at = $2 WHERE id = $1`,
    [room.id, new Date(room.endedAt)]
  );
  for (const p of room.players.values()) {
    await savePlayer(room, p);
  }

  broadcast(io, room);
  io.to(channel(room.code)).emit('labyrinth:finished', { players: publicPlayers(room) });
  setTimeout(() => deleteRoom(room.code), FINISHED_ROOM_TTL_MS).unref();
}

function scheduleEnd(io, room) {
  if (room.endTimer) clearTimeout(room.endTimer);
  const delay = Math.max(room.endsAt - Date.now(), 0);
  room.endTimer = setTimeout(() => {
    finishRoom(io, room).catch((err) => logger.error({ err }, 'Labirint tugatishda xato'));
  }, delay);
}

// ---------- Event handlerlar ----------

export function registerLabyrinthHandlers(socket) {
  const io = socket.nsp.server;

  wrapHandler(socket, 'labyrinth:join', async (s, payload) => {
    const user = requireUser(s);
    const { code } = joinRoomSchema.parse(payload);
    const room = await getRoomOrLoad(code);

    if (room.status === 'finished') {
      throw new AppError(409, 'ROOM_FINISHED', "O'yin tugagan");
    }

    let player = null;
    if (user.id !== room.hostId) {
      player = await ensurePlayer(room, user.id);
      if (!player) {
        throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
      }
    }

    if (room.status === 'active' && !room.endTimer) scheduleEnd(io, room);

    s.join(channel(code));
    s.data.labyrinthCode = code;

    s.emit('labyrinth:init', {
      grid: room.rows,
      size: room.size,
      start: START,
      exit: exitCell(room.size),
      checkpoints: room.checkpoints,
      mode: room.mode,
      status: room.status,
      endsAt: room.endsAt,
      serverNow: Date.now(),
      you: player ? playerView(room, player) : null,
      players: publicPlayers(room),
    });

    return { joined: true, playerId: player ? player.id : null };
  });

  wrapHandler(socket, 'labyrinth:start', async (s, payload) => {
    const user = requireUser(s);
    const { code } = joinRoomSchema.parse(payload);
    const room = await getRoomOrLoad(code);

    if (user.id !== room.hostId) {
      throw new AppError(403, 'FORBIDDEN', "Faqat o'qituvchi o'yinni boshlay oladi");
    }
    if (room.status !== 'waiting') {
      throw new AppError(409, 'ROOM_NOT_STARTABLE', "Xona allaqachon boshlangan yoki tugagan");
    }
    const { rows: cnt } = await query(
      'SELECT count(*)::int AS n FROM game_players WHERE room_id = $1',
      [room.id]
    );
    if (cnt[0].n === 0) {
      throw new AppError(409, 'NO_PLAYERS', "Kamida bitta o'yinchi kerak");
    }

    const startedAt = new Date();
    await query(
      `UPDATE game_rooms SET status = 'active', started_at = $2 WHERE id = $1`,
      [room.id, startedAt]
    );

    room.status = 'active';
    room.startedAt = startedAt.getTime();
    room.endsAt = room.startedAt + room.durationMs;
    scheduleEnd(io, room);
    broadcastLater(io, room);

    return { status: 'active', endsAt: room.endsAt };
  });

  wrapHandler(socket, 'labyrinth:move', async (s, payload) => {
    const user = requireUser(s);
    const { code, direction } = labyrinthMoveSchema.parse(payload);
    const room = await getRoomOrLoad(code);

    if (room.status !== 'active') {
      throw new AppError(409, 'ROOM_NOT_ACTIVE', "O'yin hali boshlanmagan yoki tugagan");
    }
    if (Date.now() >= room.endsAt) {
      await finishRoom(io, room);
      throw new AppError(409, 'ROOM_FINISHED', "O'yin vaqti tugagan");
    }

    const player = await ensurePlayer(room, user.id);
    if (!player) {
      throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
    }
    if (player.finished) {
      throw new AppError(409, 'PLAYER_FINISHED', "Siz allaqachon o'yinni tugatgansiz");
    }

    const now = Date.now();
    if (player.lockedUntil && now >= player.lockedUntil) player.lockedUntil = null;
    if (player.lockedUntil) {
      throw new AppError(409, 'LOCKED', "Hozir harakat qilish mumkin emas, biroz kuting");
    }
    if (now - player.lastMoveAt < MOVE_COOLDOWN_MS) {
      throw new AppError(429, 'TOO_FAST', 'Juda tez harakat qilyapsiz');
    }
    if (player.pendingQuestion) {
      throw new AppError(409, 'QUESTION_PENDING', 'Avval savolga javob bering');
    }

    const mv = MOVES[direction];
    const nx = player.x + mv.dx;
    const ny = player.y + mv.dy;
    if (nx < 0 || ny < 0 || nx >= room.size || ny >= room.size || room.grid[ny][nx] === 1) {
      throw new AppError(400, 'BLOCKED', "Bu yo'nalishda devor bor");
    }

    player.x = nx;
    player.y = ny;
    player.lastMoveAt = now;

    let question = null;
    const ex = exitCell(room.size);

    if (nx === ex.x && ny === ex.y) {
      room.finishCount += 1;
      player.rank = room.finishCount;
      player.finished = true;
      player.score += bonusFor(player.rank);
    } else if (room.checkpointKeys.has(cellKey(nx, ny)) && !isCleared(player, nx, ny)) {
      question = serveQuestion(room, player, { x: nx, y: ny });
    }

    await savePlayer(room, player);
    broadcastLater(io, room);
    return { x: nx, y: ny, finished: player.finished, question };
  });

  wrapHandler(socket, 'labyrinth:answer', async (s, payload) => {
    const user = requireUser(s);
    const { code, choice } = labyrinthAnswerSchema.parse(payload);
    const room = await getRoomOrLoad(code);

    if (room.status !== 'active') {
      throw new AppError(409, 'ROOM_NOT_ACTIVE', "O'yin faol emas");
    }

    const player = await ensurePlayer(room, user.id);
    if (!player) {
      throw new AppError(403, 'NOT_A_PARTICIPANT', "Bu xonaga qo'shilmagansiz");
    }

    const pending = player.pendingQuestion;
    if (!pending) {
      throw new AppError(409, 'NO_PENDING_QUESTION', "Javob kutilayotgan savol yo'q");
    }
    if (choice >= pending.perm.length) {
      throw new AppError(400, 'INVALID_CHOICE', "Variant noto'g'ri");
    }

    const q = room.questions[pending.index];
    const correct = pending.perm[choice] === q.answer;
    const correctIndex = pending.perm.indexOf(q.answer);
    player.pendingQuestion = null;
    const now = Date.now();

    if (correct) {
      player.score += ANSWER_SCORE;
      if (!isCleared(player, pending.at.x, pending.at.y)) {
        player.cleared.push(pending.at);
      }
    } else {
      if (room.mode !== 'kids') player.lives -= 1;
      if (room.mode !== 'kids' && player.lives <= 0) {
        player.lives = 0;
        player.finished = true;
        player.eliminated = true;
        player.lockedUntil = null;
      } else {
        const back = player.cleared.length > 0 ? player.cleared[player.cleared.length - 1] : START;
        player.x = back.x;
        player.y = back.y;
        player.lockedUntil = now + LOCK_MS;
      }
    }

    await savePlayer(room, player);
    broadcastLater(io, room);

    return {
      correct,
      correctIndex,
      lives: player.lives,
      score: player.score,
      finished: player.finished,
      eliminated: player.eliminated,
      x: player.x,
      y: player.y,
      lockedUntil: player.lockedUntil,
    };
  });
}
