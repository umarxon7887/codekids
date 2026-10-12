/** @file Typing lobbi: til tanlash va "Boshlash". Matn server tomonidan tasodifiy tanlanadi (mehmon va o'quvchi uchun bir xil). */
import { showError } from '../../core/toast.js';
import { html } from '../../utils/dom.js';
import { mountTyping } from './game.js';

/**
 * @param {HTMLElement} root
 * @param {{guest?:boolean}} [opts]
 * @returns {Promise<()=>void>}
 */
export async function mountTypingLobby(root, { guest = false } = {}) {
  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost">←</a><h2>${guest ? 'Mehmon mashqi' : 'Typing Race'}</h2></div>
      <select id="lang" aria-label="Til"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select>
      <button id="go" class="btn btn--big">▶ Boshlash</button>
    </section>`));
  let inner = () => {};
  const $ = (s) => root.querySelector(s);

  $('#go').onclick = async () => {
    try {
      inner();
      inner = await mountTyping(root, { mode: guest ? 'guest' : 'solo', language: $('#lang').value, fresh: true });
    } catch (e) { showError(e); }
  };
  return () => inner();
}
