import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'node:stream';
import csvParser from 'csv-parser';
import { query, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  uuidParams,
  listQuerySchema,
  searchQuerySchema,
  createContentSchema,
  updateContentSchema,
  bulkMetaSchema,
  csvRowSchema,
  questionsDataSchema,
  contentDataSchemas,
} from '../schemas/contents.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

const CONTENT_COLUMNS = `c.id, c.type, c.title, c.description, c.topic, c.level,
  c.likes_count, c.plays_count, c.is_published, c.created_at, c.updated_at,
  u.nickname AS author_nickname`;

const LETTERS = ['A', 'B', 'C', 'D'];

// ILIKE'da % va _ belgilari qidiruv ichida oddiy belgi sifatida ishlashi uchun
function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

// Kontent mavjudligini va egasini tekshiradi
async function getOwnedContent(id, userId) {
  const { rows } = await query(
    'SELECT id, author_id, type, is_published FROM contents WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  const content = rows[0];

  if (!content) {
    throw new AppError(404, 'CONTENT_NOT_FOUND', 'Kontent topilmadi');
  }
  if (content.author_id !== userId) {
    throw new AppError(403, 'FORBIDDEN', "Bu kontent sizga tegishli emas");
  }
  return content;
}

// GET /api/v1/contents: nashr etilgan kontentlar lentasi
router.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  const { topic, level, type, q, limit, offset, language } = req.validated.query;

  const { rows } = await query(
    `SELECT ${CONTENT_COLUMNS}
       FROM contents c
       JOIN users u ON u.id = c.author_id
      WHERE c.is_published = true
        AND c.deleted_at IS NULL
        AND ($1::text IS NULL OR c.topic = $1)
        AND ($2::smallint IS NULL OR c.level = $2)
        AND ($3::content_type IS NULL OR c.type = $3)
        AND ($4::text IS NULL OR c.title ILIKE $4 OR c.description ILIKE $4)
        AND ($5::text IS NULL OR c.language = $5)
      ORDER BY c.created_at DESC
      LIMIT $6 OFFSET $7`,
    [topic ?? null, level ?? null, type ?? null, q ? `%${escapeLike(q)}%` : null, language ?? null, limit, offset]
  );

  res.json({ items: rows, pagination: { limit, offset } });
});

// GET /api/v1/contents/search: qisman moslik (ILIKE) + imlo xatolariga chidamli (pg_trgm)
router.get('/mine', requireAuth, requireRole('teacher'), async (req, res) => {
  const type = req.query.type === 'typing_text' ? 'typing_text' : 'questions';
  const { rows } = await query(
    `SELECT id, type, title, topic, level, language, is_published, plays_count, likes_count, created_at, data
       FROM contents WHERE author_id = $1 AND deleted_at IS NULL AND type = $2
      ORDER BY created_at DESC LIMIT 200`,
    [req.user.id, type]
  );
  res.json({ items: rows });
});

router.get('/search', validate({ query: searchQuerySchema }), async (req, res) => {
  const { q, limit } = req.validated.query;
  const pattern = `%${escapeLike(q)}%`;

  const { rows } = await query(
    `SELECT ${CONTENT_COLUMNS},
            GREATEST(similarity(c.title, $1),
                     similarity(COALESCE(c.description, ''), $1)) AS score
       FROM contents c
       JOIN users u ON u.id = c.author_id
      WHERE c.is_published = true
        AND c.deleted_at IS NULL
        AND (c.title ILIKE $2
             OR c.description ILIKE $2
             OR c.title % $1
             OR c.description % $1)
      ORDER BY score DESC, c.created_at DESC
      LIMIT $3`,
    [q, pattern, limit]
  );

  res.json({ items: rows });
});
// POST /api/v1/contents: yangi kontent (teacher)
router.post(
  '/',
  requireAuth,
  requireRole('teacher'),
  validate({ body: createContentSchema }),
  async (req, res) => {
    const d = req.validated.body;

    const { rows } = await query(
      `INSERT INTO contents (author_id, type, title, description, topic, level, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, type, title, description, topic, level, is_published, created_at`,
      [
        req.user.id,
        d.type,
        d.title,
        d.description ?? null,
        d.topic ?? null,
        d.level,
        JSON.stringify(d.data),
      ]
    );

    res.status(201).json({ content: rows[0] });
  }
);

// POST /api/v1/contents/bulk-upload: CSV'dan savollar to'plami (teacher)
// CSV ustunlari: question, option_a, option_b, option_c, option_d, correct (A/B/C/D)
router.post(
  '/bulk-upload',
  requireAuth,
  requireRole('teacher'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', "CSV fayl yuborilishi shart (maydon nomi: file)");
    }
    if (!/\.csv$/i.test(req.file.originalname)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', "Faqat .csv fayl qabul qilinadi");
    }

    const meta = bulkMetaSchema.parse(req.body);

    const rawRows = [];
    const stream = Readable.from(req.file.buffer).pipe(
      csvParser({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim().toLowerCase(),
      })
    );
    for await (const row of stream) {
      rawRows.push(row);
    }

    if (rawRows.length === 0) {
      throw new AppError(400, 'EMPTY_CSV', "CSV faylda savollar yo'q");
    }
    if (rawRows.length > 100) {
      throw new AppError(400, 'TOO_MANY_ROWS', "Bir faylda 100 tagacha savol bo'lishi mumkin");
    }

    const questions = [];
    const errors = [];

    rawRows.forEach((raw, i) => {
      const line = i + 2; // 1-qator sarlavha, shuning uchun ma'lumot 2-qatordan boshlanadi

      const parsed = csvRowSchema.safeParse({
        ...raw,
        correct: String(raw.correct ?? '').trim().toUpperCase(),
      });
      if (!parsed.success) {
        errors.push({ row: line, message: parsed.error.issues[0].message });
        return;
      }

      const row = parsed.data;

      // Variantlar ketma-ket bo'lishi kerak: bo'sh katakdan keyin to'ldirilgan variant bo'lmaydi
      const options = [];
      for (const opt of [row.option_a, row.option_b, row.option_c, row.option_d]) {
        if (!opt) break;
        options.push(opt);
      }

      const answer = LETTERS.indexOf(row.correct);
      if (answer >= options.length) {
        errors.push({ row: line, message: "To'g'ri javob variant mavjud emas" });
        return;
      }

      questions.push({ text: row.question, options, answer });
    });

    if (errors.length > 0) {
      throw new AppError(400, 'CSV_INVALID', 'CSV faylda xatolar bor', errors.slice(0, 50));
    }

    const data = questionsDataSchema.parse({ questions });

    const { rows } = await query(
      `INSERT INTO contents (author_id, type, title, topic, level, data)
       VALUES ($1, 'questions', $2, $3, $4, $5)
       RETURNING id, type, title, topic, level, is_published, created_at`,
      [req.user.id, meta.title, meta.topic ?? null, meta.level, JSON.stringify(data)]
    );

    res.status(201).json({ content: rows[0], imported: questions.length });
  }
);

// PUT /api/v1/contents/:id: tahrirlash (faqat egasi)
router.put(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  validate({ params: uuidParams, body: updateContentSchema }),
  async (req, res) => {
    const { id } = req.validated.params;
    const d = req.validated.body;

    const content = await getOwnedContent(id, req.user.id);

    let dataJson = null;
    if (d.data !== undefined) {
      // data turi kontent turiga mos bo'lishi kerak
      const validData = contentDataSchemas[content.type].parse(d.data);
      dataJson = JSON.stringify(validData);
    }

    const { rows } = await query(
      `UPDATE contents
          SET title       = COALESCE($2, title),
              description = COALESCE($3, description),
              topic       = COALESCE($4, topic),
              level       = COALESCE($5, level),
              data        = COALESCE($6::jsonb, data)
        WHERE id = $1
        RETURNING id, type, title, description, topic, level, is_published, updated_at`,
      [id, d.title ?? null, d.description ?? null, d.topic ?? null, d.level ?? null, dataJson]
    );

    res.json({ content: rows[0] });
  }
);

// DELETE /api/v1/contents/:id: soft delete (faqat egasi)
router.delete(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  validate({ params: uuidParams }),
  async (req, res) => {
    const { id } = req.validated.params;

    await getOwnedContent(id, req.user.id);
    await query(
      'UPDATE contents SET deleted_at = now(), is_published = false WHERE id = $1',
      [id]
    );

    res.status(204).end();
  }
);

// POST /api/v1/contents/:id/publish: nashr etish (faqat egasi)
router.post(
  '/:id/publish',
  requireAuth,
  requireRole('teacher'),
  validate({ params: uuidParams }),
  async (req, res) => {
    const { id } = req.validated.params;

    await getOwnedContent(id, req.user.id);
    const { rows } = await query(
      'UPDATE contents SET is_published = true WHERE id = $1 RETURNING id, is_published',
      [id]
    );

    res.json({ content: rows[0] });
  }
);

// POST /api/v1/contents/:id/like: bir foydalanuvchi bir marta like bosadi
router.post(
  '/:id/like',
  requireAuth,
  validate({ params: uuidParams }),
  async (req, res) => {
    const { id } = req.validated.params;

    const likesCount = await withTransaction(async (client) => {
      const { rows: found } = await client.query(
        'SELECT is_published FROM contents WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (!found[0] || !found[0].is_published) {
        throw new AppError(404, 'CONTENT_NOT_FOUND', 'Kontent topilmadi');
      }

      const inserted = await client.query(
        `INSERT INTO likes (user_id, content_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, content_id) DO NOTHING`,
        [req.user.id, id]
      );

      if (inserted.rowCount === 1) {
        await client.query(
          'UPDATE contents SET likes_count = likes_count + 1 WHERE id = $1',
          [id]
        );
      }

      const { rows } = await client.query(
        'SELECT likes_count FROM contents WHERE id = $1',
        [id]
      );
      return rows[0].likes_count;
    });

    res.json({ liked: true, likes_count: likesCount });
  }
);

export default router;