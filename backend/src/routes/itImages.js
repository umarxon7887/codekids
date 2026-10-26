import { Router } from 'express';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import { getImage } from '../services/itImages.js';

// GET /api/v1/it/images/:id — dars rasmlari. <img> teg'i token yubora olmaydi, shuning uchun ochiq:
// ID tasodifiy uuid, rasmlar faqat darsda ishlatiladi. Rasm o'zgarmaydi, brauzer uni bir yil keshlaydi.
// server.js da umumiy limit va "no-store" dan oldin ulanadi.
const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id', async (req, res) => {
  if (!UUID.test(req.params.id)) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Rasm topilmadi');
  const img = await getImage(query, req.params.id);
  if (!img) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Rasm topilmadi');
  res.set({
    'Content-Type': img.mime,
    'Content-Length': String(img.data.length),
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  res.end(img.data);
});

export default router;
