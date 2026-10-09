import { query } from '../db.js';
import { AppError } from '../errors.js';
import { getRoom, markDirty } from './roomStore.js';
import { getIo } from './bus.js';
import { finishRoom as finishLabyrinth, broadcast as broadcastLabyrinth } from './labyrinth.js';
import { closeTypingRoom } from './rooms.js';

const channel = (code) => `room:${code}`;

// Xonani yopish (faqat host): o'yin tugaydi, natijalar saqlanadi, hammaga xabar boradi
export async function closeRoom(code, hostId) {
  const { rows } = await query(
    'SELECT id, host_id, game_type, status FROM game_rooms WHERE code = $1',
    [code]
  );
  const row = rows[0];
  if (!row) throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi');
  if (row.host_id !== hostId) throw new AppError(403, 'FORBIDDEN', "Faqat o'qituvchi xonani yopa oladi");
  if (row.status === 'finished') throw new AppError(409, 'ROOM_CLOSED', 'Xona allaqachon yopilgan');

  const io = getIo();
  const mem = getRoom(code);

  if (mem?.gameType === 'labyrinth') {
    await finishLabyrinth(io, mem);
  } else if (mem) {
    await closeTypingRoom(io, mem);
  } else {
    // Xona xotirada yo'q (server qayta ishga tushgan): faqat holatni yopamiz
    await query("UPDATE game_rooms SET status = 'finished', ended_at = now() WHERE id = $1", [row.id]);
    const evt = row.game_type === 'labyrinth' ? 'labyrinth:finished' : 'room:finished';
    io.to(channel(code)).emit(evt, { players: [] });
  }
  return { closed: true };
}

// O'yinchini chiqarish (faqat host): qayta kira olmaydi, jonli kanaldan chiqariladi
export async function kickPlayer(code, hostId, playerRowId) {
  const { rows } = await query(
    `SELECT gp.user_id, r.host_id, r.status
       FROM game_players gp
       JOIN game_rooms r ON r.id = gp.room_id
      WHERE gp.id = $1 AND r.code = $2`,
    [playerRowId, code]
  );
  const row = rows[0];
  if (!row) throw new AppError(404, 'PLAYER_NOT_FOUND', "O'yinchi topilmadi");
  if (row.host_id !== hostId) throw new AppError(403, 'FORBIDDEN', "Faqat o'qituvchi chiqara oladi");
  if (row.status === 'finished') throw new AppError(409, 'ROOM_CLOSED', 'Xona yopilgan');

  await query('UPDATE game_players SET kicked = true WHERE id = $1', [playerRowId]);

  const io = getIo();
  const userRoom = `user:${row.user_id}`;
  io.to(userRoom).emit('kicked', { code });
  io.in(userRoom).socketsLeave(channel(code));

  const mem = getRoom(code);
  if (mem) {
    const mp = mem.players.get(row.user_id);
    if (mp) mp.kicked = true;
    if (mem.gameType === 'labyrinth') broadcastLabyrinth(io, mem);
    else markDirty(code);
  }
  return { kicked: true };
}
