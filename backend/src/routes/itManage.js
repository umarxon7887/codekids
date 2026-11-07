import { Router } from 'express';
import multer from 'multer';
import { query, withTransaction } from '../db.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  idParams, forceQuery, moveSchema,
  sectionCreateSchema, sectionUpdateSchema, lessonCreateSchema, lessonUpdateSchema,
  toolCreateSchema, toolUpdateSchema,
} from '../schemas/it.js';
import * as m from '../services/itManage.js';
import { saveImage, imageStats, deleteUnusedImages, IMAGE_MAX_BYTES } from '../services/itImages.js';

// IT darslari muharriri. Hozircha faqat admin; ustoz muharriri keyingi bosqichda shu yerga qo'shiladi
// (servis allaqachon rolga qarab o'z bo'limlarini ajratadi).
const router = Router();
router.use(requireAuth, requireRole('admin'));

const id = (req) => req.validated.params.id;
const force = (req) => req.validated.query.force === '1';

// GET /api/v1/it/manage: bo'limlar (ichida mavzular) va fikrlash qurollari
router.get('/', async (req, res) => {
  res.json(await m.overview(query, req.user));
});

// ---------- Bo'limlar ----------
router.post('/sections', validate({ body: sectionCreateSchema }), async (req, res) => {
  res.status(201).json({ section: await m.createSection(query, req.user, req.validated.body) });
});
router.put('/sections/:id', validate({ params: idParams, body: sectionUpdateSchema }), async (req, res) => {
  res.json({ section: await m.updateSection(query, req.user, id(req), req.validated.body) });
});
router.delete('/sections/:id', validate({ params: idParams, query: forceQuery }), async (req, res) => {
  res.json(await m.deleteSection(query, req.user, id(req), force(req)));
});
router.post('/sections/:id/move', validate({ params: idParams, body: moveSchema }), async (req, res) => {
  res.json(await m.moveSection(query, withTransaction, req.user, id(req), req.validated.body.dir));
});
router.post('/sections/:id/lessons', validate({ params: idParams, body: lessonCreateSchema }), async (req, res) => {
  res.status(201).json({ lesson: await m.createLesson(query, req.user, id(req), req.validated.body) });
});

// ---------- Mavzular ----------
router.get('/lessons/:id', validate({ params: idParams }), async (req, res) => {
  res.json({ lesson: await m.getManagedLesson(query, req.user, id(req)) });
});
router.put('/lessons/:id', validate({ params: idParams, body: lessonUpdateSchema }), async (req, res) => {
  res.json({ lesson: await m.updateLesson(query, req.user, id(req), req.validated.body) });
});
router.delete('/lessons/:id', validate({ params: idParams, query: forceQuery }), async (req, res) => {
  res.json(await m.deleteLesson(query, req.user, id(req), force(req)));
});
router.post('/lessons/:id/move', validate({ params: idParams, body: moveSchema }), async (req, res) => {
  res.json(await m.moveLesson(query, withTransaction, req.user, id(req), req.validated.body.dir));
});

// ---------- Rasmlar ----------
// Brauzer rasmni oldindan kichraytirib yuboradi; server faqat WebP/JPEG/PNG ni qabul qiladi
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } });
router.post('/images', upload.single('file'), async (req, res) => {
  res.status(201).json({ image: await saveImage(query, req.user, req.file?.buffer, req.body || {}) });
});
router.get('/images/stats', async (req, res) => {
  res.json(await imageStats(query));
});
router.delete('/images/unused', async (req, res) => {
  res.json(await deleteUnusedImages(query));
});

// ---------- Fikrlash qurollari ----------
router.post('/tools', validate({ body: toolCreateSchema }), async (req, res) => {
  res.status(201).json({ tool: await m.createTool(query, req.user, req.validated.body) });
});
router.put('/tools/:id', validate({ params: idParams, body: toolUpdateSchema }), async (req, res) => {
  res.json({ tool: await m.updateTool(query, req.user, id(req), req.validated.body) });
});
router.delete('/tools/:id', validate({ params: idParams, query: forceQuery }), async (req, res) => {
  res.json(await m.deleteTool(query, req.user, id(req), force(req)));
});

export default router;
