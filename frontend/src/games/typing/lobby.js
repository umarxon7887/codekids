/**
 * @file Typing lobbi: til tanlash va "Boshlash". Matnni server tasodifiy tanlaydi.
 * Tugallanmagan mashq bo'lsa, lobbi ko'rsatilmaydi: mashq o'sha joyidan davom etadi.
 */
import '../../styles/typing.css';
import { showError } from '../../core/toast.js';
import { html } from '../../utils/dom.js';
import { mountTyping, findResumable } from './game.js';

const KB = '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
const BACK = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const INFO = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>';
const LANGS = [['uz', "O'zbekcha"], ['ru', 'Русский'], ['en', 'English']];

/** @param {HTMLElement} root @param {{guest?:boolean}} [opts] @returns {Promise<()=>void>} */
export async function mountTypingLobby(root, { guest = false } = {}) {
  const mode = guest ? 'guest' : 'solo';

  const saved = findResumable(mode);
  if (saved) {
    try {
      return await mountTyping(root, { mode, language: saved.language, contentId: saved.contentId });
    } catch (e) { showError(e); }
  }

  root.replaceChildren(html(`
    <section class="ty">
      <div class="ty-top">
        <a href="#/" class="ty-back" aria-label="Orqaga">${BACK}</a>
        <h1>${guest ? 'Mehmon mashqi' : 'Typing Race'}</h1>
      </div>
      ${guest ? `<div class="ty-note" role="note">${INFO}Mehmon rejimida natijalar saqlanmaydi</div>` : ''}
      <div class="ty-grid">
        <div class="ty-card">
          <div class="ty-head"><span class="ty-ic">${KB}</span>
            <div><b>${guest ? 'Typing mashqi' : 'Yangi poyga'}</b><small>${guest ? "Tez va aniq yozishni sinab ko'r" : 'Matn tasodifiy tanlanadi'}</small></div></div>
          <fieldset class="ty-lang"><legend>Matn tili</legend>
            <div class="ty-opts">${LANGS.map(([v, l], i) => `<label><input type="radio" name="lang" value="${v}"${i ? '' : ' checked'}><span>${l}</span></label>`).join('')}</div>
          </fieldset>
          <button id="go" class="btn ty-go">▶ Boshlash</button>
        </div>
        ${guest ? `<div class="ty-reg">
          <b>Natijalaring saqlansinmi?</b>
          <p>Ro'yxatdan o'tsang, natijalaring profilingda turadi. Xonalar, Labirint va IT darslari ham ochiladi.</p>
          <div class="ty-tags"><span>🔒 Xonalar</span><span>🔒 Labirint</span><span>🔒 IT darslari</span></div>
          <a href="#/" class="btn">Ro'yxatdan o'tish</a>
        </div>` : ''}
      </div>
    </section>`));
  let inner = () => {};
  const $ = (s) => root.querySelector(s);

  $('#go').onclick = async () => {
    try {
      inner();
      const language = $('input[name="lang"]:checked').value;
      inner = await mountTyping(root, { mode, language, fresh: true });
    } catch (e) { showError(e); }
  };
  return () => inner();
}
