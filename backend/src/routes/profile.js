import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { updateProfileSchema } from '../schemas/profile.js';
import { getProfile, updateProfile } from '../services/profile.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/profile: ma'lumotlar + statistika (ustoz va o'quvchi uchun har xil)
router.get('/', async (req, res) => {
  res.json(await getProfile(query, req.user.id));
});

// PUT /api/v1/profile: faqat yuborilgan maydonlar o'zgaradi (CORS'da PATCH yo'q, shuning uchun PUT)
router.put('/', validate({ body: updateProfileSchema }), async (req, res) => {
  await withTransaction((client) =>
    updateProfile(client, req.user.id, req.user.role, req.validated.body)
  );
  res.json(await getProfile(query, req.user.id));
});

export default router;
