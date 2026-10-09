/**
 * @file Typing o'yini. Rejimlar:
 *  - solo : POST /typing/sessions -> POST /typing/results
 *  - guest: POST /guest/session   -> POST /guest/results (saqlanmaydi)
 *  - room : socket room:join / room:snapshot / room:progress + sessiya `room_code` bilan
 * WPM/aniqlik serverda hisoblanadi. Ekrandagi jonli WPM faqat ko'rsatish uchun.
 */
import { api } from '../../core/api.js';
import { connectSocket, emitAck } from '../../core/socket.js';
import { PROGRESS_INTERVAL_MS } from '../../core/config.js';
import { showError, toast, friendlyMessage } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { formatTime, round } from '../../utils/format.js';
import { renderBoard } from './board.js';
import { renderResults } from './results.js';

/**
 * @param {HTMLElement} root
 * @param {{mode?:'solo'|'guest'|'room', contentId?:string, language?:string, code?:string}} [opts]
 * @returns {Promise<()=>void>} cleanup
 */
export async function mountTyping(root, { mode = 'solo', contentId, language = 'uz', code } = {}) {
  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost">←</a><h2>Typing Race</h2></div>
      <div id="t-board" class="board" ${mode === 'room' ? '' : 'hidden'}></div>
      <div class="stats"><span id="t-time">00:00</span><span id="t-wpm">0 WPM</span></div>
      <div id="t-msg" class="banner" hidden></div>
      <div id="t-text" class="typing__text"><div class="skeleton"></div></div>
      <input id="t-input" class="typing__input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Shu yerga yozing..." disabled />
      <div id="t-result" class="result" hidden></div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  const textEl = $('#t-text'), input = $('#t-input'), timeEl = $('#t-time'), wpmEl = $('#t-wpm'), msg = $('#t-msg'), resEl = $('#t-result');

  let target = '', session = null, guestToken = null;
  let lastValid = '', serverCorrect = 0;
  let startTs = 0, timer = 0, progressTimer = 0, roundStarted = false, done = false, lastSent = -1;
  const cleanups = [];

  const correctCount = () => [...input.value].filter((c, i) => c === target[i]).length;

  function paint(typed, wrong = false) {
    textEl.innerHTML = [...target].map((ch, i) => {
      let cls = 'ch';
      if (i < typed.length) cls += ' ch--ok';
      else if (i === typed.length) cls += wrong ? ' ch--cur ch--err' : ' ch--cur';
      return '<span class="' + cls + '">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
    }).join('');
  }

  async function createRound() {
    if (mode === 'guest') {
      const g = await api.post('/guest/session', contentId ? { content_id: contentId } : {}, { auth: false });
      guestToken = g.guest_token; target = g.target_text;
    } else {
      session = await api.post('/typing/sessions', { content_id: contentId, language, ...(code ? { room_code: code } : {}) });
      target = session.target_text;
    }
  }

  async function submit() {
    if (mode === 'guest') return (await api.post('/guest/results', { guest_token: guestToken, typed_text: input.value }, { auth: false })).result;
    return (await api.post('/typing/results', { session_id: session.session_id, typed_text: input.value })).result;
  }

  function restoreProgress() {
    if (!target || serverCorrect <= 0 || startTs) return;
    const saved = target.slice(0, serverCorrect);
    input.value = saved;
    lastValid = saved;
    lastSent = saved.length;
    paint(saved);
  }

  async function beginRound() {
    if (roundStarted) return;
    roundStarted = true;
    try {
      await createRound();
      msg.hidden = true;
      paint('');
      restoreProgress();
      input.disabled = false;
      input.focus();
    } catch (e) { roundStarted = false; showError(e); textEl.textContent = "Mashqni boshlab bo'lmadi"; }
  }


  function tick() {
    const elapsed = performance.now() - startTs;
    timeEl.textContent = formatTime(elapsed);
    wpmEl.textContent = `${round(correctCount() / 5 / Math.max(elapsed / 60000, 1 / 60))} WPM`; // faqat ko'rsatish
  }

  async function finish() {
    if (done || !roundStarted || !target) return;
    done = true;
    clearInterval(timer); clearInterval(progressTimer);
    input.disabled = true;
    try {
      const r = await submit();
      resEl.hidden = false;
      resEl.innerHTML = `<h3>Natija</h3><p>WPM: <b>${esc(r.wpm)}</b></p><p>Aniqlik: <b>${esc(r.accuracy)}%</b></p><p>Vaqt: <b>${esc(round(r.time_sec, 1))} s</b></p>
        ${r.flagged ? '<p class="warn">⚠️ Natija shubhali deb belgilandi.</p>' : ''}
        ${r.saved === false ? '<p class="muted">Mehmon natijasi saqlanmaydi. Ro\'yxatdan o\'ting!</p>' : ''}`;
      toast('Natija qabul qilindi', 'success');
    } catch (e) {
      showError(e);
      if (e.code !== 'SESSION_USED' && e.code !== 'TOKEN_USED') { done = false; input.disabled = false; }
    }
  }

  const onInput = () => {
    let v = input.value;
    let m = 0;
    while (m < v.length && m < target.length && v[m] === target[m]) m++;
    const wrong = m < v.length;
    if (wrong) { v = v.slice(0, m); input.value = v; }
    lastValid = v;
    if (!startTs) {
      startTs = performance.now();
      timer = setInterval(tick, 200);
      if (mode === 'room') {
        progressTimer = setInterval(() => {
          const c = correctCount();
          if (c !== lastSent) { lastSent = c; emitAck('room:progress', { code, correct: c }).catch(() => {}); }
        }, PROGRESS_INTERVAL_MS);
      }
    }
    paint(v, wrong);
    if (wrong) setTimeout(() => { if (!done) paint(input.value); }, 250);
    if (v.length >= target.length) finish();
  };
  input.addEventListener('input', onInput);
  textEl.addEventListener('click', () => input.focus());

  if (mode === 'room') {
    const socket = connectSocket();
    const onSnap = (snap) => {
      renderBoard($('#t-board'), snap);
      if (snap.status === 'active') beginRound();
      else if (snap.status === 'finished') finish();
      else { msg.hidden = false; msg.textContent = 'Ustoz boshlashini kuting...'; }
    };
    socket.on('room:snapshot', onSnap);
    cleanups.push(() => socket.off('room:snapshot', onSnap));
    const onFin = ({ players = [] }) => {
      const ov = document.createElement('div');
      ov.className = 'modal';
      root.appendChild(ov);
      renderResults(ov, players, { title: "O'yin tugadi", onBack: () => { location.hash = '#/'; } });
      ov.hidden = false;
    };
    const onKick = () => {
      textEl.textContent = 'Siz xonadan chiqarildingiz';
      setTimeout(() => { location.hash = '#/'; }, 2000);
    };
    socket.on('room:finished', onFin);
    socket.on('kicked', onKick);
    cleanups.push(() => { socket.off('room:finished', onFin); socket.off('kicked', onKick); });
    try { const j = await emitAck('room:join', { code }); serverCorrect = j?.you?.correct ?? 0; if (roundStarted) restoreProgress(); } catch (e) { showError(e); textEl.textContent = friendlyMessage(e.code); }
    textEl.textContent = '';
  } else {
    await beginRound();
    if (input.value) paint(input.value); // resume
  }

  return () => { clearInterval(timer); clearInterval(progressTimer); input.removeEventListener('input', onInput); cleanups.forEach((f) => f()); };
}
