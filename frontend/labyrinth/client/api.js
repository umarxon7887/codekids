// REST yordamchisi (/api/v1). Access token xotirada (localStorage'ga yozilmaydi), refresh token — httpOnly cookie.
export class ApiClient {
  #token = null; #exp = 0; #refreshing = null;
  constructor({ baseUrl = '' } = {}) { this.baseUrl = baseUrl; }

  #setToken(t) {
    this.#token = t;
    try { this.#exp = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } // JWT exp
    catch { this.#exp = Date.now() + 14 * 60000; } // o'qib bo'lmasa: 15 daqiqadan biroz kam deb hisoblaymiz
  }

  async #req(path, { method = 'GET', body, auth = true, retry = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${await this.getToken()}`;
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, { method, headers, credentials: 'include', body: body && JSON.stringify(body) }); // credentials: shart (refresh cookie)
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const e = data?.error ?? { code: `HTTP_${res.status}`, message: res.statusText };
      if (auth && retry && e.code === 'TOKEN_EXPIRED') { await this.refresh(); return this.#req(path, { method, body, auth, retry: false }); }
      throw Object.assign(new Error(e.message), e); // e.code, e.details
    }
    return data;
  }

  async login(email, password) { const d = await this.#req('/auth/login', { method: 'POST', body: { email, password }, auth: false }); this.#setToken(d.accessToken); return d.user; }
  refresh() { // bir vaqtda bitta refresh (rotation: TOKEN_REUSED bo'lmasligi uchun)
    return (this.#refreshing ??= this.#req('/auth/refresh', { method: 'POST', auth: false })
      .then((d) => { this.#setToken(d.accessToken); return d.accessToken; }).finally(() => { this.#refreshing = null; }));
  }
  async getToken() { if (!this.#token || Date.now() > this.#exp - 30000) await this.refresh(); return this.#token; } // socket `auth` shu funksiyani chaqiradi
  async logout() { await this.#req('/auth/logout', { method: 'POST', auth: false }); this.#token = null; }
  joinRoom(code) { return this.#req('/rooms/join', { method: 'POST', body: { code } }); } // 201 yangi, 200 qayta kirish
}
