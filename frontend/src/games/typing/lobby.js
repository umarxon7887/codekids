/** @file Typing lobbi: kontent (typing_text) va til tanlash, so'ng o'yinni boshlash. */
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
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
      <select id="lang"><option value="uz">O'zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select>
      ${guest ? '<button id="rand" class="btn btn--big">🎲 Tasodifiy matn</button>' : ''}
      <div id="list"><div class="skeleton"></div></div>
    </section>`));
  let inner = () => {};
  const lang = () => root.querySelector('#lang').value;
  const start = async (contentId) => { inner = await mountTyping(root, { mode: guest ? 'guest' : 'solo', contentId, language: lang() }); };

  root.querySelector('#rand')?.addEventListener('click', () => start());
  try {
    const r = await api.get('/contents', { query: { type: 'typing_text', limit: 20 }, auth: false });
    const items = r.contents || r.items || r;
    const list = root.querySelector('#list');
    list.innerHTML = items.length
      ? items.map((c) => `<button class="tile tile--sm" data-id="${esc(c.id)}">${esc(c.title)} <small>${esc(c.topic || '')} ${c.level ? `· ${esc(c.level)}-daraja` : ''}</small></button>`).join('')
      : '<p class="muted">Hozircha matnlar yo\'q.</p>';
    list.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => start(b.dataset.id)));
  } catch (e) { showError(e); }
  return () => inner();
}
