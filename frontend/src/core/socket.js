/**
 * @file Socket.io wrapper. Foydalanuvchi: auth {token}; mehmon: auth {guest:true, deviceId}.
 * Token har reconnect'da funksiya orqali yangidan olinadi; eskirsa refresh qilinadi.
 */
import { io } from 'socket.io-client';
import { BACKEND_URL } from './config.js';
import { getAccessToken, getDeviceId } from './state.js';
import { refreshAccessToken } from './api.js';
import { toast } from './toast.js';

/** @type {import('socket.io-client').Socket|null} */
let socket = null;
let socketKind = null;
let authRetries = 0;

/**
 * @param {{guest?:boolean}} [opts]
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket({ guest = false } = {}) {
  const kind = guest ? 'guest' : 'user';
  if (socket && socketKind === kind) return socket;
  disconnectSocket();
  socketKind = kind;

  socket = io(BACKEND_URL, {
    auth: (cb) => cb(guest ? { guest: true, deviceId: getDeviceId() } : { token: getAccessToken() }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
  });
  const s = socket;

  s.on('connect', () => { authRetries = 0; });
  s.on('connect_error', async (err) => {
    const code = String(err?.data?.code || err?.message || '');
    if (!guest && /TOKEN_EXPIRED|TOKEN_INVALID|AUTH_REQUIRED|TOKEN_MISSING/.test(code) && authRetries < 2) {
      authRetries += 1;
      try { await refreshAccessToken(); s.connect(); } catch { /* auth:expired yuborildi */ }
    }
  });
  s.io.on('reconnect', () => toast('Ulanish tiklandi', 'success'));
  s.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') toast('Aloqa uzildi, qayta ulanmoqda...', 'info');
  });
  return s;
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  socketKind = null;
}

/**
 * Ack kutadigan emit. `{ok:false,error}` bo'lsa `code` bilan Error tashlaydi.
 * @param {string} event @param {any} [payload] @param {number} [timeoutMs]
 * @returns {Promise<any>}
 */
export function emitAck(event, payload, timeoutMs = 8000, { queue = true } = {}) {
  const s = connectSocket();
  if (!queue && !s.connected) return Promise.reject(Object.assign(new Error("Aloqa yo'q"), { code: 'OFFLINE' }));
  return new Promise((resolve, reject) => {
    s.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return reject(Object.assign(new Error('Server javob bermadi'), { code: 'NETWORK_ERROR' }));
      if (res && res.ok === false) {
        const e = res.error || {};
        return reject(Object.assign(new Error(e.message || 'Xato'), { code: e.code }));
      }
      resolve(res);
    });
  });
}
