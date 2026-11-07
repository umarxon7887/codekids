import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { lessonParams, completeSchema, nameSchema } from '../schemas/it.js';
import { getPath, getLesson, completeLesson, setRealName } from '../services/it.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/it/path: bo'limlar, qasrlar holati (done/current/open/locked), XP, ketma-ket kunlar
router.get('/path', async (req, res) => {
  res.json(await getPath(query, req.user));
});

// GET /api/v1/it/lessons/:id: qasr kontenti (qulflangan bo'lsa 403 LESSON_LOCKED)
router.get('/lessons/:id', validate({ params: lessonParams }), async (req, res) => {
  res.json(await getLesson(query, req.user, req.validated.params.id));
});

// POST /api/v1/it/lessons/:id/complete: qasr tugatildi (XP faqat birinchi marta)
router.post(
  '/lessons/:id/complete',
  validate({ params: lessonParams, body: completeSchema }),
  async (req, res) => {
    res.json(await completeLesson(query, withTransaction, req.user, req.validated.params.id, req.validated.body));
  }
);

// PUT /api/v1/it/me/name: qahramon so'ragan haqiqiy ism (nikneymdan alohida, boshqalarga ko'rinmaydi)
router.put('/me/name', validate({ body: nameSchema }), async (req, res) => {
  res.json(await setRealName(query, req.user.id, req.validated.body.name));
});

export default router;
