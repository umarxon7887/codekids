// Lokal sinov serveri (backend shartnomasiga mos): node mock-server/server.js -> http://localhost:3000
// REST: /api/v1/auth/login|refresh, /api/v1/rooms/join (soxta, har qanday email/parol qabul qilinadi; "teacher..." bilan boshlansa o'qituvchi)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { LabyrinthRoom, bfsPath, dirOf, QUESTIONS } from './core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const room = new LabyrinthRoom({ code: process.env.CODE ?? '1234', size: Number(process.env.SIZE ?? 11), mode: process.env.MODE ?? 'standard', durationMs: Number(process.env.MINUTES ?? 10) * 60000 });
const jerr = (res, status, code, message) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { code, message } })); };
const json = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
const userFor = (email) => ({ id: email, email, role: email.startsWith('teacher') ? 'teacher' : 'student', nickname: email.split('@')[0] });
const tokenFor = (email) => `mock.${Buffer.from(email).toString('base64url')}`;
const emailFrom = (token) => (token?.startsWith('mock.') ? Buffer.from(token.slice(5), 'base64url').toString() : null);
const readBody = (req) => new Promise((r) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/v1/')) {
    const body = await readBody(req), route = `${req.method} ${url.slice(7)}`;
    if (route === 'POST /auth/login') {
      if (!body.email || !body.password) return jerr(res, 400, 'VALIDATION_ERROR', 'email va parol kerak');
      return json(res, 200, { accessToken: tokenFor(body.email), user: userFor(body.email) }, { 'Set-Cookie': `rt=${encodeURIComponent(body.email)}; HttpOnly; Path=/api/v1/auth; SameSite=Lax` });
    }
    if (route === 'POST /auth/refresh') {
      const email = /(?:^|; )rt=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
      return email ? json(res, 200, { accessToken: tokenFor(decodeURIComponent(email)) }) : jerr(res, 401, 'TOKEN_MISSING', 'Refresh cookie yo\'q');
    }
    if (route === 'POST /rooms/join') {
      if (!emailFrom(req.headers.authorization?.replace('Bearer ', ''))) return jerr(res, 401, 'TOKEN_INVALID', 'Token yaroqsiz');
      return body.code === room.code ? json(res, 200, { room: { code: room.code, game_type: 'labyrinth' } }) : jerr(res, 404, 'NOT_FOUND', 'Xona topilmadi'); // javob shakli faraz
    }
    return jerr(res, 404, 'NOT_FOUND', 'Endpoint yo\'q');
  }
  const rel = url === '/' ? '/demo/index.html' : url, file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});

const io = new Server(server);
const broadcast = () => io.to('room').emit('labyrinth:update', room.update(Date.now()));
const fail = (code, message) => ({ ok: false, error: { code, message } });
const authFail = (code) => Object.assign(new Error(code), { data: { code } });

io.use((socket, next) => { // io(URL, { auth: { token } }); mehmon: { guest:true, deviceId }
  const a = socket.handshake.auth ?? {};
  if (a.guest) { socket.data.guest = true; return next(); }
  if (!a.token) return next(authFail('AUTH_REQUIRED'));
  const email = emailFrom(a.token); if (!email) return next(authFail('TOKEN_INVALID'));
  Object.assign(socket.data, { user: userFor(email) }); next();
});

let started = false, auto = false;
function begin() { // host `labyrinth:start` yoki (o'qituvchi bo'lmasa) avtomatik
  if (started) return; started = true; room.start(Date.now()); broadcast(); startBots();
  setTimeout(() => { room.finishRoom(); io.to('room').emit('labyrinth:finished', { players: room.playersPublic() }); broadcast(); }, room.durationMs);
}

io.on('connection', (socket) => {
  const guard = (ack, host) => {
    if (socket.data.guest) return ack?.(fail('GUEST_NOT_ALLOWED', 'Mehmon o\'ynay olmaydi')), null;
    if (host ? socket.data.user.role !== 'teacher' : !socket.data.p) return ack?.(fail(host ? 'FORBIDDEN' : 'NOT_A_PARTICIPANT', host ? 'Faqat host' : 'Avval xonaga qo\'shiling')), null;
    return true;
  };
  socket.on('labyrinth:join', (d, ack) => {
    if (socket.data.guest) return ack?.(fail('GUEST_NOT_ALLOWED', 'Mehmon o\'ynay olmaydi'));
    if (d?.code !== room.code) return ack?.(fail('NOT_A_PARTICIPANT', 'Xona topilmadi'));
    socket.join('room');
    if (socket.data.user.role === 'teacher') { ack?.({ ok: true, joined: true, playerId: null }); return socket.emit('labyrinth:init', room.init(null, Date.now())); } // host: you = null
    const p = room.join(socket.data.user.id, socket.data.user.nickname); socket.data.p = p;
    ack?.({ ok: true, joined: true, playerId: p.id }); socket.emit('labyrinth:init', room.init(p, Date.now())); broadcast();
    if (!auto && !process.env.MANUAL_START) { auto = true; setTimeout(begin, 4000); } // faqat mock: host bo'lmasa 4 soniyadan keyin boshlanadi
  });
  socket.on('labyrinth:start', (d, ack) => {
    if (!guard(ack, true)) return;
    if (started) return ack?.(fail('ROOM_NOT_STARTABLE', 'Allaqachon boshlangan'));
    begin(); ack?.({ ok: true, status: 'active', endsAt: room.endsAt });
  });
  socket.on('labyrinth:move', (d, ack) => { if (!guard(ack)) return; const r = room.move(socket.data.p, d?.direction, Date.now()); ack?.(r); if (r.ok) broadcast(); });
  socket.on('labyrinth:answer', (d, ack) => { if (!guard(ack)) return; const r = room.answer(socket.data.p, d?.choice, Date.now()); ack?.(r); if (r.ok) broadcast(); });
});

function startBots() { // ko'p o'yinchi ko'rinishi uchun 2 ta bot
  for (const [i, skill] of [[1, 0.8], [2, 0.5]]) {
    const bot = room.join(`bot${i}`, `Bot ${i}`), timer = setInterval(() => {
      if (room.status !== 'active' || bot.finished) return clearInterval(timer);
      if (bot.pending) { const { qi, order } = bot.pending, right = order.indexOf(QUESTIONS[qi].answer); room.answer(bot, Math.random() < skill ? right : (right + 1) % order.length, Date.now()); return broadcast(); }
      const next = bfsPath(room.maze.grid, bot, room.maze.exit)[0]; if (!next) return;
      room.move(bot, dirOf(bot, next), Date.now()); broadcast();
    }, 420 + i * 90);
  }
}
server.listen(process.env.PORT ?? 3000, () => console.log(`Labirint mock: http://localhost:${process.env.PORT ?? 3000}  (xona: ${room.code}, rejim: ${room.mode})`));
