/**
 * @file Typing lobbi. O'quvchi: botlar bilan poyga (daraja, garaj, matn tili) + yolg'iz mashq va xonaga kirish.
 * Mehmon: oddiy mashq (til tanlash va "Boshlash"). Matnni server tasodifiy tanlaydi.
 * Tugallanmagan yolg'iz mashq bo'lsa, lobbi ko'rsatilmaydi: mashq o'sha joyidan davom etadi.
 */
import '../../styles/typing.css';
import '../../styles/botrace.css';
import { api } from '../../core/api.js';
import { garageHtml, mountGarage } from './garage.js';
import { LEVELS, levelName, botNames, botCars } from './botrace.js';
import { carUrl, getMyCar } from './cars.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { mountTyping, findResumable } from './game.js';
import { t, getLang } from '../../i18n/index.js';

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

  if (!guest) return mountRaceLobby(root);

  root.replaceChildren(html(`
    <section class="ty">
      <div class="ty-top">
        <a href="#/" class="ty-back" aria-label="${t('app.backShort')}">${BACK}</a>
        <h1>${guest ? t('ty.guestTitle') : 'Typing Race'}</h1>
      </div>
      ${guest ? `<div class="ty-note" role="note">${INFO}Mehmon rejimida natijalar saqlanmaydi</div>` : ''}
      <div class="ty-grid">
        <div class="ty-card">
          <div class="ty-head"><span class="ty-ic">${KB}</span>
            <div><b>${guest ? t('ty.guestPractice') : t('ty.newRace')}</b><small>${guest ? t('ty.guestD') : t('ty.randomText')}</small></div></div>
          <fieldset class="ty-lang"><legend>${t('tp.textLang')}</legend>
            <div class="ty-opts">${LANGS.map(([v, l]) => `<label><input type="radio" name="lang" value="${v}"${v === getLang() ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
          </fieldset>
          <button id="go" class="btn ty-go">▶ ${t('home.start')}</button>
        </div>
        ${guest ? `<div class="ty-reg">
          <b>${t('ty.saveQ')}</b>
          <p>${t('ty.saveP')}</p>
          <div class="ty-tags"><span>🔒 ${t('pf.rooms')}</span><span>🔒 ${t('pf.lab')}</span><span>🔒 ${t('home.it')}</span></div>
          <a href="#/" class="btn">${t('au.register')}</a>
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

const LV_KEY = 'ck_race_lv';
const getLv = () => { try { const n = Number(localStorage.getItem(LV_KEY)); return n >= 1 && n <= 4 ? n : 1; } catch { return 1; } };
const setLv = (n) => { try { localStorage.setItem(LV_KEY, String(n)); } catch { /* yopiq */ } };
const meter = (n) => `<span class="br-meter" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;

/** O'quvchi lobbisi: botlar bilan poyga. @param {HTMLElement} root */
async function mountRaceLobby(root) {
  let lv = getLv(), lang = getLang();
  let stats = { wins: {}, unlocked: [1, 2, 3] };
  root.replaceChildren(html(`
    <section class="ty">
      <div class="ty-top">
        <a href="#/" class="ty-back" aria-label="${t('app.backShort')}">${BACK}</a>
        <h1>Typing Race</h1>
      </div>
      <div class="ty-grid">
        <div class="ty-card br-card">
          <div class="ty-head"><span class="ty-ic">${KB}</span><div><b>${t('br.title')}</b><small>${t('br.sub')}</small></div></div>
          <div class="br-lab" id="lv-lab">${t('br.pickLevel')}</div>
          <div class="br-lvls" role="radiogroup" aria-labelledby="lv-lab">${LEVELS.map((l) => `
            <button type="button" class="br-lvl" role="radio" data-lv="${l.lv}">
              ${meter(l.lv)}<span class="br-nm">${levelName(l.lv)}</span>
              <span class="br-sp">${t('br.botsWpm', { a: l.min, b: l.max })}</span><span class="br-badge" hidden></span>
            </button>`).join('')}
          </div>
          <div class="br-lab">${t('br.pickCar')}</div>
          <div id="garage">${garageHtml()}</div>
          <div class="br-rivals"><div class="br-rcars"></div><span></span></div>
          <fieldset class="ty-lang"><legend>${t('tp.textLang')}</legend>
            <div class="ty-opts">${LANGS.map(([v, l]) => `<label><input type="radio" name="lang" value="${v}"${v === lang ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
          </fieldset>
          <button id="go" class="btn ty-go">▶ ${t('br.start')}</button>
        </div>
        <div class="br-side">
          <div class="br-alt"><div><b>${t('br.solo')}</b><small>${t('br.soloD')}</small></div><button type="button" class="btn btn--ghost" id="solo">${t('home.start')}</button></div>
          <div class="br-alt"><div><b>${t('br.friends')}</b><small>${t('br.friendsD')}</small></div><a class="btn btn--ghost" href="#/">${t('br.enterCode')}</a></div>
        </div>
      </div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  let inner = () => {};

  function paintLevels() {
    if (!stats.unlocked.includes(lv)) lv = 1;
    root.querySelectorAll('.br-lvl').forEach((b) => {
      const n = Number(b.dataset.lv), locked = !stats.unlocked.includes(n), won = stats.wins?.[n] || 0;
      b.setAttribute('aria-checked', String(n === lv));
      b.toggleAttribute('data-locked', locked);
      b.setAttribute('aria-disabled', String(locked));
      const badge = b.querySelector('.br-badge');
      badge.hidden = !locked && !won;
      badge.textContent = locked ? `🔒 ${t('br.lock4')}` : won ? t('br.won', { n: won }) : '';
      badge.classList.toggle('is-lock', locked);
    });
    const my = getMyCar() || 1;
    $('.br-rcars').innerHTML = botCars(lv, my).map((c) => `<img src="${carUrl(c)}" alt="">`).join('');
    $('.br-rivals span').innerHTML = `${t('br.rivals')}: <b>${esc(botNames(lv).join(', '))}</b>`;
  }
  root.querySelectorAll('.br-lvl').forEach((b) => {
    b.onclick = () => { const n = Number(b.dataset.lv); if (!stats.unlocked.includes(n)) return; lv = n; setLv(n); paintLevels(); };
  });
  const stopGarage = mountGarage($('#garage'), () => paintLevels());
  paintLevels();
  api.get('/typing/race-stats').then((s) => { stats = s; paintLevels(); }).catch(() => {});

  const pickedLang = () => $('input[name="lang"]:checked')?.value || lang;
  const startRace = async (level) => {
    try {
      inner(); stopGarage();
      lang = pickedLang();
      inner = await mountTyping(root, { mode: 'solo', language: lang, fresh: true, race: { level, again: startRace } });
    } catch (e) { showError(e); }
  };
  $('#go').onclick = () => startRace(lv);
  $('#solo').onclick = async () => {
    try { inner(); stopGarage(); inner = await mountTyping(root, { mode: 'solo', language: pickedLang(), fresh: true }); } catch (e) { showError(e); }
  };
  return () => { stopGarage(); inner(); };
}
