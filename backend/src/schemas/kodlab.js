import { z } from 'zod';
import { KL_LEVELS } from '../data/kodlabLevels.js';

/** Dastur bloki: { t: 'F'|'L'|'R' } yoki { t: 'REP', n: 2..10, b: [...] }. Chuqurlik/son serverda ham tekshiriladi. */
const block = z.lazy(() =>
  z.union([
    z.object({ t: z.enum(['F', 'L', 'R']) }).strict(),
    z.object({ t: z.literal('REP'), n: z.number().int().min(2).max(10), b: z.array(block).max(30) }).strict(),
  ])
);

export const solveSchema = z
  .object({
    level: z.number().int().min(0).max(KL_LEVELS.length - 1),
    program: z.array(block).min(1).max(30),
  })
  .strict();
