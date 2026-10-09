import { Emitter } from './emitter.js';
import { State } from './constants.js';

// LOBBY = kutish zali (init keldi, status "waiting"). GENERATING = join yuborildi, init kutilmoqda.
const ALLOWED = {
  [State.LOBBY]:      [State.GENERATING, State.PLAYING, State.FINISHED],
  [State.GENERATING]: [State.LOBBY, State.PLAYING, State.FINISHED],
  [State.PLAYING]:    [State.ANSWERING, State.FINISHED, State.GENERATING, State.LOBBY],
  [State.ANSWERING]:  [State.PLAYING, State.FINISHED, State.GENERATING],
  [State.FINISHED]:   [State.GENERATING, State.LOBBY],
};
export class GameStateMachine extends Emitter {
  state = State.LOBBY;
  spectator = false; // eliminated bo'lgan o'yinchi
  go(next, payload) {
    if (next === this.state) return true;
    if (!ALLOWED[this.state].includes(next)) { console.warn(`[state] ${this.state} -> ${next} ruxsat etilmagan`); return false; }
    const prev = this.state; this.state = next; this.emit('change', { prev, next, payload }); return true;
  }
  get canMove() { return this.state === State.PLAYING; }
}
