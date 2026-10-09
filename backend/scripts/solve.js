import { generateMaze } from '../src/utils/mazeGenerator.js';

const seed = Number(process.env.SEED);
const size = Number(process.env.SIZE) || 11;
const g = generateMaze(seed, size);
const end = size - 2;

const q = [[1, 1, []]];
const seen = new Set(['1,1']);
while (q.length) {
  const [x, y, path] = q.shift();
  if (x === end && y === end) {
    console.log(path.join(' '));
    break;
  }
  for (const [dx, dy, d] of [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']]) {
    const nx = x + dx;
    const ny = y + dy;
    const k = `${nx},${ny}`;
    if (nx >= 0 && ny >= 0 && nx < size && ny < size && g[ny][nx] === 0 && !seen.has(k)) {
      seen.add(k);
      q.push([nx, ny, [...path, d]]);
    }
  }
}
