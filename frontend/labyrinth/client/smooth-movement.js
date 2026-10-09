import * as THREE from 'three';

const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)); // eng qisqa burilish

/**
 * Server faqat butun katak {x,y} beradi. Biz ularni yo'l nuqtalari navbatiga qo'yib, avatarni
 * DOIMIY TEZLIK bilan yuritamiz (katak orasida easing yo'q — aks holda har katakda to'xtab-yurish bo'ladi).
 *  - Navbat o'sganda tezlik biroz oshadi (catch-up), tarmoq kechikishi sezilmaydi.
 *  - Masofa > 1.5 katak (respawn) bo'lsa sakramay, bir zumda joylashtiradi.
 */
export class PlayerView {
  #queue = []; #seg = null; #yaw = 0; #targetYaw = 0;

  constructor(object3D, { cellsPerSec = 5, maxCatchUp = 3, yawOffset = 0, turnSpeed = 14 } = {}) {
    this.object = object3D; this.cellsPerSec = cellsPerSec; this.maxCatchUp = maxCatchUp; this.yawOffset = yawOffset; this.turnSpeed = turnSpeed;
  }
  get isMoving() { return this.#seg !== null || this.#queue.length > 0; } // yurish animatsiyasini yoqish uchun
  get backlog() { return this.#queue.length + (this.#seg ? 1 : 0); }

  teleport(world) { this.#queue.length = 0; this.#seg = null; this.object.position.copy(world); }

  pushWaypoint(world) {
    const last = this.#queue.at(-1) ?? this.#seg?.to ?? this.object.position;
    if (last.distanceTo(world) > 1.5) return this.teleport(world);
    if (last.distanceToSquared(world) < 1e-6) return; // bir xil nuqta (ack va update ikkalasi ham keladi) -> e'tiborsiz
    this.#queue.push(world.clone());
  }

  update(dt) {
    let budget = this.cellsPerSec * Math.min(this.maxCatchUp, 1 + this.#queue.length * 0.5) * dt;
    while (budget > 1e-6 && (this.#seg || this.#queue.length)) {
      if (!this.#seg) {
        const from = this.object.position.clone(), to = this.#queue.shift();
        this.#seg = { from, to, len: from.distanceTo(to), d: 0 };
        this.#targetYaw = Math.atan2(to.x - from.x, to.z - from.z) + this.yawOffset;
      }
      const s = this.#seg, step = Math.min(budget, s.len - s.d);
      s.d += step; budget -= step; // ortgan masofa keyingi segmentga o'tadi -> katak chegarasida "qotish" yo'q
      this.object.position.lerpVectors(s.from, s.to, s.len ? s.d / s.len : 1);
      if (s.d >= s.len - 1e-6) { this.object.position.copy(s.to); this.#seg = null; }
    }
    this.#yaw += angleDelta(this.#yaw, this.#targetYaw) * (1 - Math.exp(-this.turnSpeed * dt));
    this.object.rotation.y = this.#yaw;
  }
}
