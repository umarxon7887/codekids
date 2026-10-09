import { Router } from 'express';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  classIdParams,
  studentParams,
  createClassSchema,
  addStudentSchema,
} from '../schemas/teacher.js';

const router = Router();

// Ushbu router'dagi hamma endpoint faqat o'qituvchi uchun
router.use(requireAuth, requireRole('teacher'));

// Sinf mavjudligini va egasini tekshiradi
async function getOwnedClass(classId, teacherId) {
  const { rows } = await query(
    'SELECT id, teacher_id, name, created_at FROM classes WHERE id = $1',
    [classId]
  );
  const cls = rows[0];
  if (!cls) {
    throw new AppError(404, 'CLASS_NOT_FOUND', 'Sinf topilmadi');
  }
  if (cls.teacher_id !== teacherId) {
    throw new AppError(403, 'FORBIDDEN', 'Bu sinf sizga tegishli emas');
  }
  return cls;
}

// POST /api/v1/teacher/classes: yangi sinf
router.post('/classes', validate({ body: createClassSchema }), async (req, res) => {
  const { rows } = await query(
    `INSERT INTO classes (teacher_id, name)
     VALUES ($1, $2)
     RETURNING id, name, created_at`,
    [req.user.id, req.validated.body.name]
  );
  res.status(201).json({ class: rows[0] });
});

// GET /api/v1/teacher/classes: o'qituvchining sinflari
router.get('/classes', async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.name, c.created_at,
            count(cs.student_id)::int AS student_count
       FROM classes c
       LEFT JOIN class_students cs ON cs.class_id = c.id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  res.json({ items: rows });
});

// GET /api/v1/teacher/classes/:id: sinf va o'quvchilari
router.get('/classes/:id', validate({ params: classIdParams }), async (req, res) => {
  const cls = await getOwnedClass(req.validated.params.id, req.user.id);

  const { rows } = await query(
    `SELECT u.id, u.nickname, cs.joined_at
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
      WHERE cs.class_id = $1
      ORDER BY u.nickname`,
    [cls.id]
  );

  res.json({
    class: { id: cls.id, name: cls.name, created_at: cls.created_at },
    students: rows,
  });
});

// POST /api/v1/teacher/classes/:id/students: email orqali o'quvchi qo'shish
router.post(
  '/classes/:id/students',
  validate({ params: classIdParams, body: addStudentSchema }),
  async (req, res) => {
    const cls = await getOwnedClass(req.validated.params.id, req.user.id);

    const { rows: found } = await query(
      'SELECT id, nickname, role FROM users WHERE email = $1',
      [req.validated.body.email]
    );
    const student = found[0];
    if (!student) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Bu email bilan foydalanuvchi topilmadi');
    }
    if (student.role !== 'student') {
      throw new AppError(400, 'NOT_A_STUDENT', "Faqat o'quvchi sinfga qo'shiladi");
    }

    const { rowCount } = await query(
      `INSERT INTO class_students (class_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [cls.id, student.id]
    );

    res.status(rowCount === 1 ? 201 : 200).json({
      added: rowCount === 1,
      student: { id: student.id, nickname: student.nickname },
    });
  }
);

// DELETE /api/v1/teacher/classes/:id/students/:studentId: o'quvchini olib tashlash
router.delete(
  '/classes/:id/students/:studentId',
  validate({ params: studentParams }),
  async (req, res) => {
    const cls = await getOwnedClass(req.validated.params.id, req.user.id);

    const { rowCount } = await query(
      'DELETE FROM class_students WHERE class_id = $1 AND student_id = $2',
      [cls.id, req.validated.params.studentId]
    );
    if (rowCount === 0) {
      throw new AppError(404, 'STUDENT_NOT_IN_CLASS', "O'quvchi sinfda topilmadi");
    }

    res.status(204).end();
  }
);

// GET /api/v1/teacher/classes/:id/analytics: sinf statistikasi
router.get('/classes/:id/analytics', validate({ params: classIdParams }), async (req, res) => {
  const cls = await getOwnedClass(req.validated.params.id, req.user.id);
  const roomCode = typeof req.query.room_code === 'string' ? req.query.room_code.trim().toUpperCase() : null;
  let roomId = null;
  if (roomCode) {
    const { rows: rr } = await query('SELECT id FROM game_rooms WHERE code = $1 AND host_id = $2', [roomCode, req.user.id]);
    if (!rr[0]) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Xona topilmadi yoki sizga tegishli emas');
    }
    roomId = rr[0].id;
  }

  const { rows: summary } = await query(
    `SELECT count(DISTINCT tr.user_id)::int AS active_students,
            count(tr.id)::int AS total_results,
            COALESCE(avg(tr.wpm), 0)::float8 AS avg_wpm,
            COALESCE(avg(tr.accuracy), 0)::float8 AS avg_accuracy
       FROM typing_results tr
       JOIN class_students cs ON cs.student_id = tr.user_id
      WHERE cs.class_id = $1 AND tr.flagged = false
        AND ($2::uuid IS NULL OR tr.room_id = $2)`,
    [cls.id, roomId]
  );

  // Har bir o'quvchi bo'yicha: natijalar soni va o'rtacha ko'rsatkichlar
  const { rows: students } = await query(
    `SELECT u.id, u.nickname,
            count(tr.id)::int AS results,
            COALESCE(avg(tr.wpm), 0)::float8 AS avg_wpm,
            COALESCE(avg(tr.accuracy), 0)::float8 AS avg_accuracy
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN typing_results tr ON tr.user_id = u.id AND tr.flagged = false
        AND ($2::uuid IS NULL OR tr.room_id = $2)
      WHERE cs.class_id = $1
      GROUP BY u.id, u.nickname
      ORDER BY avg_wpm DESC`,
    [cls.id, roomId]
  );

  // Eng past aniqlikdagi mavzular (e'tibor kerak bo'lganlar)
  const { rows: weakTopics } = await query(
    `SELECT COALESCE(c.topic, 'umumiy') AS topic,
            count(tr.id)::int AS results,
            COALESCE(avg(tr.accuracy), 0)::float8 AS avg_accuracy
       FROM typing_results tr
       JOIN class_students cs ON cs.student_id = tr.user_id
       LEFT JOIN contents c ON c.id = tr.content_id
      WHERE cs.class_id = $1 AND tr.flagged = false
        AND ($2::uuid IS NULL OR tr.room_id = $2)
      GROUP BY 1
      ORDER BY avg_accuracy ASC
      LIMIT 5`,
    [cls.id, roomId]
  );

  res.json({
    room_code: roomCode,
    summary: summary[0],
    students,
    weak_topics: weakTopics,
  });
});

// GET /api/v1/teacher/dashboard: qisqa ko'rsatkichlar
router.get('/dashboard', async (req, res) => {
  const { rows } = await query(
    `SELECT
       (SELECT count(*)::int FROM contents
         WHERE author_id = $1 AND deleted_at IS NULL) AS total_contents,
       (SELECT count(*)::int FROM contents
         WHERE author_id = $1 AND deleted_at IS NULL AND is_published = true) AS published_contents,
       (SELECT count(*)::int FROM classes WHERE teacher_id = $1) AS total_classes,
       (SELECT count(DISTINCT cs.student_id)::int
          FROM class_students cs
          JOIN classes c ON c.id = cs.class_id
         WHERE c.teacher_id = $1) AS total_students,
       (SELECT count(*)::int FROM game_rooms WHERE host_id = $1) AS total_rooms`,
    [req.user.id]
  );
  res.json({ dashboard: rows[0] });
});

export default router;
