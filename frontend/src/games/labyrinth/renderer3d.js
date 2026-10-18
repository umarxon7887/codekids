/**
 * @file 3D bog' labirinti (Three.js). `labyrinth:init` ma'lumotidan quradi.
 * - Butalar: 3 xil "bo'rtiq" shar, InstancedMesh (katta labirintda ham bir necha draw call)
 * - Pol: tosh yo'l, atrofda o'tloq va daraxtlar; finishda qasr (savollar tugagach ochiladi)
 * - Qahramonlar: rasm (sprite) + soya dog'i; bir katakda bir nechta bo'lsa yonma-yon turadi
 * - Rejimlar: 'follow' — qahramon orqasidan burchakli kamera; 'map' — tepadan butun labirint (zoom, surish)
 * - Past quvvat: pixelRatio 1, soyasiz, butalar va daraxtlar kamroq; FPS past bo'lsa o'zi yoqiladi
 * - Soya xaritasi faqat labirint yuklanganda chiziladi (sahna qo'zg'almas, qahramonlarning soyasi — dog')
 * Interfeys 2D renderer bilan bir xil: load, setMe, setMyHero, setCleared, markCleared, revealExit,
 * setPlayers, setLocked, setMode, setZoom, zoomBy, setTag, start, stop, resize, setLowPower, destroy.
 */
import * as THREE from 'three';
import { prefersReducedMotion } from '../../core/settings.js';
import { BASE_URL } from '../../core/config.js';
import { heroUrl } from './heroes.js';

const FOV = 45;
const TAN = Math.tan((FOV * Math.PI) / 360);
const FIT_CELLS = 7; // follow rejimida ekranning tor tomonida taxminan shuncha katak
const MAX_ZOOM = 3.5;
const HERO_ASPECT = 0.72; // qahramon rasmi: eni / bo'yi
const WALK_SPEED = 4.6; // katak/soniya: bosib turganda qadamlar orasi (~240 ms) bilan bir xil, uzilishsiz yurish
// bir katakdagi qahramonlar: birinchisi (yoki o'zim) oldinda, qolganlari orqada va yonlarda
const OFFSETS = [[0, 0], [-0.3, -0.12], [0.3, -0.12], [0, -0.3], [-0.32, -0.32], [0.32, -0.32]];
const GREENS = [[0.25, 0.35, 0.88], [0.22, 0.45, 0.92], [0.28, 0.3, 0.8], [0.2, 0.4, 0.95], [0.3, 0.32, 0.85]];
const FLOWERS = [0xff8fb1, 0xffffff, 0xffd98a, 0xf6a6d0];
const norm = (c) => (Array.isArray(c) ? { x: c[0], y: c[1] } : c && c.x != null ? { x: c.x, y: c.y } : null);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (x, y) => `${x},${y}`;

/** Doimiy tezlik bilan siljish (sakrash emas, yurish). Ortda qolsa tezlashadi. @returns {number} gorizontal yo'nalish */
function glide(o, tx, ty, dt) {
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d < 1e-4) { o.x = tx; o.y = ty; return 0; }
  const stepLen = WALK_SPEED * Math.max(1, d) * dt;
  if (stepLen >= d) { o.x = tx; o.y = ty; } else { o.x += (dx / d) * stepLen; o.y += (dy / d) * stepLen; }
  return dx;
}

/** Deterministik tasodif: har safar bir xil bog' chiqadi. */
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Bo'rtiq shar: tepalari tasodifiy siljitilgan past poligonli shar (buta bo'lagi). */
function lumpy(r, ws, hs, amp, seed) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  const p = g.attributes.position;
  const R = rng(seed);
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let f = seen.get(k);
    if (f == null) { f = 1 + (R() - 0.5) * amp; seen.set(k, f); }
    p.setXYZ(i, x * f, y * f * 0.9, z * f);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Teksturani takrorlash uchun UV koordinatalarini kattalashtiradi (bitta tekstura hamma o'lchamga). */
function uvScale(geo, rx, ry = rx) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  uv.needsUpdate = true;
  return geo;
}

/** Savol belgisi ("?" yoki "✓") canvas'ga chiziladi. */
function drawBadge(c, text, bg) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#3B2F2F'; g.font = "700 74px Fredoka, system-ui, sans-serif";
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70);
}

export class MazeRenderer3D {
  /** @param {HTMLCanvasElement} canvas @param {{lowPower?:boolean, host?:boolean}} [opts] */
  constructor(canvas, { lowPower = false, host = false } = {}) {
    this.canvas = canvas;
    this.lowPower = lowPower;
    this.host = host;
    this.reduced = prefersReducedMotion();
    const r = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
    r.setClearColor(0xbfe3f2);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0x9fcf86, 1.15));
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
    this.sun.castShadow = !lowPower;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.loader = new THREE.TextureLoader();
    /** @type {Map<string, THREE.Texture>} */
    this.tex = new Map();

    // savol belgilari: fontlar yuklangach qayta chiziladi
    this._badgeCanvas = { q: document.createElement('canvas'), ok: document.createElement('canvas') };
    Object.values(this._badgeCanvas).forEach((c) => { c.width = c.height = 128; });
    this.badge = { q: new THREE.CanvasTexture(this._badgeCanvas.q), ok: new THREE.CanvasTexture(this._badgeCanvas.ok) };
    Object.values(this.badge).forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; });
    this._drawBadges();
    document.fonts?.ready.then(() => this._drawBadges()).catch(() => {});

    this.maze = null;
    this.pos = { x: 1, y: 1 };
    this.target = { x: 1, y: 1 };
    this.cleared = new Set();
    this.cps = [];
    this.exitObj = null;
    this.locked = false;
    this.me = this._makeHero(1, 0.95, 1);
    this.me.group.visible = !host;
    this.scene.add(this.me.group);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 32), new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.95, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
    /** @type {Map<any, any>} */
    this.others = new Map();

    this.mode = host ? 'map' : 'follow';
    this.zoom = 1;
    this.center = { x: 0, z: 0 };
    this.tagEl = null;
    /** @type {(z:number)=>void} */
    this.onZoom = null;
    this._offset = new THREE.Vector3(0, 1, 0.62);
    this._look = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._raf = 0; this._last = 0; this._frames = 0; this._acc = 0;

    this._bindInput();
    this._ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this._ro.observe(canvas.parentElement);
    this._applyPixelRatio();
  }

  // ---------- resurslar ----------

  /** @param {string} file public/lab ichidagi fayl */
  _texture(file) {
    let t = this.tex.get(file);
    if (!t) {
      t = this.loader.load(`${BASE_URL}lab/${file}`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.tex.set(file, t);
    }
    return t;
  }

  _heroTex(n) {
    const k = `hero-${n}`;
    let t = this.tex.get(k);
    if (!t) {
      t = this.loader.load(heroUrl(n));
      t.colorSpace = THREE.SRGBColorSpace;
      this.tex.set(k, t);
    }
    return t;
  }

  _drawBadges() {
    drawBadge(this._badgeCanvas.q, '?', '#FFD98A');
    drawBadge(this._badgeCanvas.ok, '✓', '#7FD1A8');
    this.badge.q.needsUpdate = true;
    this.badge.ok.needsUpdate = true;
  }

  /** Qahramon: rasm (pastki markazi oyog'ida) + soya dog'i. */
  _makeHero(n, h, opacity) {
    const group = new THREE.Group();
    // depthTest yo'q: kamera tomonga egilgan rasm boshi orqadagi butaga kirib ketmaydi, qahramon doim ko'rinadi
    // shaffof ro'yxatda eng oxirida chiziladi (savol belgilari va qasr ustida ham)
    const mat = new THREE.SpriteMaterial({ map: this._heroTex(n), alphaTest: 0.35, transparent: true, opacity, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = opacity < 1 ? 10 : 11;
    sprite.center.set(0.5, 0);
    sprite.scale.set(h * HERO_ASPECT, h, 1);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(h * 0.27, 20),
      new THREE.MeshBasicMaterial({ color: 0x2f4a22, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow, sprite);
    return { group, sprite, mat, h, hero: n, face: 1 };
  }

  _applyPixelRatio() {
    this.renderer.setPixelRatio(this.lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  }

  /** @param {boolean} on */
  setLowPower(on) {
    const changed = on !== this.lowPower;
    this.lowPower = on;
    this.sun.castShadow = !on;
    this.renderer.shadowMap.needsUpdate = true;
    this._applyPixelRatio();
    if (changed && this.maze) this._rebuild(); // butalar zichligi ham o'zgaradi
    else this.resize();
  }

  /** Shu labirintni holatini saqlagan holda qayta quradi (past quvvat rejimi almashganda). */
  _rebuild() {
    const st = { cleared: [...this.cleared], exit: this.maze.exit, pos: { ...this.pos }, target: { ...this.target }, zoom: this.zoom, center: { ...this.center } };
    const players = this._lastPlayers;
    this.load({ ...this._lastLoad, exit: st.exit });
    this.cps.forEach((cp) => { if (st.cleared.includes(key(cp.x, cp.y))) { this.cleared.add(key(cp.x, cp.y)); this._setCpCleared(cp); } });
    this.pos = st.pos; this.target = st.target;
    this.zoom = st.zoom; this.center = st.center;
    this.onZoom?.(this.zoom);
    if (players) this.setPlayers(...players);
    this._placeCamera(1);
  }

  // ---------- labirintni qurish ----------

  /** @param {{grid:any[],size:number,start:any,exit:any,checkpoints?:any[]}} m */
  load(m) {
    this._clearWorld();
    this._lastLoad = m;
    const S = m.size;
    const low = this.lowPower;
    this.maze = { grid: m.grid, size: S, exit: null };
    const start = norm(m.start) || { x: 1, y: 1 };
    this.pos = { ...start }; this.target = { ...start };
    this.cleared = new Set();
    const R = rng(S * 97 + 13);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const add = (o, shadow = false) => { o.receiveShadow = true; o.castShadow = shadow && !low; this.world.add(o); return o; };

    // o'tloq (atrof) va tosh yo'l
    const G = Math.max(60, S * 3);
    const grass = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(G, G), G / 3.6), new THREE.MeshLambertMaterial({ map: this._texture('tex-grass.webp') }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(S / 2, -0.01, S / 2);
    add(grass);
    const floor = new THREE.Mesh(uvScale(new THREE.PlaneGeometry(S, S), S / 3.6), new THREE.MeshLambertMaterial({ map: this._texture('tex-stone.webp') }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(S / 2, 0.002, S / 2);
    add(floor);

    // butalar: har devor katagi tagida o'tloq, ustida 4 ta past va 3 ta baland bo'lak
    const walls = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (String(m.grid[y][x]) === '1') walls.push([x, y]);
    const base = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.02, 1.02), new THREE.MeshLambertMaterial({ map: this._texture('tex-grass.webp') }), walls.length);
    const seg = low ? [6, 5] : [8, 6];
    const geos = [lumpy(0.42, seg[0], seg[1], 0.32, 11), lumpy(0.38, seg[0] - 1, seg[1], 0.36, 23), lumpy(0.46, seg[0] + 1, seg[1] + 1, 0.28, 37)];
    const leaf = new THREE.MeshLambertMaterial({ color: 0xffffff, map: this._texture('tex-leaves.webp') });
    const per = low ? 4 : 8;
    const blobs = geos.map((g) => { const im = new THREE.InstancedMesh(g, leaf, walls.length * per); im.count = 0; return im; });
    walls.forEach(([x, y], i) => {
      d.position.set(x + 0.5, 0.006, y + 0.5); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
      base.setMatrixAt(i, d.matrix);
      for (let j = 0; j < per; j++) {
        const lowRow = j < 4, q = j % 4;
        if (!lowRow && q === 3) continue;
        const im = blobs[(i + j) % 3];
        const sp = lowRow ? 0.2 : 0.13;
        d.position.set(
          x + 0.5 + (q % 2 ? sp : -sp) + (R() - 0.5) * 0.08,
          lowRow ? 0.26 + R() * 0.06 : 0.62 + R() * 0.14,
          y + 0.5 + (q < 2 ? -sp : sp) + (R() - 0.5) * 0.08,
        );
        d.rotation.set(R() * 3, R() * 3, R() * 3);
        const sc = lowRow ? 0.7 + R() * 0.15 : 0.66 + R() * 0.2;
        d.scale.set(sc, sc * (lowRow ? 0.85 : 0.9), sc);
        d.updateMatrix();
        im.setMatrixAt(im.count, d.matrix);
        const gc = GREENS[Math.floor(R() * GREENS.length)];
        col.setHSL(gc[0], gc[1], gc[2]);
        im.setColorAt(im.count, col);
        im.count += 1;
      }
    });
    add(base);
    blobs.forEach((im) => add(im, true));

    // butalardagi gullar
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }), walls.length * 2);
    let fi = 0;
    walls.forEach(([x, y]) => {
      if ((x * 31 + y * 17) % 3 !== 0) return;
      for (let j = 0; j < 2; j++) {
        d.position.set(x + 0.5 + (R() - 0.5) * 0.6, (low ? 0.5 : 0.86) + R() * 0.1, y + 0.5 + (R() - 0.5) * 0.6);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        fl.setMatrixAt(fi, d.matrix);
        col.set(FLOWERS[(x + y + j) % 4]);
        fl.setColorAt(fi, col);
        fi += 1;
      }
    });
    fl.count = fi;
    add(fl);

    // labirint atrofidagi daraxtlar
    const step = low ? 3.3 : 2.2;
    const n = Math.ceil((S + 3) / step) * 4;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 0.9, 7), new THREE.MeshLambertMaterial({ color: 0x8a5a3b, flatShading: true }), n);
    const crowns = [lumpy(0.55, 8, 6, 0.3, 51), lumpy(0.48, 7, 6, 0.34, 63)].map((g) => { const im = new THREE.InstancedMesh(g, leaf, n * 2); im.count = 0; return im; });
    trunks.count = 0;
    const tree = (x, z, h) => {
      d.rotation.set(0, R() * 6, 0); d.position.set(x, 0.45 * h, z); d.scale.set(h, h, h); d.updateMatrix();
      trunks.setMatrixAt(trunks.count++, d.matrix);
      [[0, 1.05, 0], [0.22, 0.9, 0.1], [-0.2, 0.95, -0.12], [0, 1.35, 0.05]].forEach(([dx, dy, dz], k) => {
        const im = crowns[k % 2];
        d.position.set(x + dx * h, dy * h, z + dz * h);
        d.rotation.set(R() * 3, R() * 3, R() * 3);
        const s = h * (0.9 + R() * 0.3);
        d.scale.set(s, s * 0.9, s); d.updateMatrix();
        im.setMatrixAt(im.count, d.matrix);
        const gc = GREENS[Math.floor(R() * GREENS.length)];
        col.setHSL(gc[0] + 0.03, gc[1], gc[2] - 0.12);
        im.setColorAt(im.count, col);
        im.count += 1;
      });
    };
    for (let t = -1; t <= S + 1 && trunks.count + 4 <= n; t += step) {
      tree(t + R() * 0.6, -1.4 - R() * 1.2, 1 + R() * 0.4);
      tree(-1.5 - R() * 1.2, t + R() * 0.6, 1 + R() * 0.4);
      tree(S + 1.5 + R(), t + R() * 0.6, 1 + R() * 0.4);
      tree(t + R() * 0.6, S + 1.6 + R(), 1 + R() * 0.4);
    }
    add(trunks, true);
    crowns.forEach((im) => add(im, true));

    // savol joylari
    const padGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.08, 24);
    this.cps = (m.checkpoints || []).map(norm).filter(Boolean).map((p) => {
      const pad = new THREE.Mesh(padGeo, new THREE.MeshLambertMaterial({ color: 0xf5c04a }));
      pad.position.set(p.x + 0.5, 0.04, p.y + 0.5);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.badge.q, transparent: true }));
      sprite.position.set(p.x + 0.5, 1.1, p.y + 0.5);
      sprite.scale.set(0.7, 0.7, 1);
      add(pad);
      this.world.add(sprite);
      return { x: p.x, y: p.y, pad, sprite };
    });

    if (m.exit) this.revealExit(m.exit);

    // quyosh va soya: butun labirintni qamraydi
    const half = S / 2 + 3;
    this.sun.position.set(S / 2 + 5, 14, S / 2 + 3);
    this.sun.target.position.set(S / 2, 0, S / 2);
    const sc = this.sun.shadow.camera;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = 40 + S;
    sc.updateProjectionMatrix();
    const size = S > 15 ? 2048 : 1024;
    if (this.sun.shadow.mapSize.width !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;

    this.me.group.position.set(start.x + 0.5, 0, start.y + 0.5);
    this.zoom = 1;
    this.center = { x: S / 2, z: S / 2 };
    this.resize();
    this._applyMode(true);
  }

  /** Qasr: savollar tugagach server finish katagini yuboradi. @param {any} exit */
  revealExit(exit) {
    const e = norm(exit);
    if (!e || !this.maze || this.exitObj) return;
    this.maze.exit = e;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._texture('castle.webp'), alphaTest: 0.3 }));
    sprite.scale.set(1.5, 1.5, 1);
    sprite.position.set(e.x + 0.5, 0.78, e.y + 0.5);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 24), new THREE.MeshLambertMaterial({ color: 0xdcd3f5 }));
    pad.position.set(e.x + 0.5, 0.025, e.y + 0.5);
    pad.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: this._texture('castle-top.webp'), transparent: true, depthWrite: false }));
    top.rotation.x = -Math.PI / 2;
    top.position.set(e.x + 0.5, 1.0, e.y + 0.5);
    this.world.add(sprite, pad, top);
    this.exitObj = { sprite, pad, top, born: performance.now() };
    this._applyExitView();
  }

  _applyExitView() {
    if (!this.exitObj) return;
    this.exitObj.sprite.visible = this.mode !== 'map';
    this.exitObj.top.visible = this.mode === 'map';
  }

  // ---------- holat ----------

  /** Bir katakdan uzoq (qaytish/yangi level) bo'lsa sakraydi, aks holda silliq yuradi. */
  setMe(x, y, snap = false) {
    // sakrash faqat haqiqiy ko'chishda (qaytish, yangi daraja); ketma-ket qadamlar silliq yuriladi
    const far = Math.abs(x - this.target.x) + Math.abs(y - this.target.y) > 1.6;
    const moved = x !== this.target.x || y !== this.target.y;
    this.target = { x, y };
    if (snap || far) this.pos = { x, y };
    if (moved && this._lastPlayers) this.setPlayers(...this._lastPlayers); // bir katakdagilar qayta joylashsin
  }

  /** @param {number} n qahramon raqami (1..8) */
  setMyHero(n) {
    if (!n || n === this.me.hero) return;
    this.me.hero = n;
    this.me.mat.map = this._heroTex(n);
    this.me.mat.needsUpdate = true;
  }

  /** @param {boolean} on */
  setLocked(on) {
    if (on === this.locked) return;
    this.locked = on;
    this.me.mat.color.setHex(on ? 0x9a9a9a : 0xffffff);
  }

  _setCpCleared(cp) {
    cp.sprite.material.map = this.badge.ok;
    cp.sprite.material.needsUpdate = true;
    cp.pad.material.color.setHex(0x7fd1a8);
  }

  /** @param {any} v koordinatalar/indekslar massivi yoki son */
  setCleared(v) {
    this.cleared = new Set();
    if (Array.isArray(v)) v.forEach((c) => { const p = typeof c === 'number' ? this.cps[c] : norm(c); if (p) this.cleared.add(key(p.x, p.y)); });
    else if (Number(v) > 0) this.cps.slice(0, Number(v)).forEach((p) => this.cleared.add(key(p.x, p.y)));
    this.cps.forEach((cp) => { if (this.cleared.has(key(cp.x, cp.y))) this._setCpCleared(cp); });
  }

  markCleared(x, y) {
    this.cleared.add(key(x, y));
    const cp = this.cps.find((c) => c.x === x && c.y === y);
    if (cp) this._setCpCleared(cp);
  }

  /**
   * Boshqa o'yinchilar (shu leveldagilar). Bir katakdagilar bir-birini yopmasligi uchun yonma-yon turadi.
   * @param {{id:any,x:number,y:number,hero?:number,eliminated?:boolean,kicked?:boolean}[]} list @param {any} meId
   */
  setPlayers(list, meId) {
    this._lastPlayers = [list, meId];
    const seen = new Set();
    const inCell = new Map();
    if (!this.host) inCell.set(key(this.target.x, this.target.y), 1);
    for (const p of list) {
      if (p.id === meId || p.eliminated || p.kicked) continue;
      const k = key(p.x, p.y);
      const i = inCell.get(k) || 0;
      inCell.set(k, i + 1);
      const off = OFFSETS[i % OFFSETS.length];
      const hero = p.hero || 1;
      let o = this.others.get(p.id);
      if (!o) {
        o = this._makeHero(hero, this.host ? 0.9 : 0.72, this.host ? 1 : 0.9);
        o.x = p.x + off[0]; o.y = p.y + off[1];
        o.group.position.set(o.x + 0.5, 0, o.y + 0.5);
        this.scene.add(o.group);
        this.others.set(p.id, o);
      } else if (o.hero !== hero) {
        o.hero = hero;
        o.mat.map = this._heroTex(hero);
        o.mat.needsUpdate = true;
      }
      o.tx = p.x + off[0]; o.ty = p.y + off[1];
      seen.add(p.id);
    }
    for (const [id, o] of this.others) {
      if (!seen.has(id)) { this.scene.remove(o.group); this._disposeObject(o.group); this.others.delete(id); }
    }
  }

  // ---------- kamera ----------

  /** @param {'follow'|'map'} m */
  setMode(m) {
    const next = this.host || m === 'map' ? 'map' : 'follow';
    if (next === this.mode) return;
    this.mode = next;
    this._applyMode(true);
  }

  _applyMode(snap) {
    const map = this.mode === 'map';
    this.camera.up.set(0, map ? 0 : 1, map ? -1 : 0);
    this.ring.visible = map && !this.host;
    if (this.tagEl) this.tagEl.hidden = !map || this.host;
    this._applyExitView();
    if (map && snap) { this.zoom = 1; if (this.maze) this.center = { x: this.maze.size / 2, z: this.maze.size / 2 }; this.onZoom?.(this.zoom); }
    if (snap) this._placeCamera(1);
  }

  /** "Sen shu yerdasan" yorlig'i (xarita rejimida qahramon ustida turadi). @param {HTMLElement|null} el */
  setTag(el) { this.tagEl = el; if (el) el.hidden = this.mode !== 'map' || this.host; }

  /** Xarita rejimida yaqinlashtirish (1 — butun labirint). Tugma bilan: qahramon tomonga. */
  setZoom(z, towardMe = false) {
    const nz = clamp(z, 1, MAX_ZOOM);
    if (towardMe && !this.host && nz > this.zoom) {
      const k = 1 - this.zoom / nz;
      this.center.x += (this.pos.x + 0.5 - this.center.x) * k;
      this.center.z += (this.pos.y + 0.5 - this.center.z) * k;
    }
    this.zoom = nz;
    this.onZoom?.(this.zoom);
  }

  zoomBy(f, towardMe = false) { this.setZoom(this.zoom * f, towardMe); }

  _mapDist() {
    const S = this.maze ? this.maze.size : 10;
    const need = S + 1.2;
    const a = this.camera.aspect || 1;
    return Math.max((need / 2) / TAN, (need / 2) / (TAN * a)) / this.zoom;
  }

  _clampCenter(dist) {
    const S = this.maze ? this.maze.size : 10;
    const hh = dist * TAN, hw = hh * (this.camera.aspect || 1);
    const m = 0.6;
    this.center.x = S + 2 * m > 2 * hw ? clamp(this.center.x, hw - m, S + m - hw) : S / 2;
    this.center.z = S + 2 * m > 2 * hh ? clamp(this.center.z, hh - m, S + m - hh) : S / 2;
  }

  /** @param {number} k silliqlik (1 = darhol) */
  _placeCamera(k) {
    if (this.mode === 'map') {
      const dist = this._mapDist();
      this._clampCenter(dist);
      this._tmp.set(this.center.x, dist, this.center.z + 0.001);
      this.camera.position.lerp(this._tmp, k);
      this._look.lerp(this._tmp.set(this.center.x, 0, this.center.z), k);
    } else {
      const tgt = this._tmp.set(this.pos.x + 0.5, 0, this.pos.y + 0.5);
      this._look.lerp(tgt, k);
      this.camera.position.lerp(tgt.add(this._offset), k);
    }
    this.camera.lookAt(this._look);
  }

  _bindInput() {
    const c = this.canvas;
    this._onWheel = (e) => {
      if (this.mode !== 'map') return;
      e.preventDefault();
      this.zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    let drag = null;
    this._onDown = (e) => { if (this.mode === 'map' && e.pointerType === 'mouse' && e.button === 0) { drag = { x: e.clientX, y: e.clientY }; c.style.cursor = 'grabbing'; } };
    this._onMove = (e) => {
      if (!drag) return;
      this._pan(e.clientX - drag.x, e.clientY - drag.y);
      drag = { x: e.clientX, y: e.clientY };
    };
    this._onUp = () => { drag = null; c.style.cursor = ''; };
    let pinch = null;
    const two = (t) => ({ d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    this._onTouchStart = (e) => { if (e.touches.length === 2 && this.mode === 'map') pinch = { ...two(e.touches), z: this.zoom }; };
    this._onTouchMove = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const n = two(e.touches);
      this.setZoom(pinch.z * (n.d / Math.max(20, pinch.d)));
      this._pan(n.x - pinch.x, n.y - pinch.y);
      pinch.x = n.x; pinch.y = n.y;
    };
    this._onTouchEnd = (e) => { if (e.touches.length < 2) pinch = null; };
    c.addEventListener('wheel', this._onWheel, { passive: false });
    c.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    c.addEventListener('touchstart', this._onTouchStart, { passive: true });
    c.addEventListener('touchmove', this._onTouchMove, { passive: false });
    c.addEventListener('touchend', this._onTouchEnd, { passive: true });
    c.style.touchAction = 'none';
  }

  _unbindInput() {
    const c = this.canvas;
    c.removeEventListener('wheel', this._onWheel);
    c.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    c.removeEventListener('touchstart', this._onTouchStart);
    c.removeEventListener('touchmove', this._onTouchMove);
    c.removeEventListener('touchend', this._onTouchEnd);
  }

  /** Ekrandagi siljish (px) xaritani shuncha suradi. */
  _pan(dx, dy) {
    const h = this.canvas.clientHeight || 1;
    const wpp = (2 * this._mapDist() * TAN) / h;
    this.center.x -= dx * wpp;
    this.center.z -= dy * wpp;
  }

  resize() {
    const box = this.canvas.parentElement;
    if (!box) return;
    const w = Math.max(200, box.clientWidth), h = Math.max(200, box.clientHeight);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const dist = (FIT_CELLS / 2) / (TAN * Math.min(1, aspect));
    this._offset.set(0, 1, 0.62).normalize().multiplyScalar(dist);
    if (this.maze) this._placeCamera(1);
  }

  // ---------- kadr ----------

  start() {
    if (this._raf) return;
    this._last = performance.now();
    const loop = (t) => {
      const dt = Math.min((t - this._last) / 1000, 0.05);
      this._last = t;
      this._update(dt, t);
      this.renderer.render(this.scene, this.camera);
      this._watchFps(dt);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this._raf); this._raf = 0; }

  /** FPS uzoq vaqt past bo'lsa, past quvvat rejimiga o'zi o'tadi. */
  _watchFps(dt) {
    if (this.lowPower) return;
    this._frames += 1; this._acc += dt;
    if (this._frames >= 90) {
      if (this._acc / this._frames > 0.045) this.setLowPower(true);
      this._frames = 0; this._acc = 0;
    }
  }

  _update(dt, t) {
    const dirX = glide(this.pos, this.target.x, this.target.y, dt);
    const moving = Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y) > 0.01;
    const walk = moving && !this.reduced;
    const bob = walk ? Math.abs(Math.sin(t / 85)) * 0.06 : 0;
    this._pose(this.me, dirX, walk, t);
    const shake = this.locked && !this.reduced ? Math.sin(t / 22) * 0.04 : 0;
    // tepadan qaraganda rasm polga yotib qolmasin: katak markazida, balandroqda (o'zim eng ustida)
    const map = this.mode === 'map';
    const anchor = map ? 0.5 : 0;
    this.me.group.position.set(this.pos.x + 0.5 + shake, 0, this.pos.y + 0.5);
    this.me.sprite.center.y = anchor;
    this.me.sprite.position.y = (map ? 0.8 : 0) + bob;
    this.ring.position.set(this.pos.x + 0.5, 0.03, this.pos.y + 0.5);

    for (const o of this.others.values()) {
      const odx = glide(o, o.tx, o.ty, dt);
      this._pose(o, odx, !this.reduced && Math.hypot(o.tx - o.x, o.ty - o.y) > 0.01, t);
      o.group.position.set(o.x + 0.5, 0, o.y + 0.5);
      o.sprite.center.y = anchor;
      o.sprite.position.y = map ? 0.6 : 0;
    }

    if (!this.reduced) {
      this.cps.forEach((cp, i) => {
        const done = this.cleared.has(key(cp.x, cp.y));
        cp.sprite.position.y = 1.1 + (done ? 0 : Math.sin(t / 300 + i) * 0.08);
        const s = done ? 0.5 : 0.7 + Math.sin(t / 250 + i) * 0.04;
        cp.sprite.scale.set(s, s, 1);
      });
      if (this.exitObj) {
        const age = Math.min(1, (performance.now() - this.exitObj.born) / 600); // paydo bo'lish
        const s = 1.5 * (0.6 + 0.4 * age) * (1 + Math.sin(t / 600) * 0.03);
        this.exitObj.sprite.scale.set(s, s, 1);
      }
    }

    this._placeCamera(this.reduced ? 1 : 1 - Math.exp(-7 * dt));

    if (this.tagEl && this.mode === 'map' && !this.host) {
      this._tmp.set(this.pos.x + 0.5, 0.9, this.pos.y + 0.5).project(this.camera);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      const x = (this._tmp.x + 1) / 2 * w, y = (1 - this._tmp.y) / 2 * h;
      const on = this._tmp.z < 1 && x > -40 && x < w + 40 && y > -20 && y < h + 20;
      this.tagEl.style.visibility = on ? 'visible' : 'hidden';
      this.tagEl.classList.toggle('is-left', x > w - 150); // o'ng chetda yorliq chap tomonga o'tadi
      this.tagEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
  }

  /** Yurish ko'rinishi: yurganda chap-o'ngga chayqaladi, chapga yursa rasm oynadek aylanadi. */
  _pose(o, dirX, walking, t) {
    if (Math.abs(dirX) > 0.02) o.face = dirX < 0 ? -1 : 1;
    o.sprite.scale.x = o.h * HERO_ASPECT * o.face;
    const r = walking ? Math.sin(t / 85) * 0.08 : 0;
    o.mat.rotation += (r - o.mat.rotation) * 0.35;
  }

  // ---------- tozalash ----------

  _disposeObject(obj) {
    obj.traverse((n) => {
      n.geometry?.dispose?.();
      const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
      mats.forEach((m) => m.dispose()); // teksturalar umumiy keshda, destroy() da bo'shatiladi
    });
  }

  _clearWorld() {
    [...this.world.children].forEach((c) => { this.world.remove(c); this._disposeObject(c); });
    this.cps = [];
    this.exitObj = null;
    for (const o of this.others.values()) { this.scene.remove(o.group); this._disposeObject(o.group); }
    this.others.clear();
  }

  /** Sahifadan chiqishda: GPU xotirasini to'liq bo'shatadi. */
  destroy() {
    this.stop();
    this._ro.disconnect();
    this._unbindInput();
    this._clearWorld();
    this._disposeObject(this.me.group);
    this._disposeObject(this.ring);
    this.tex.forEach((t) => t.dispose());
    this.tex.clear();
    Object.values(this.badge).forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
