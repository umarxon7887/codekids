import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { startSchema, stepParams, stepSubmitSchema, courseQuery } from '../schemas/typingLessons.js';
import { getCourse, startAttempt, beginStep, submitStep } from '../services/typingLessons.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/typing-lessons?lang=uz|ru: darajalar, darslar holati, yulduzlar, coinlar
router.get('/', validate({ query: courseQuery }), async (req, res) => {
  res.json(await getCourse(query, req.user, req.validated.query.lang));
});

// POST /api/v1/typing-lessons/attempts: darsni boshlash (qulflangan bo'lsa 403 LESSON_LOCKED)
router.post('/attempts', validate({ body: startSchema }), async (req, res) => {
  res.status(201).json(await startAttempt(query, req.user, req.validated.body.lesson_id));
});

// POST /api/v1/typing-lessons/attempts/:id/steps/:i/begin: mashqning birinchi tugmasi bosildi
router.post('/attempts/:id/steps/:i/begin', validate({ params: stepParams }), async (req, res) => {
  const { id, i } = req.validated.params;
  res.json(await beginStep(withTransaction, req.user, id, i));
});

// POST /api/v1/typing-lessons/attempts/:id/steps/:i: mashq tugadi (oxirgisida dars yakuni)
router.post(
  '/attempts/:id/steps/:i',
  validate({ params: stepParams, body: stepSubmitSchema }),
  async (req, res) => {
    const { id, i } = req.validated.params;
    res.json(await submitStep(withTransaction, req.user, id, i, req.validated.body));
  }
);

export default router;
