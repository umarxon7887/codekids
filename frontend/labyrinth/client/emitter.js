export class Emitter {
  #h = new Map();
  on(ev, fn) { (this.#h.get(ev) ?? this.#h.set(ev, new Set()).get(ev)).add(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this.#h.get(ev)?.delete(fn); }
  emit(ev, data) { this.#h.get(ev)?.forEach((fn) => fn(data)); }
}
