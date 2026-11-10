import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { solveSchema } from '../schemas/kodlab.js';
import { getKodlab, solveLevel } from '../services/kodlab.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/kodlab: o'tilgan darajalar {indeks: yulduz} va coinlar
router.get('/', async (req, res) => {
  res.json(await getKodlab({ query }, req.user));
});

// POST /api/v1/kodlab/solve { level, program }: dastur serverda bajariladi, g'alaba bo'lsa progress + coin
router.post('/solve', validate({ body: solveSchema }), async (req, res) => {
  res.json(await solveLevel(withTransaction, req.user, req.validated.body));
});

export default router;
