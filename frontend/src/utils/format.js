/** @file Formatlash yordamchilari. */

/** @param {number} ms @returns {string} mm:ss */
export function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** @param {number} n @param {number} [d] */
export const round = (n, d = 0) => Number(n.toFixed(d));
