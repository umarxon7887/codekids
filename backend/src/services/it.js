import { AppError } from '../errors.js';

/** Kunlik maqsad: bir kunda nechta qasr. */
export const DAILY_GOAL = 2;

// Kun chegarasi Toshkent vaqti bilan (bolalar shu vaqtda o'qiydi)
const TODAY = `(now() AT TIME ZONE 'Asia/Tashkent')::date`;

// Foydalanuvchi ko'radigan bo'limlar: admin bo'limlari (hammaga), o'zi yozganlari va
// o'zi a'zo bo'lgan sinf ustozlari yozganlari. Faqat nashr qilingan bo'lim va qasrlar.
const PATH_SQL = `
  SELECT s.id AS section_id, s.title AS section_title, s.method, s.is_global,
         l.id, l.kind, l.title, l.minutes, l.xp,
         jsonb_array_length(coalesce(l.content->'exercises', '[]'::jsonb))::int AS exercises,
         (p.user_id IS NOT NULL) AS done
    FROM it_sections s
    JOIN it_lessons l ON l.section_id = s.id AND l.is_published = true
    LEFT JOIN it_progress p ON p.lesson_id = l.id AND p.user_id = $1
   WHERE s.is_published = true
     AND (s.is_global = true
          OR s.author_id = $1
          OR s.author_id IN (SELECT c.teacher_id
                               FROM class_students cs
                               JOIN classes c ON c.id = cs.class_id
                              WHERE cs.student_id = $1))
   ORDER BY s.is_global DESC, s.position, s.created_at, l.position, l.created_at`;

// Ketma-ket kunlar: oxirgi faol kun bugun yoki kecha bo'lsa, uzluksiz kunlar soni.
// Ketma-ket kunlarda (kun + tartib raqami) bir xil bo'ladi.
const STATS_SQL = `
  WITH t AS (SELECT ${TODAY} AS today),
  d AS (SELECT day, day + (row_number() OVER (ORDER BY day DESC))::int AS grp
          FROM it_days WHERE user_id = $1 AND lessons > 0),
  top AS (SELECT d.grp FROM d, t WHERE d.day IN (t.today, t.today - 1) ORDER BY d.day DESC LIMIT 1)
  SELECT (SELECT coalesce(sum(xp), 0)::int FROM it_progress WHERE user_id = $1) AS xp,
         (SELECT count(*)::int FROM d WHERE grp = (SELECT grp FROM top)) AS streak,
         coalesce((SELECT lessons FROM it_days, t WHERE user_id = $1 AND day = t.today), 0)::int AS today`;

const LESSON_SQL = `
  SELECT l.id, l.section_id, l.kind, l.title, l.term, l.minutes, l.xp, l.content,
         tl.id AS tool_id, tl.name AS tool_name, tl.short AS tool_short, tl.body AS tool_body
    FROM it_lessons l
    LEFT JOIN it_tools tl ON tl.id = l.tool_id
   WHERE l.id = $1`;

/**
 * Qasrlar yo'li: bo'limlar, har qasr holati va statistika.
 * O'quvchi uchun qasrlar ketma-ket ochiladi; ustoz va admin hammasini ko'ra oladi.
 * @param {Function} run db.query
 * @param {{id:string, role:string}} user
 */
export async function getPath(run, user) {
  const [{ rows }, stats] = await Promise.all([run(PATH_SQL, [user.id]), getStats(run, user.id)]);
  const free = user.role !== 'student';
  const sections = [];
  let current = null;
  for (const r of rows) {
    let s = sections[sections.length - 1];
    if (!s || s.id !== r.section_id) {
      s = { id: r.section_id, title: r.section_title, method: r.method, is_global: r.is_global, lessons: [], done: 0 };
      sections.push(s);
    }
    let status;
    if (r.done) status = 'done';
    else if (!current) { status = 'current'; current = r.id; }
    else status = free ? 'open' : 'locked';
    if (r.done) s.done += 1;
    s.lessons.push({ id: r.id, kind: r.kind, title: r.title, minutes: r.minutes, xp: r.xp, exercises: r.exercises, status });
  }
  return { sections, stats: { ...stats, goal: DAILY_GOAL, current_lesson_id: current } };
}

export async function getStats(run, userId) {
  const { rows } = await run(STATS_SQL, [userId]);
  return rows[0];
}

/** Yo'ldan qasr holatini topadi: ko'rinmasa 404, qulflangan bo'lsa 403. */
async function lessonStatus(run, user, lessonId) {
  const path = await getPath(run, user);
  for (const s of path.sections) {
    const l = s.lessons.find((x) => x.id === lessonId);
    if (l) {
      if (l.status === 'locked') throw new AppError(403, 'LESSON_LOCKED', 'Avval oldingi qasrlarni tugating');
      return { lesson: l, section: s, path };
    }
  }
  throw new AppError(404, 'LESSON_NOT_FOUND', 'Dars topilmadi');
}

/** Bitta qasr: kontent va fikrlash quroli kartasi. */
export async function getLesson(run, user, lessonId) {
  const { lesson: brief, section, path } = await lessonStatus(run, user, lessonId);
  const { rows } = await run(LESSON_SQL, [lessonId]);
  const l = rows[0];
  const index = section.lessons.findIndex((x) => x.id === lessonId);
  return {
    lesson: {
      id: l.id,
      kind: l.kind,
      title: l.title,
      term: l.term,
      minutes: l.minutes,
      xp: l.xp,
      status: brief.status,
      section: { id: section.id, title: section.title, method: section.method, index, total: section.lessons.length },
      tool: l.tool_id ? { id: l.tool_id, name: l.tool_name, short: l.tool_short, body: l.tool_body } : null,
      content: l.content,
    },
    stats: path.stats,
  };
}

/**
 * Qasr tugatildi: progress va kunlik faollik yoziladi. XP faqat birinchi marta beriladi.
 * @param {Function} run db.query
 * @param {(fn:(client:{query:Function})=>Promise<any>)=>Promise<any>} tx tranzaksiya
 */
export async function completeLesson(run, tx, user, lessonId, { mistakes = 0 } = {}) {
  await lessonStatus(run, user, lessonId);
  const { rows } = await run(LESSON_SQL, [lessonId]);
  const l = rows[0];

  const first = await tx(async (client) => {
    const toolBefore = l.tool_id
      ? (await client.query(
        `SELECT 1 FROM it_progress p JOIN it_lessons x ON x.id = p.lesson_id
          WHERE p.user_id = $1 AND x.tool_id = $2 LIMIT 1`, [user.id, l.tool_id])).rows.length > 0
      : true;
    const res = await client.query(
      `INSERT INTO it_progress (user_id, lesson_id, xp, best_mistakes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lesson_id) DO UPDATE
         SET attempts = it_progress.attempts + 1,
             best_mistakes = LEAST(it_progress.best_mistakes, EXCLUDED.best_mistakes),
             updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [user.id, lessonId, l.xp, mistakes]
    );
    await client.query(
      `INSERT INTO it_days (user_id, day, lessons) VALUES ($1, ${TODAY}, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET lessons = it_days.lessons + 1`,
      [user.id]
    );
    return { inserted: res.rows[0].inserted, newTool: !toolBefore };
  });

  const path = await getPath(run, user);
  const next = path.stats.current_lesson_id;
  const nextSection = next ? path.sections.find((x) => x.lessons.some((y) => y.id === next)) : null;
  return {
    first: first.inserted,
    xp_gained: first.inserted ? l.xp : 0,
    term: l.term,
    tool: first.inserted && first.newTool ? { id: l.tool_id, name: l.tool_name, short: l.tool_short } : null,
    next_lesson_id: next,
    next_section_id: nextSection ? nextSection.id : null,
    section_done: path.sections.find((x) => x.lessons.some((y) => y.id === lessonId))?.lessons.every((y) => y.status === 'done') ?? false,
    stats: path.stats,
  };
}

/** Profil uchun: IT XP, tugatilgan qasrlar va qurollar sumkasi (olingan tartibda). */
export async function getItSummary(run, userId) {
  const [{ rows: s }, { rows: tools }] = await Promise.all([
    run(
      `SELECT coalesce(sum(xp), 0)::int AS xp, count(*)::int AS done FROM it_progress WHERE user_id = $1`,
      [userId]
    ),
    run(
      `SELECT id, name, short FROM (
         SELECT DISTINCT ON (tl.id) tl.id, tl.name, tl.short, p.completed_at
           FROM it_progress p
           JOIN it_lessons l ON l.id = p.lesson_id
           JOIN it_tools tl ON tl.id = l.tool_id
          WHERE p.user_id = $1
          ORDER BY tl.id, p.completed_at
       ) t ORDER BY completed_at`,
      [userId]
    ),
  ]);
  const stats = await getStats(run, userId);
  return { xp: s[0].xp, done: s[0].done, streak: stats.streak, tools };
}
