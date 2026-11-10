/**
 * @file Kibi labirinti ovozlari: effektlar va fon musiqasi WebAudio'da sintez qilinadi (fayl yuklanmaydi).
 * Sozlamalar localStorage'da: ck_kl_mute (effektlar), ck_kl_music (musiqa).
 */
let AC = null;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* yashirin rejim */ } },
};
let muted = store.get('ck_kl_mute', false);
let musicOn = store.get('ck_kl_music', true);

function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(f, d, type = 'sine', vol = 0.18, when = 0, slide) {
  const a = ac(); if (!a || muted) return;
  const t0 = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
}

function noise(d, f1, f2, vol = 0.12) {
  const a = ac(); if (!a || muted) return;
  const n = a.createBufferSource(), buf = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f1, a.currentTime); bp.frequency.exponentialRampToValueAtTime(f2, a.currentTime + d);
  const g = a.createGain(); g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
  n.connect(bp).connect(g).connect(a.destination); n.start();
}

let stepN = 0;
export const sfx = {
  add() { tone(660, 0.09, 'triangle', 0.16); tone(990, 0.08, 'triangle', 0.1, 0.05); },
  del() { tone(420, 0.12, 'triangle', 0.14, 0, 220); },
  tick() { tone(880, 0.05, 'square', 0.05); },
  start() { stepN = 0; [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.13, i * 0.07)); },
  step() { stepN++; tone(stepN % 2 ? 300 : 360, 0.09, 'sine', 0.22, 0, stepN % 2 ? 240 : 290); noise(0.06, 1800, 900, 0.04); },
  turn() { noise(0.22, 600, 2600, 0.1); tone(500, 0.15, 'sine', 0.06, 0, 800); },
  bump() { tone(150, 0.25, 'sine', 0.35, 0, 60); noise(0.15, 300, 120, 0.18); tone(260, 0.18, 'square', 0.05, 0.12, 200); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.11)); tone(1568, 0.5, 'sine', 0.08, 0.48); noise(0.6, 3000, 8000, 0.05); },
  fail() { tone(392, 0.2, 'triangle', 0.14); tone(311, 0.35, 'triangle', 0.14, 0.18); },
  star(i) { tone(1047 + i * 200, 0.18, 'sine', 0.12); },
};

/* Fon musiqasi: yumshoq tsikl, 88 BPM, Cmaj7 - Am7 - Fmaj7 - G */
const CH = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]];
const MEL = [76, 0, 79, 76, 74, 0, 72, 0, 72, 0, 76, 72, 69, 0, 67, 0, 69, 0, 72, 69, 67, 0, 64, 0, 67, 0, 71, 74, 72, 0, 0, 0];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MUS = { bus: null, timer: 0, next: 0, step: 0 };

function note(a, t, f, d, type, vol, dest) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.04, d / 4)); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05);
}

export function musicStart() {
  const a = ac(); if (!a || MUS.timer || !musicOn) return;
  const bus = a.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(0.5, a.currentTime + 2);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  bus.connect(lp).connect(a.destination); MUS.bus = bus;
  const sp = 60 / 88 / 2; MUS.next = a.currentTime + 0.1; MUS.step = 0;
  MUS.timer = setInterval(() => {
    while (MUS.next < a.currentTime + 0.25) {
      const t = MUS.next, st = MUS.step % 32, ch = CH[Math.floor(st / 8)];
      if (st % 8 === 0) { ch.forEach((m) => note(a, t, hz(m), sp * 8.4, 'triangle', 0.035, bus)); note(a, t, hz(ch[0] - 12), sp * 3, 'sine', 0.09, bus); }
      if (st % 8 === 4) note(a, t, hz(ch[0] - 12), sp * 2.5, 'sine', 0.06, bus);
      if (st % 2 === 1) note(a, t, hz(ch[(st >> 1) % 4] + 12), sp * 1.6, 'sine', 0.025, bus);
      if (MEL[st] && MUS.step >= 32) note(a, t, hz(MEL[st]), sp * 2.4, 'sine', 0.045, bus);
      MUS.next += sp; MUS.step++;
    }
  }, 60);
}

export function musicStop() {
  if (!MUS.timer) return;
  clearInterval(MUS.timer); MUS.timer = 0;
  const a = AC, b = MUS.bus;
  if (a && b) { b.gain.cancelScheduledValues(a.currentTime); b.gain.setValueAtTime(b.gain.value, a.currentTime); b.gain.linearRampToValueAtTime(0, a.currentTime + 0.6); }
}

export const isMuted = () => muted;
export const isMusicOn = () => musicOn;
export function toggleMute() { muted = !muted; store.set('ck_kl_mute', muted); return muted; }
export function toggleMusic() { musicOn = !musicOn; store.set('ck_kl_music', musicOn); if (musicOn) musicStart(); else musicStop(); return musicOn; }
