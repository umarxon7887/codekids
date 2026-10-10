/**
 * @file 3D labirint renderer (Three.js). `labyrinth:init` ma'lumotidan quradi.
 * - Devorlar: bitta InstancedMesh (41x41 gacha ham 1 draw call)
 * - Pol: bitta tekstura (canvas) — har katak uchun alohida mesh yo'q
 * - Kamera: yuqoridan burchakli, qahramonni silliq kuzatadi, ekranga qarab zoom
 * - Past quvvat rejimi: pixelRatio 1, soyasiz; FPS past bo'lsa avtomatik yoqiladi
 * - prefers-reduced-motion: kamera sakramaydi, bobbing/pulsatsiya o'chiq
 * Interfeys 2D renderer bilan bir xil: load, setMe, setCleared, markCleared, setPlayers, setLocked, start, stop, resize, destroy.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { prefersReducedMotion } from '../../core/settings.js';

const FOV = 45;
const FIT_CELLS = 8; // ekran kengligida taxminan shuncha katak ko'rinadi
const PLAYER_COLORS = [0xf472b6, 0x38bdf8, 0xa3e635, 0xfb923c, 0xc084fc, 0x2dd4bf];
const norm = (c) => (Array.isArray(c) ? { x: c[0], y: c[1] } : c && c.x != null ? { x: c.x, y: c.y } : null);
const lerpAngle = (a, b, k) => a + ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;

/** Doira belgi teksturasi ("?" yoki "✓"). */
function badgeTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#1e1b4b'; g.font = 'bold 78px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Qahramon: kapsula tana + ko'zlar. @param {number} color @param {number} scale @param {number} opacity */
function makeHero(color, scale = 1, opacity = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.28, 4, 10), mat);
  body.position.y = 0.36;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: opacity < 1, opacity });
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const e1 = new THREE.Mesh(eyeGeo, eyeMat), e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.09, 0.46, 0.19); e2.position.set(0.09, 0.46, 0.19);
  g.add(body, e1, e2);
  g.scale.setScalar(scale);
  g.userData = { mat, baseColor: color };
  return g;
}

export class MazeRenderer3D {
  /** @param {HTMLCanvasElement} canvas @param {{lowPower?:boolean}} [opts] */
  constructor(canvas, { lowPower = false } = {}) {
    this.canvas = canvas;
    this.lowPower = lowPower;
    this.reduced = prefersReducedMotion();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower && window.innerWidth > 700, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x1e1b4b);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4b46c4, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(6, 12, 4);
    this.scene.add(sun);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.qTex = badgeTexture('?', '#facc15');
    this.okTex = badgeTexture('✓', '#22c55e');

    this.maze = null;
    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.hero = makeHero(0xff7a59);
    this.scene.add(this.hero);
    this.others = new Map();
    this.cps = [];
    this.cleared = new Set();
    this.locked = false;
    this._yaw = 0;
    this._offset = new THREE.Vector3(0, 1, 0.62);
    this.mode = 'follow';
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enabled = false;
    this.orbit.enableDamping = true;
    this._blockTouch = (e) => { if (this.mode === 'overview') e.stopImmediatePropagation(); };
    this._ui();
    this._look = new THREE.Vector3();
    this._raf = 0; this._last = 0; this._frames = 0; this._acc = 0;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._applyPixelRatio();
  }

  _applyPixelRatio() {
    this.renderer.setPixelRatio(this.lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  }

  /** @param {boolean} on */
  setLowPower(on) { this.lowPower = on; this._applyPixelRatio(); this.resize(); }

  /** @param {boolean} on */
  setLocked(on) {
    if (on === this.locked) return;
    this.locked = on;
    this.hero.userData.mat.color.setHex(on ? 0x9ca3af : this.hero.userData.baseColor);
  }

  /** @param {{grid:any[],size:number,start:any,exit:any,checkpoints?:any[]}} m */
  load(m) {
    this._clearWorld();
    const size = m.size;
    this.maze = { grid: m.grid, size, exit: norm(m.exit) };
    const start = norm(m.start) || { x: 1, y: 1 };
    this.pos = { ...start }; this.target = { ...start };
    this.cleared = new Set();

    // pol (bitta tekstura)
    const px = 16, fc = document.createElement('canvas');
    fc.width = fc.height = size * px;
    const g = fc.getContext('2d');
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      g.fillStyle = (x + y) % 2 ? '#2f2c78' : '#38358f';
      g.fillRect(x * px, y * px, px, px);
    }
    const floorTex = new THREE.CanvasTexture(fc);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.magFilter = THREE.NearestFilter;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(size / 2, 0, size / 2);
    this.world.add(floor);

    // devorlar (InstancedMesh)
    const walls = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (String(m.grid[y][x]) === '1') walls.push([x, y]);
    const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.9, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), walls.length);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    walls.forEach(([x, y], i) => {
      dummy.position.set(x + 0.5, 0.45, y + 0.5); dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.68, 0.62, 0.5 + ((x * 7 + y * 13) % 5) * 0.015); // yengil rang farqi
      wallMesh.setColorAt(i, col);
    });
    wallMesh.instanceMatrix.needsUpdate = true;
    if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;
    this.world.add(wallMesh);

    // checkpoint'lar
    this.cps = (m.checkpoints || []).map(norm).filter(Boolean).map((p, i) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 20), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
      base.position.set(p.x + 0.5, 0.03, p.y + 0.5);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.qTex, transparent: true }));
      sprite.position.set(p.x + 0.5, 0.85, p.y + 0.5); sprite.scale.set(0.6, 0.6, 1);
      this.world.add(base, sprite);
      return { x: p.x, y: p.y, base, sprite, i };
    });

    // finish: bayroq
    if (this.maze.exit) {
      const { x, y } = this.maze.exit;
      const flag = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      pole.position.y = 0.55;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }));
      cloth.position.set(0.25, 0.95, 0);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), new THREE.MeshLambertMaterial({ color: 0x22c55e }));
      pad.position.y = 0.025;
      flag.add(pole, cloth, pad);
      flag.position.set(x + 0.5, 0, y + 0.5);
      this.flag = flag;
      this.world.add(flag);
    }

    this.hero.position.set(start.x + 0.5, 0.0, start.y + 0.5);
    this.resize();
    this._snapCamera();
  }

  resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(240, Math.floor(box.width || 320));
    const h = Math.max(260, Math.floor(Math.min(window.innerHeight * 0.6, w * 1.15)));
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const dist = (FIT_CELLS / 2) / (Math.tan((FOV * Math.PI) / 360) * Math.min(1, aspect));
    this._offset.set(0, 1, 0.62).normalize().multiplyScalar(dist);
  }

  /** Bir katakdan uzoq (teleport/qaytish) bo'lsa sakraydi, aks holda silliq siljiydi. */
  setMe(x, y, snap = false) {
    const far = Math.abs(x - this.pos.x) + Math.abs(y - this.pos.y) > 1.6;
    this.target = { x, y };
    if (snap || far) this.pos = { x, y };
  }

  _setCpCleared(cp) {
    cp.sprite.material.map = this.okTex; cp.sprite.material.needsUpdate = true;
    cp.base.material.color.setHex(0x22c55e);
  }

  /** @param {any} v koordinatalar/indekslar massivi yoki son */
  setCleared(v) {
    this.cleared = new Set();
    const keys = [];
    if (Array.isArray(v)) v.forEach((c) => { const p = typeof c === 'number' ? this.cps[c] : norm(c); if (p) keys.push(`${p.x},${p.y}`); });
    else if (Number(v) > 0) this.cps.slice(0, Number(v)).forEach((p) => keys.push(`${p.x},${p.y}`));
    keys.forEach((k) => this.cleared.add(k));
    this.cps.forEach((cp) => { if (this.cleared.has(`${cp.x},${cp.y}`)) this._setCpCleared(cp); });
  }

  markCleared(x, y) {
    this.cleared.add(`${x},${y}`);
    const cp = this.cps.find((c) => c.x === x && c.y === y);
    if (cp) this._setCpCleared(cp);
  }

  /** @param {{id:any,nickname?:string,x:number,y:number,eliminated?:boolean,kicked?:boolean}[]} list @param {any} meId */
  setPlayers(list, meId) {
    const seen = new Set();
    list.forEach((p, idx) => {
      if (p.id === meId || p.eliminated || p.kicked) return;
      seen.add(p.id);
      const o = this.others.get(p.id);
      if (o) { o.tx = p.x; o.ty = p.y; return; }
      const mesh = makeHero(PLAYER_COLORS[idx % PLAYER_COLORS.length], 0.72, 0.55); // kichik va xira
      mesh.position.set(p.x + 0.5, 0, p.y + 0.5);
      this.scene.add(mesh);
      this.others.set(p.id, { mesh, x: p.x, y: p.y, tx: p.x, ty: p.y });
    });
    for (const [id, o] of this.others) {
      if (!seen.has(id)) { this.scene.remove(o.mesh); this._disposeObject(o.mesh); this.others.delete(id); }
    }
  }

  setMode(m) {
    this.mode = m === 'overview' ? 'overview' : 'follow';
    this.orbit.enabled = this.mode === 'overview';
    if (this.mode === 'overview') this._frameOverview();
    else this._snapCamera();
  }

  resetView() {
    if (this.mode === 'overview') this._frameOverview();
    else { this.resize(); this._snapCamera(); }
  }

  _frameOverview() {
    const s = this.maze ? this.maze.size : 10;
    const c = new THREE.Vector3(s / 2, 0, s / 2);
    const d = s * 1.15;
    this.orbit.target.copy(c);
    this.orbit.minDistance = 2;
    this.orbit.maxDistance = s * 2.5;
    this.camera.position.set(c.x, d * 0.85, c.z + d * 0.6);
    this.camera.lookAt(c);
    this.orbit.update();
  }

  _ui() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    const bar = document.createElement('div');
    bar.className = 'cam-bar';
    bar.style.cssText = 'position:absolute;top:8px;right:8px;display:flex;gap:6px;z-index:3';
    const items = [['follow', '🐔 Kuzatish', 'Kuzatish'], ['overview', '🗺 Butun labirint', 'Butun labirint'], ['reset', '↺', "Asl ko'rinish"]];
    for (const [k, label, aria] of items) {
      const b = document.createElement('button');
      b.dataset.m = k;
      b.textContent = label;
      b.setAttribute('aria-label', aria);
      b.style.cssText = 'min-height:40px;padding:6px 10px;border:0;border-radius:10px;font-weight:700;background:rgba(20,20,40,.55);color:#fff';
      bar.appendChild(b);
    }
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.m === 'reset') this.resetView();
      else this.setMode(b.dataset.m);
    });
    parent.appendChild(bar);
    this._bar = bar;
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('touchstart', this._blockTouch, { capture: true, passive: true });
    this.canvas.addEventListener('touchend', this._blockTouch, { capture: true, passive: true });
  }

  _unUi() {
    this._bar?.remove();
    this.canvas.removeEventListener('touchstart', this._blockTouch, { capture: true });
    this.canvas.removeEventListener('touchend', this._blockTouch, { capture: true });
    this.orbit?.dispose();
  }

  _snapCamera() {
    const t = new THREE.Vector3(this.pos.x + 0.5, 0, this.pos.y + 0.5);
    this._look.copy(t);
    this.camera.position.copy(t).add(this._offset);
    this.camera.lookAt(this._look);
  }

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

  /** FPS uzoq vaqt past bo'lsa, past quvvat rejimiga avtomatik o'tadi. */
  _watchFps(dt) {
    if (this.lowPower) return;
    this._frames += 1; this._acc += dt;
    if (this._frames >= 90) {
      if (this._acc / this._frames > 0.04) this.setLowPower(true);
      this._frames = 0; this._acc = 0;
    }
  }

  _update(dt, t) {
    const k = 1 - Math.exp(-16 * dt);
    this.pos.x += (this.target.x - this.pos.x) * k;
    this.pos.y += (this.target.y - this.pos.y) * k;
    const dx = this.target.x - this.pos.x, dz = this.target.y - this.pos.y;
    const moving = Math.hypot(dx, dz) > 0.03;
    if (moving) this._yaw = lerpAngle(this._yaw, Math.atan2(dx, dz), 1 - Math.exp(-18 * dt));

    const bob = moving && !this.reduced ? Math.abs(Math.sin(t / 70)) * 0.08 : 0;
    const shake = this.locked && !this.reduced ? Math.sin(t / 22) * 0.04 : 0;
    this.hero.position.set(this.pos.x + 0.5 + shake, bob, this.pos.y + 0.5);
    this.hero.rotation.y = this._yaw;

    for (const o of this.others.values()) {
      o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
      o.mesh.position.set(o.x + 0.5, 0, o.y + 0.5);
    }

    if (!this.reduced) {
      this.cps.forEach((cp, i) => {
        const done = this.cleared.has(`${cp.x},${cp.y}`);
        cp.sprite.position.y = 0.85 + (done ? 0 : Math.sin(t / 300 + i) * 0.08);
        const s = done ? 0.5 : 0.6 + Math.sin(t / 250 + i) * 0.05;
        cp.sprite.scale.set(s, s, 1);
      });
      if (this.flag) this.flag.rotation.y = Math.sin(t / 500) * 0.25;
    }

    // kamera
    const ck = this.reduced ? 1 : 1 - Math.exp(-7 * dt);
    const tgt = new THREE.Vector3(this.pos.x + 0.5, 0, this.pos.y + 0.5);
    if (this.mode === 'follow') {
      this._look.lerp(tgt, ck);
      this.camera.position.lerp(tgt.clone().add(this._offset), ck);
      this.camera.lookAt(this._look);
    } else {
      this.orbit.update();
    }
  }

  _disposeObject(obj) {
    obj.traverse((n) => {
      n.geometry?.dispose?.();
      const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
      mats.forEach((m) => { if (m.map && m.map !== this.qTex && m.map !== this.okTex) m.map.dispose(); m.dispose(); });
    });
  }

  _clearWorld() {
    [...this.world.children].forEach((c) => { this.world.remove(c); this._disposeObject(c); });
    this.cps = []; this.flag = null;
    for (const o of this.others.values()) { this.scene.remove(o.mesh); this._disposeObject(o.mesh); }
    this.others.clear();
  }

  /** Sahifadan chiqishda: GPU xotirasini to'liq bo'shatadi. */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize); this._unUi();
    this._clearWorld();
    this._disposeObject(this.hero);
    this.qTex.dispose(); this.okTex.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
