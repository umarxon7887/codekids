/**
 * @file Typing lobbi: til tanlash va "Boshlash". Matn server tomonidan tasodifiy tanlanadi (mehmon va o'quvchi uchun bir xil).
 * Sahifa yangilansa va tugallanmagan mashq bo'lsa, lobbi ko'rsatilmaydi: mashq o'sha joyidan davom etadi.
 */
import { showError } from '../../core/toast.js';
import { html } from '../../utils/dom.js';
import { mountTyping, findResumable } from './game.js';

/**
 * @param {HTMLElement} root
 * @param {{guest?:boolean}} [opts]
 * @returns {Promise<()=>void>}
 */
export async function mountTypingLobby(root, { guest = false } = {}) {
  const mode = guest ? 'guest' : 'solo';

  // Yangilanishdan keyin tugallanmagan mashqni tilni qayta tanlatmasdan tiklaymiz
  const saved = findResumable(mode);
  if (saved) {
    try {
      return await mountTyping(root, { mode, language: saved.language, contentId: saved.contentId });
    } catch (e) { showError(e); /* tiklab bo'lmadi: oddiy lobbi ko'rsatiladi */ }
  }

  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost">←</a><h2>${guest ? 'Mehmon mashqi' : 'Typing Race'}</h2></div>
      <select id="lang" aria-label="Til"><option value="uz">O'zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select>
      <button id="go" class="btn btn--big">▶ Boshlash</button>
    </section>`));
  let inner = () => {};
  const $ = (s) => root.querySelector(s);

  $('#go').onclick = async () => {
    try {
      inner();
      inner = await mountTyping(root, { mode, language: $('#lang').value, fresh: true });
    } catch (e) { showError(e); }
  };
  return () => inner();
}