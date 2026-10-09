import assert from 'node:assert/strict';
import { LabyrinthRoom, bfsPath, dirOf, QUESTIONS } from './core.js';
const go = (room, p, c, t) => room.move(p, dirOf(p, c), t); // maqsad katakka qarab 'direction' hisoblaydi
const room = new LabyrinthRoom({ size: 11, seed: 7 }), a = room.join('devA'), b = room.join('devB');
let t = 1000; const step = () => (t += 250);
assert.equal(room.move(a, 'down', t).error.code, 'ROOM_NOT_ACTIVE'); room.start(t);
// 1) labirint seed bo'yicha bir xil
assert.deepEqual(new LabyrinthRoom({ size: 11, seed: 7 }).maze.grid, room.maze.grid);
// 2) devor va uzoq katak rad etiladi
assert.equal(room.move(a, 'up', step()).error.code, 'BLOCKED'); assert.equal(room.move(a, 'left', step()).error.code, 'BLOCKED'); assert.equal(room.move(a, 'north', step()).error.code, 'VALIDATION_ERROR');
// 3) TOO_FAST
const path = bfsPath(room.maze.grid, room.maze.start, room.maze.exit); assert.ok(path.length > 10);
assert.equal(go(room, b, path[0], t).ok, true); assert.equal(go(room, b, path[1], t + 50).error.code, 'TOO_FAST');
// 4) to'liq o'tish: savollarga to'g'ri javob; QUESTION_PENDING; finish + rank + bonus
let asked = 0;
for (const c of path) {
  const r = go(room, a, c, step()); assert.ok(r.ok, JSON.stringify(r));
  if (r.question) { asked++; assert.equal(room.move(a, 'down', step()).error.code, 'QUESTION_PENDING');
    const q = a.pending, ch = q.order.indexOf(QUESTIONS[q.qi].answer); assert.equal(r.question.options[ch], QUESTIONS[q.qi].options[QUESTIONS[q.qi].answer]);
    const ans = room.answer(a, ch, step()); assert.ok(ans.correct); }
}
assert.ok(a.finished && a.rank === 1); assert.equal(a.score, asked * 10 + 50); console.log('yo\'l:', path.length, 'savol:', asked, 'ball:', a.score);
// 5) noto'g'ri javob: jon -1, lock, qaytarish; keyin boshqa savol
const room2 = new LabyrinthRoom({ size: 11, seed: 7 }), p = room2.join('x'); room2.start(0); let tt = 0;
for (const c of bfsPath(room2.maze.grid, room2.maze.start, room2.maze.exit)) { const r = go(room2, p, c, (tt += 250)); if (r.question) break; }
const wrong = [0, 1, 2].find((i) => p.pending.order[i] !== QUESTIONS[p.pending.qi].answer), first = p.pending.qi;
const res = room2.answer(p, wrong, tt); assert.equal(res.correct, false); assert.equal(res.lives, 2); assert.deepEqual([res.x, res.y], [1, 1]); assert.ok(res.lockedUntil > tt);
assert.equal(room2.move(p, 'down', tt + 100).error.code, 'LOCKED');
// 6) jon 0 => eliminated + finished
for (let i = 0; i < 2; i++) { p.pending = { qi: 0, order: [0, 1, 2] }; room2.answer(p, 1, tt); }
assert.ok(p.eliminated && p.finished && p.lives === 0);
console.log('hamma testlar o\'tdi ✅');
