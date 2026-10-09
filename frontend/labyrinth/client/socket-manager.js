import { AUTH_ERRORS, ERR, EVENTS } from './constants.js';
import { Emitter } from './emitter.js';

/**
 * Chiqadigan eventlar: 'connection' | 'joined' | 'init' | 'update' | 'finished' | 'error'
 * Autentifikatsiya: `io(url, { auth: (cb) => cb({ token }) })` — funksiya HAR ulanishda (reconnect ham) chaqiriladi,
 * shuning uchun muddati o'tgan token avtomatik yangilanadi (getToken = ApiClient.getToken).
 * Xatolar ACK ichida ({ok:false,error:{code}}) keladi; `app:error` e'tiborsiz (xabar ikki marta chiqmasligi uchun).
 */
export class SocketManager extends Emitter {
  #s; #busy = false; #lastAt = -Infinity; #authFails = 0;

  constructor({ io, url, code, getToken, onAuthError, moveIntervalMs = 200, ackTimeoutMs = 5000 }) {
    super();
    this.code = code; this.cooldown = moveIntervalMs; this.ackTimeoutMs = ackTimeoutMs; this.playerId = null;
    this.#s = io(url, {
      transports: ['websocket'],
      auth: (cb) => Promise.resolve(getToken()).then((token) => cb({ token })).catch(() => cb({})),
      reconnection: true, reconnectionDelay: 400, reconnectionDelayMax: 5000, randomizationFactor: 0.5,
    });
    const s = this.#s;
    s.on('connect', () => { this.#authFails = 0; this.emit('connection', { status: 'online' }); this.join(); }); // kutish zalidagi o'quvchi ham shu bilan kanalga qo'shiladi
    s.on('disconnect', (reason) => { this.#busy = false; this.emit('connection', { status: 'offline', reason }); });
    s.io.on('reconnect_attempt', (attempt) => this.emit('connection', { status: 'retrying', attempt }));
    s.on('connect_error', async (e) => {
      const c = e.data?.code ?? e.message;
      if (!AUTH_ERRORS.includes(c)) return this.emit('error', { code: 'CONNECT', message: e.message });
      // Server middleware rad etganda socket.io o'zi qayta ulanmaydi: tokenni yangilab, qo'lda urinamiz (ko'pi bilan 2 marta).
      if (++this.#authFails > 2) return this.emit('error', { code: c, fatal: true, message: 'Qayta kiring (login)' });
      try { await onAuthError?.(); s.connect(); } catch { this.emit('error', { code: c, fatal: true, message: 'Qayta kiring (login)' }); }
    });
    s.on(EVENTS.INIT, (d) => this.emit('init', d));
    s.on(EVENTS.UPDATE, (d) => this.emit('update', d));
    s.on(EVENTS.FINISHED, (d) => this.emit('finished', d));
  }

  #call(ev, payload) {
    return new Promise((resolve) => this.#s.timeout(this.ackTimeoutMs).emit(ev, { code: this.code, ...payload }, (err, res) =>
      resolve(err ? { ok: false, error: { code: 'TIMEOUT', message: 'Server javob bermadi' } } : res)));
  }

  async join() {
    const res = await this.#call(EVENTS.JOIN, {});
    if (!res?.ok) return this.emit('error', { code: res?.error?.code ?? 'JOIN', message: res?.error?.message ?? 'Xonaga kirib bo\'lmadi' });
    this.playerId = res.playerId ?? null; this.emit('joined', res); // labirint keyin 'init' eventi bilan keladi (host uchun playerId null)
  }

  /** direction: 'up' | 'down' | 'left' | 'right'. Throttle bo'lsa null. TOO_FAST / RATE_LIMITED kelsa cooldown o'zi oshadi. */
  async move(direction) {
    const now = performance.now();
    if (this.#busy || !this.#s.connected || now - this.#lastAt < this.cooldown) return null;
    this.#busy = true; this.#lastAt = now;
    const res = await this.#call(EVENTS.MOVE, { direction });
    this.#busy = false;
    const c = res?.error?.code;
    if (c === ERR.TOO_FAST || c === ERR.RATE_LIMITED) this.cooldown = Math.min(400, this.cooldown + 25);
    return res;
  }

  answer(choice) { return this.#call(EVENTS.ANSWER, { choice }); }
  start() { return this.#call(EVENTS.START, {}); } // faqat host (o'qituvchi) interfeysi uchun

  get busy() { return this.#busy; }
  get ready() { return !this.#busy && this.#s.connected && performance.now() - this.#lastAt >= this.cooldown; }
  dispose() { this.#s.removeAllListeners(); this.#s.disconnect(); }
}
