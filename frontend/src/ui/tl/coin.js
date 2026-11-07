/** @file CodeKids coini ("Tugma tanga"): oltin tanga ustida bosilgan klaviatura tugmasi va "K" harfi. */

let n = 0; // har chizilgan tangada gradient id'lari boshqacha bo'lishi uchun

/**
 * Tanga rasmi (inline SVG).
 * @param {number} [size] piksel
 * @param {string} [cls] qo'shimcha class
 */
export function coinSvg(size = 24, cls = '') {
  const g = `ckc${++n}`;
  return `<svg class="ck-coin ${cls}" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 120 120">
    <defs><radialGradient id="${g}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".55" stop-color="#F7C443"/><stop offset="1" stop-color="#D9921C"/></radialGradient></defs>
    <circle cx="60" cy="63" r="54" fill="#B8761A"/>
    <circle cx="60" cy="58" r="54" fill="url(#${g})"/>
    <circle cx="60" cy="58" r="45" fill="none" stroke="#C98A1F" stroke-width="3" stroke-dasharray="4 5"/>
    <rect x="34" y="36" width="52" height="48" rx="12" fill="#B8761A"/>
    <rect x="34" y="32" width="52" height="46" rx="12" fill="#FFE07A" stroke="#C98A1F" stroke-width="2.5"/>
    <text x="60" y="66" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="32" fill="#8A5A12">K</text>
    <path d="M28 34 q6-10 16-12" stroke="#FFFBEA" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

/** Coin soni bilan pill (sarlavhalarda). */
export const coinPill = (coins, size = 22) =>
  `<span class="ck-coins" title="Coinlar">${coinSvg(size)}<b>${Number(coins) || 0}</b><span class="sr">coin</span></span>`;
