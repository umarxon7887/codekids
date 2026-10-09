/**
 * @file Minimal state store. accessToken faqat shu modul ichida (xotirada) saqlanadi,
 * localStorage/sessionStorage'ga YOZILMAYDI.
 */
let accessToken = null;
let user = null;
const listeners = new Set();

/** @returns {string|null} */
export const getAccessToken = () => accessToken;

/** @param {string|null} token */
export function setAccessToken(token) {
  accessToken = token;
  emit();
}

/** @returns {object|null} */
export const getUser = () => user;

/** @param {object|null} u */
export function setUser(u) {
  user = u;
  emit();
}

/** @param {(s:{token:string|null,user:object|null})=>void} fn @returns {()=>void} unsubscribe */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn({ token: accessToken, user }));
}

/** Persistent bo'lmagan, lekin sezgir bo'lmagan qurilma ID (socket uchun). */
export function getDeviceId() {
  let id = localStorage.getItem('ck_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ck_device_id', id);
  }
  return id;
}
