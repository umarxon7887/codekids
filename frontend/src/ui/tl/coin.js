/** @file CodeKids coini ("Tugma tanga"): oltin tanga, klaviatura tugmasi va "K" harfi (public/coin/*.webp). */
import { BASE_URL } from '../../core/config.js';

/**
 * Tanga rasmi. Kichik o'lchamda 96px, kattada 256px fayl ishlatiladi.
 * @param {number} [size] piksel
 * @param {string} [cls] qo'shimcha class
 */
export function coinSvg(size = 24, cls = '') {
  const src = `${BASE_URL}coin/coin-${size > 48 ? 256 : 96}.webp`;
  return `<img class="ck-coin ${cls}" src="${src}" alt="" aria-hidden="true" width="${size}" height="${size}" draggable="false" decoding="async">`;
}

/** Coin soni bilan pill (sarlavhalarda). */
export const coinPill = (coins, size = 22) =>
  `<span class="ck-coins" title="Coinlar">${coinSvg(size)}<b>${Number(coins) || 0}</b><span class="sr">coin</span></span>`;
