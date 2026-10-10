/**
 * @file Typing o'yini. Rejimlar: solo | guest | room. WPM/aniqlik serverda hisoblanadi;
 * ekrandagi jonli WPM faqat ko'rsatish uchun. Sahifa yangilansa, sessiya (sessionStorage) tiklanadi.
 * Matn va kiritish maydoni birlashgan: matnga bosilganda yashirin input fokus oladi.
 */
import { api } from '../../core/api.js';
import { connectSocket, emitAck } from '../../core/socket.js';
import { getUser } from '../../core/state.js';
import { PROGRESS_INTERVAL_MS } from '../../core/config.js';
import { showError, toast, friendlyMessage } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { formatTime, round } from '../../utils/format.js';
import { t } from '../../i18n/index.js';
import { renderBoard } from './board.js';
import { renderEndScreen, renderKicked, fromPlayers } from '../../ui/endscreen.js';

const RUN_KEY = 'ck_typing_run';
const ts = (v) => (v == null ? 0 : typeof v === 'number' ? v : Date.parse(v) || 0);
const loadRun = () => { try { return JSON.parse(sessionStorage.getItem(RUN_KEY)); } catch { return null; } };
const saveRun = (r) => { try { sessionStorage.setItem(RUN_KEY, JSON.stringify(r)); } catch { /* to'lgan/yopiq */ } };
const clearRun = () => { try { sessionStorage.removeItem(RUN_KEY); } catch { /* ignore */ } };

/**
 * @param {HTMLElement} root
 * @param {{mode?:'solo'|'guest'|'room', contentId?:string, language?:string, code?:string}} [opts]
 * @returns {Promise<()=>void>} cleanup
 */
export async function mountTyping(root, { mode = 'solo', contentId, language = 'uz', code } = {}) {
  root.replaceChildren(html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost" aria-label="Orqaga">←</a><h2>Typing Race</h2></div>
      <div id="t-board" class="board" ${mode === 'room' ? '' : 'hidden'}></div>
      <div class="stats"><span id="t-time">00:00</span><span id="t-wpm">0 WPM</span></div>
      <div id="t-msg" class="banner" hidden></div>
      <label class="typing" id="t-wrap">
        <div id="t-text" class="typing__text"><div class="skeleton"></div></div>
        <input id="t-input" class="typing__input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Matn terish maydoni" disabled />
      </label>
      <div id="t-result" class="result" hidden></div>
      <div id="t-end" hidden></div>
      <div id="t-kick" hidden></div>
    </section>`));
  const $ = (s) => root.querySelector(s);
  const textEl = $('#t-text'), input = $('#t-input'), timeEl = $('#t-time'), wpmEl = $('#t-wpm'), msg = $('#t-msg'), resEl = $('#t-result');
  let serverCorrect = 0;
  const runKey = `${mode}:${code || ''}:${contentId || ''}`;
  const me = getUser();

  let target = '', session = null, guestToken = null, expiresAt = 0;
  let startTs = 0, startWall = 0, timer = 0, progressTimer = 0;
  let roundStarted = false, done = false, lastSent = -1, lastSnap = null, endShown = false, kickStop = () => {};
  const cleanups = [];

  const correctCount = () => [...input.value].filter((c, i) => c === target[i]).length;

  function paint(typed) {
    textEl.innerHTML = [...target].map((ch, i) => {
      let cls = 'ch';
      if (i < typed.length) cls += typed[i] === ch ? ' ch--ok' : ' ch--bad';
      else if (i === typed.length) cls += ' ch--cur';
      return `<span class="${cls}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`;
    }).join('');
  }

  const persist = () => saveRun({ key: runKey, session, guestToken, target, typed: input.value, startWall, expiresAt });

  async function createRound() {
    if (mode === 'guest') {
      const g = await api.post('/guest/session', contentId ? { content_id: contentId } : {}, { auth: false });
      guestToken = g.guest_token; target = g.target_text; expiresAt = Date.now() + (g.expires_in || 900) * 1000;
    } else {
      session = await api.post('/typing/sessions', { content_id: contentId, language, ...(code ? { room_code: code } : {}) });
      target = session.target_text; expiresAt = ts(session.expires_at);
    }
  }

  async function submit() {
    if (mode === 'guest') return (await api.post('/guest/results', { guest_token: guestToken, typed_text: input.value }, { auth: false })).result;
    return (await api.post('/typing/results', { session_id: session.session_id, typed_text: input.value })).result;
  }

  function sendProgress() {
    const c = correctCount();
    if (c === lastSent) return;
    lastSent = c;
    emitAck('room:progress', { code, correct: c }).catch((e) => {
      if (e.code === 'KICKED' || e.code === 'NOT_A_PARTICIPANT') showKicked();
      else if (e.code === 'ROOM_CLOSED' || e.code === 'ROOM_FINISHED') closedNow();
    });
  }

  function tick() {
    const elapsed = performance.now() - startTs;
    timeEl.textContent = formatTime(elapsed);
    wpmEl.textContent = `${round(correctCount() / 5 / Math.max(elapsed / 60000, 1 / 60))} WPM`; // faqat ko'rsatish
  }

  function startTimers(wall = Date.now()) {
    if (startTs) return;
    startWall = wall;
    startTs = performance.now() - (Date.now() - wall);
    timer = setInterval(tick, 200);
    if (mode === 'room') progressTimer = setInterval(sendProgress, PROGRESS_INTERVAL_MS);
  }

  async function beginRound() {
    if (roundStarted) return;
    roundStarted = true;
    try {
      const saved = loadRun();
      const resume = saved && saved.key === runKey && saved.target && (!saved.expiresAt || Date.now() < saved.expiresAt) ? saved : null;
      if (resume) {
        target = resume.target; session = resume.session; guestToken = resume.guestToken; expiresAt = resume.expiresAt;
      } else {
        await createRound();
      }
      msg.hidden = true;
      input.disabled = false;
      if (resume?.typed) { input.value = resume.typed; startTimers(resume.startWall); tick(); }
      paint(input.value);
      persist();
      input.focus();
    } catch (e) { roundStarted = false; showError(e); textEl.textContent = "Mashqni boshlab bo'lmadi"; }
  }

  async function finish() {
    if (done || !roundStarted || !target) return;
    done = true;
    clearInterval(timer); clearInterval(progressTimer);
    input.disabled = true;
    try {
      const r = await submit();
      clearRun();
      resEl.hidden = false;
      resEl.innerHTML = `<h3>Natija</h3><p>WPM: <b>${esc(r.wpm)}</b></p><p>Aniqlik: <b>${esc(r.accuracy)}%</b></p><p>Vaqt: <b>${esc(round(r.time_sec, 1))} s</b></p>
        ${r.flagged ? '<p class="warn">⚠️ Natija shubhali deb belgilandi.</p>' : ''}
        ${r.saved === false ? '<p class="muted">Mehmon natijasi saqlanmaydi. Ro\'yxatdan o\'ting!</p>' : ''}
        ${mode === 'room' ? '' : `<a class="btn btn--big" href="#/">${t('app.back')}</a>`}`;
      toast('Natija qabul qilindi', 'success');
    } catch (e) {
      showError(e);
      if (e.code === 'SESSION_USED' || e.code === 'TOKEN_USED') clearRun();
      else { done = false; input.disabled = false; }
    }
  }

  function showEnd(players, title) {
    if (endShown || mode !== 'room') return;
    endShown = true;
    renderEndScreen($('#t-end'), {
      title, players: fromPlayers(players || lastSnap?.players, 'correct'), meId: me?.id, meNick: me?.nickname,
      backHref: '#/', scoreLabel: t('score.letters'),
    });
  }
  function closedNow() { finish().finally(() => showEnd(lastSnap?.players, t('end.closed'))); }
  function showKicked() {
    if (endShown) return;
    endShown = true; done = true;
    clearInterval(timer); clearInterval(progressTimer); clearRun();
    input.disabled = true;
    kickStop = renderKicked($('#t-kick'));
  }

  const shake = () => {
    textEl.classList.remove('shake');
    void textEl.offsetWidth;
    textEl.classList.add('shake');
  };
  const onInput = () => {
    const v = input.value;
    let m = 0;
    while (m < v.length && m < target.length && v[m] === target[m]) m++;
    if (m < v.length) { input.value = v.slice(0, m); shake(); }
    if (!startTs) startTimers();
    paint(input.value);
    persist();
    if (input.value.length >= target.length) finish();
  };
  input.addEventListener('input', onInput);

  if (mode === 'room') {
    const socket = connectSocket();
    const onSnap = (snap) => {
      lastSnap = snap;
      renderBoard($('#t-board'), snap);
      if (snap.status === 'active') beginRound();
      else if (snap.status === 'finished') finish().finally(() => showEnd(snap.players));
      else if (!roundStarted) { msg.hidden = false; msg.textContent = 'Ustoz boshlashini kuting...'; }
    };
    const onFinished = (d) => finish().finally(() => showEnd(d?.players));
    const onKicked = () => showKicked();
    socket.on('room:snapshot', onSnap);
    socket.on('room:finished', onFinished);
    socket.on('kicked', onKicked);
    cleanups.push(() => { socket.off('room:snapshot', onSnap); socket.off('room:finished', onFinished); socket.off('kicked', onKicked); });
    try {
      const j = await emitAck('room:join', { code });
      serverCorrect = Math.min(j?.you?.correct ?? 0, target.length || Infinity);
      if (roundStarted && serverCorrect > input.value.length) {
        input.value = target.slice(0, serverCorrect);
        paint(input.value);
        persist();
      }
    } catch (e) {
      showError(e);
      textEl.textContent = friendlyMessage(e.code);
      if (e.code === 'KICKED') showKicked();
      return () => cleanups.forEach((f) => f());
    }
    textEl.textContent = '';
  } else {
    await beginRound();
  }

  return () => {
    clearInterval(timer); clearInterval(progressTimer); kickStop();
    input.removeEventListener('input', onInput); cleanups.forEach((f) => f());
  };
}
