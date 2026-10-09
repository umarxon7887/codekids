// Seed asosidagi deterministik labirint: bir xil seed + o'lcham = bir xil xarita.
// grid[y][x]: 1 = devor, 0 = yo'l. Yo'llar toq koordinatalarda (1, 3, 5, ...).

export const MOVES = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(seed, size) {
  if (!Number.isInteger(size) || size < 5 || size % 2 === 0) {
    throw new Error("Labirint o'lchami toq va kamida 5 bo'lishi kerak");
  }

  const rand = mulberry32(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(1));

  grid[1][1] = 0;
  const stack = [[1, 1]];
  const steps = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];

    const options = steps.filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && grid[ny][nx] === 1;
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const [dx, dy] = options[Math.floor(rand() * options.length)];
    grid[y + dy / 2][x + dx / 2] = 0; // ikki katak orasidagi devorni ochamiz
    grid[y + dy][x + dx] = 0;
    stack.push([x + dx, y + dy]);
  }

  return grid;
}

export function toRows(grid) {
  return grid.map((row) => row.join(''));
}

export function exitCell(size) {
  return { x: size - 2, y: size - 2 };
}

// Toq koordinatali kataklarning uchdan bir qismi checkpoint (savol beriladi).
// Start va exit checkpoint emas.
export function isCheckpoint(x, y, size) {
  if (x % 2 !== 1 || y % 2 !== 1) return false;
  if ((x === 1 && y === 1) || (x === size - 2 && y === size - 2)) return false;
  return ((x - 1) / 2 + (y - 1) / 2) % 3 === 1;
}