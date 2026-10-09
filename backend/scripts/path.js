import { generateMaze } from '../src/utils/mazeGenerator.js';

const seed = Number(process.env.SEED);
const size = Number(process.env.SIZE) || 11;
const [sx, sy] = process.env.FROM.split(',').map(Number);
const [tx, ty] = process.env.TO.split(',').map(Number);
const g = generateMaze(seed, size);

const q = [[sx, sy, []]];
const seen = new Set([`${sx},${sy}`]);
while (q.length) {
  const [x, y, path] = q.shift();
  if (x === tx && y === ty) {
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
