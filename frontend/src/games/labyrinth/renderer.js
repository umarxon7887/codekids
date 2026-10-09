/**
 * @file Labirint renderer (Canvas 2D) — `labyrinth:init` ma'lumotidan chizadi.
 * grid[y][x]: "1"=devor, "0"=yo'l (satrlar matn). Katta labirintlarda (size>11) kamera
 * qahramonni kuzatadi, shuning uchun kataklar kichrayib ketmaydi. Harakat — silliq interpolatsiya.
 */

const COLORS = { road: '#2d2a6e', wall: '#0f0d2e', edge: '#4b46c4', hero: '#6c5ce7', other: '#f472b6', ok: '#22c55e', cp: '#facc15' };
const MAX_VIEW = 11;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** @param {any} c @returns {{x:number,y:number}|null} */
const norm = (c) => (Array.isArray(c) ? { x: c[0], y: c[1] } : c && c.x != null ? { x: c.x, y: c.y } : null);

export class MazeRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.maze = null;
    this.cell = 32;
    this.view = 7;
    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    /** @type {Map<string,{x:number,y:number,tx:number,ty:number,nick:string}>} */
    this.others = new Map();
    this.cleared = new Set();
    this.speed = 16;
    this._raf = 0;
    this._last = 0;
    this._q = []; this._side = 0;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement);
  }

  /** @param {{grid:string[]|string[][],size:number,start:any,exit:any,checkpoints?:any[]}} m */
  load(m) {
    this.maze = {
      grid: m.grid, size: m.size, exit: norm(m.exit),
      checkpoints: (m.checkpoints || []).map(norm).filter(Boolean),
    };
    const s = norm(m.start) || { x: 0, y: 0 };
    this.pos = { ...s };
    this.target = { ...s };
    this.cleared = new Set();
    this.others.clear();
    this._q = []; this._side = 0;
    this.view = Math.min(m.size, MAX_VIEW);
    this.resize();
  }

  resize() {
    if (!this.maze) return;
    const box = this.canvas.parentElement.getBoundingClientRect();
    const side = Math.floor(Math.min(box.width || 320, window.innerHeight * 0.55));
    if (side === this._side) return;
    this._side = side;
    const dpr = window.devicePixelRatio || 1;
    this.cell = side / this.view;
    this.canvas.style.width = `${side}px`;
    this.canvas.style.height = `${side}px`;
    this.canvas.width = Math.round(side * dpr);
    this.canvas.height = Math.round(side * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Qahramon pozitsiyasi. Bir katakdan uzoq (teleport/checkpoint'ga qaytish) bo'lsa sakrab o'tadi,
   * aks holda silliq siljiydi.
   * @param {number} x @param {number} y @param {boolean} [snap]
   */
  setMe(x, y, snap = false) {
    const last = this._q.at(-1) ?? this.target;
    if (snap || Math.abs(x - last.x) + Math.abs(y - last.y) > 1.6) {
      this._q.length = 0; this.pos = { x, y }; this.target = { x, y }; return;
    }
    if (x !== last.x || y !== last.y) this._q.push({ x, y });
  }

  /** `you.cleared`: koordinatalar/indekslar massivi yoki son bo'lishi mumkin. @param {any} v */
  setCleared(v) {
    this.cleared = new Set();
    const cps = this.maze?.checkpoints || [];
    if (Array.isArray(v)) {
      v.forEach((c) => { const p = typeof c === 'number' ? cps[c] : norm(c); if (p) this.cleared.add(`${p.x},${p.y}`); });
    } else if (Number(v) > 0) {
      cps.slice(0, Number(v)).forEach((p) => this.cleared.add(`${p.x},${p.y}`));
    }
  }

  /** @param {number} x @param {number} y */
  markCleared(x, y) { this.cleared.add(`${x},${y}`); }

  /** @param {{id:any,nickname?:string,x:number,y:number,eliminated?:boolean}[]} list @param {any} meId */
  setPlayers(list, meId) {
    const seen = new Set();
    for (const p of list) {
      if (p.id === meId || p.eliminated) continue;
      seen.add(p.id);
      const o = this.others.get(p.id);
      if (o) { if (Math.abs(p.x - o.tx) + Math.abs(p.y - o.ty) > 1.6) { o.x = p.x; o.y = p.y; } o.tx = p.x; o.ty = p.y; } else this.others.set(p.id, { x: p.x, y: p.y, tx: p.x, ty: p.y, nick: p.nickname || '?' });
    }
    for (const id of [...this.others.keys()]) if (!seen.has(id)) this.others.delete(id);
  }

  start() {
    if (this._raf) return;
    this._last = performance.now();
    const loop = (t) => {
      const dt = Math.min((t - this._last) / 1000, 0.05);
      this._last = t;
      if (this._q.length && Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y) < 0.15) this.target = this._q.shift();
     const k = 1 - Math.exp(-this.speed * (1 + this._q.length * 0.5) * dt);
      this.pos.x += (this.target.x - this.pos.x) * k;
      this.pos.y += (this.target.y - this.pos.y) * k;
      for (const o of this.others.values()) { o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; }
      this._draw(t);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this._raf); this._raf = 0; }
  destroy() { this.stop(); window.removeEventListener('resize', this._onResize); this._ro?.disconnect(); }

  _draw(t) {
    if (!this.maze) return;
    const { ctx, cell: c, maze, view } = this;
    const side = c * view;
    ctx.clearRect(0, 0, side, side);
    const camX = clamp(this.pos.x - (view - 1) / 2, 0, maze.size - view);
    const camY = clamp(this.pos.y - (view - 1) / 2, 0, maze.size - view);
    ctx.save();
    ctx.translate(-camX * c, -camY * c);

    const x0 = Math.floor(camX), y0 = Math.floor(camY);
    for (let y = y0; y < Math.min(maze.size, y0 + view + 1); y++) {
      for (let x = x0; x < Math.min(maze.size, x0 + view + 1); x++) {
        const wall = String(maze.grid[y][x]) === '1';
        ctx.fillStyle = wall ? COLORS.wall : COLORS.road;
        ctx.fillRect(x * c, y * c, c, c);
        if (wall) { ctx.strokeStyle = COLORS.edge; ctx.lineWidth = 2; ctx.strokeRect(x * c + 1, y * c + 1, c - 2, c - 2); }
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${c * 0.55}px system-ui`;
    for (const p of maze.checkpoints) {
      const done = this.cleared.has(`${p.x},${p.y}`);
      ctx.globalAlpha = done ? 0.9 : 0.6 + 0.3 * Math.sin(t / 250);
      ctx.fillStyle = done ? COLORS.ok : COLORS.cp;
      ctx.fillRect(p.x * c + c * 0.12, p.y * c + c * 0.12, c * 0.76, c * 0.76);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillText(done ? '✓' : '?', (p.x + 0.5) * c, (p.y + 0.5) * c);
    }
    if (maze.exit) ctx.fillText('🏁', (maze.exit.x + 0.5) * c, (maze.exit.y + 0.5) * c);
    for (const o of this.others.values()) this._hero(o.x, o.y, COLORS.other, o.nick[0]?.toUpperCase());
    this._hero(this.pos.x, this.pos.y, COLORS.hero, '😀');
    ctx.restore();
  }

  _hero(gx, gy, color, label) {
    const { ctx, cell: c } = this;
    const cx = (gx + 0.5) * c, cy = (gy + 0.5) * c, r = c * 0.36;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${c * 0.4}px system-ui`;
    ctx.fillText(label || '', cx, cy + 1);
  }
}
