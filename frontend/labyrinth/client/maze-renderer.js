import * as THREE from 'three';
import { isWall } from './constants.js';

/**
 * init payload -> 3D sahna. grid: string massivi, grid[y][x]. Client hech narsa generatsiya qilmaydi.
 * assets (ixtiyoriy): { wallGeometry, wallMaterial, exitObject } — tosh va tuxum GLB modellari shu yerga ulanadi.
 */
export class MazeRenderer {
  constructor(scene, assets = {}) { this.scene = scene; this.assets = assets; this.group = new THREE.Group(); scene.add(this.group); this.size = 0; this.grid = []; this.plates = new Map(); this.exitObj = null; }

  cellToWorld(x, y, out = new THREE.Vector3()) { const o = (this.size - 1) / 2; return out.set(x - o, 0, y - o); }
  isWalkable(x, y) { return !isWall(this.grid, x, y); }

  build({ size, grid, start, exit, checkpoints = [] }) {
    this.clear();
    if (!Array.isArray(grid) || grid.length !== size || grid.some((r) => r.length !== size)) throw new Error('Noto\'g\'ri grid');
    this.size = size; this.grid = grid;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(size, 0.1, size), new THREE.MeshStandardMaterial({ color: 0xe9dcb6, roughness: 1 }));
    floor.position.y = -0.05; this.group.add(floor);

    const walls = []; // bitta InstancedMesh = bitta draw call
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid[y][x] === '1') walls.push([x, y]);
    const geo = this.assets.wallGeometry ?? new THREE.BoxGeometry(1, 0.8, 1);
    const mat = this.assets.wallMaterial ?? new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.95 });
    const inst = new THREE.InstancedMesh(geo, mat, walls.length), d = new THREE.Object3D(), p = new THREE.Vector3();
    walls.forEach(([x, y], i) => {
      this.cellToWorld(x, y, p); d.position.set(p.x, 0.4, p.z);
      d.rotation.y = (((x * 73856093) ^ (y * 19349663)) & 3) * (Math.PI / 2);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    });
    this.group.add(inst);

    this.#disc(start, 0x34d399, 0.4);
    if (this.assets.exitObject) { this.exitObj = this.assets.exitObject.clone(); this.cellToWorld(exit.x, exit.y, this.exitObj.position); this.group.add(this.exitObj); }
    else this.exitObj = this.#disc(exit, 0xffc83d, 0.45);

    for (const c of checkpoints) this.plates.set(`${c.x},${c.y}`, this.#disc(c, 0x6366f1, 0.32)); // "?" plitalari
  }

  #disc({ x, y }, color, r) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    this.cellToWorld(x, y, m.position); m.position.y = 0.02; this.group.add(m); return m;
  }

  markCleared(x, y) { this.plates.get(`${x},${y}`)?.material.color.set(0x9ca3af); }
  update(dt) { if (this.exitObj) this.exitObj.rotation.y += dt * 1.5; }

  fitCamera(camera) {
    const vf = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const half = this.size / 2 + 1, dist = Math.max(half / Math.tan(vf / 2), half / Math.tan(hf / 2));
    camera.position.set(0, dist * 0.93, dist * 0.37); camera.lookAt(0, 0, 0);
  }

  clear() { this.group.traverse((o) => o.geometry?.dispose?.()); this.group.clear(); this.plates.clear(); this.exitObj = null; }
}
