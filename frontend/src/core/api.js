/**
 * @file API client (/api/v1): Bearer token, 401 -> refresh (single-flight) -> qayta urinish,
 * JSON va multipart (FormData) qo'llab-quvvatlanadi.
 */
import { API_BASE } from './config.js';
import { getAccessToken, setAccessToken, setUser } from './state.js';

/** Backend standart xato formati uchun Error. */
export class ApiError extends Error {
  /** @param {string} code @param {string} message @param {number} status @param {any[]} [details] */
  constructor(code, message, status, details = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** @param {Response} res @returns {Promise<ApiError>} */
async function toApiError(res) {
  try {
    const { error } = await res.json();
    return new ApiError(error?.code || 'UNKNOWN', error?.message || res.statusText, res.status, error?.details);
  } catch {
    return new ApiError('UNKNOWN', res.statusText || 'Server xatosi', res.status);
  }
}

let refreshing = null;

/**
 * httpOnly cookie orqali yangi accessToken oladi.
 * @param {{silent?:boolean}} [opts] silent=true bo'lsa muvaffaqiyatsizlikda `auth:expired` yuborilmaydi
 * @returns {Promise<string>}
 */
export function refreshAccessToken({ silent = false } = {}) {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw await toApiError(res);
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        setAccessToken(null);
        setUser(null);
        if (!silent) window.dispatchEvent(new CustomEvent('auth:expired'));
        throw err instanceof ApiError ? err : new ApiError('NETWORK_ERROR', "Internetga ulanib bo'lmadi", 0);
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

/**
 * @param {string} path  masalan '/typing/sessions'
 * @param {{method?:string, body?:any, auth?:boolean, query?:Record<string,any>}} [opts]
 * @returns {Promise<any>}
 */
export async function request(path, { method = 'GET', body, auth = true, query } = {}, _retried = false) {
  const headers = { Accept: 'application/json' };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...qs].length) url += `?${qs}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', "Internetga ulanib bo'lmadi", 0);
  }

  if (res.status === 401 && auth && !_retried && !path.startsWith('/auth/')) {
    await refreshAccessToken();
    return request(path, { method, body, auth, query }, true);
  }
  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (p, o) => request(p, { ...o, method: 'GET' }),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
  put: (p, body, o) => request(p, { ...o, method: 'PUT', body }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
};

/** Auth yordamchilari. */
export const auth = {
  /** @param {{email:string,password:string}} creds */
  async login(creds) {
    const data = await request('/auth/login', { method: 'POST', body: creds, auth: false });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  },
  /** @param {object} payload register so'rovi (role, nickname, ...) */
  async register(payload) {
    const data = await request('/auth/register', { method: 'POST', body: payload, auth: false });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  },
  /** Sahifa yangilanganda sessiyani cookie orqali tiklaydi. @returns {Promise<boolean>} */
  async restore() {
    try {
      await refreshAccessToken({ silent: true });
      const { user } = await request('/auth/me');
      setUser(user);
      return true;
    } catch { return false; }
  },
  async logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* cookie baribir eskiradi */ }
    setAccessToken(null);
    setUser(null);
  },
};
