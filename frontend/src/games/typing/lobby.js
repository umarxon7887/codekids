/** @file Typing lobbi. Mehmon: til + "Boshlash" (ro'yxatsiz, tasodifiy matn). Ustoz/o'quvchi: til bo'yicha ro'yxat. */
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
      <select id="lang" aria-label="Til"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select>
      ${guest ? '<button id="go" class="btn btn--big">▶ Boshlash</button>' : '<div id="list"><div class="skeleton"></div></div>'}
    </section>`));
  let inner = () => {};
  const $ = (s) => root.querySelector(s);
  const lang = () => $('#lang').value;

  const start = async (contentId) => {
    inner();
    inner = await mountTyping(root, { mode: guest ? 'guest' : 'solo', contentId, language: lang(), fresh: !contentId });
  };

  if (guest) {
    $('#go').onclick = () => start();
    return () => inner();
  }

  async function load() {
    try {
      const r = await api.get('/contents', { query: { type: 'typing_text', limit: 50, language: lang() }, auth: false });
      const items = r.contents || r.items || r;
      $('#list').innerHTML = items.length
        ? items.map((c) => `<button class="tile tile--sm" data-id="${esc(c.id)}">${esc(c.title)} <small>${esc(c.topic || '')} ${c.level ? `· ${esc(c.level)}-daraja` : ''}</small></button>`).join('')
        : "<p class=\"muted\">Bu tilda matnlar yo'q.</p>";
      $('#list').querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => start(b.dataset.id)));
    } catch (e) { showError(e); }
  }

  $('#lang').addEventListener('change', load);
  await load();
  return () => inner();
}
