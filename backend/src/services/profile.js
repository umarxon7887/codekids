import { AppError } from '../errors.js';
import { TEACHER_FIELDS } from '../schemas/profile.js';
import { getItSummary } from './it.js';

// Labirint natijalari game_players.state ichida saqlanadi (socket/labyrinth.js savePlayer).
// Faqat son bo'lgan qiymatlar o'qiladi, eski o'yinlarda bu kalitlar bo'lmasligi mumkin.
const stateInt = (alias, key) =>
  `CASE WHEN jsonb_typeof(${alias}.state->'${key}') = 'number' THEN (${alias}.state->>'${key}')::int END`;

// O'quvchi qatnashgan va boshlangan labirint xonalari (chetlatilganlar hisobga olinmaydi)
const LAB_PLAYS = `
  FROM game_players gp
  JOIN game_rooms r ON r.id = gp.room_id
 WHERE gp.user_id = $1
   AND r.game_type = 'labyrinth'
   AND r.started_at IS NOT NULL
   AND gp.kicked = false`;

const USER_SQL = `
  SELECT u.id, u.email, u.role, u.nickname, u.avatar_url, u.created_at,
         tp.full_name, tp.school, tp.subjects, tp.experience_years, tp.age_group
    FROM users u
    LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
   WHERE u.id = $1`;

const TEACHER_STATS_SQL = `
  SELECT
    (SELECT count(*)::int FROM classes WHERE teacher_id = $1) AS classes,
    (SELECT count(DISTINCT cs.student_id)::int
       FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
      WHERE c.teacher_id = $1) AS students,
    (SELECT count(*)::int FROM game_rooms WHERE host_id = $1) AS rooms,
    (SELECT count(*)::int FROM contents
      WHERE author_id = $1 AND deleted_at IS NULL) AS contents`;

const STUDENT_STATS_SQL = `
  WITH t AS (
    SELECT wpm, accuracy, place FROM typing_results WHERE user_id = $1 AND flagged = false
  ), l AS (
    SELECT ${stateInt('gp', 'right')} AS correct,
           ${stateInt('gp', 'level')} AS level,
           ${stateInt('gp', 'rank')} AS place
    ${LAB_PLAYS}
  )
  SELECT
    (SELECT count(*)::int FROM t) AS typing_games,
    (SELECT round(max(wpm))::int FROM t) AS best_wpm,
    (SELECT round(avg(accuracy))::int FROM t) AS avg_accuracy,
    (SELECT count(*)::int FROM t WHERE place = 1) AS typing_wins,
    (SELECT count(*)::int FROM l) AS lab_games,
    (SELECT coalesce(sum(correct), 0)::int FROM l) AS lab_correct,
    (SELECT max(level) FROM l) AS lab_best_level,
    (SELECT count(*)::int FROM l WHERE place = 1) AS lab_wins`;

const STUDENT_CLASSES_SQL = `
  SELECT c.id, c.name, u.nickname AS teacher
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    JOIN users u ON u.id = c.teacher_id
   WHERE cs.student_id = $1
   ORDER BY cs.joined_at DESC
   LIMIT 20`;

const STUDENT_RECENT_SQL = `
  SELECT * FROM (
    SELECT 'typing' AS kind, tr.created_at AS at, tr.game_mode AS mode,
           round(tr.wpm)::int AS wpm, round(tr.accuracy)::int AS accuracy, tr.place::int AS place,
           NULL::int AS score, NULL::int AS correct, NULL::int AS level, c.title AS title
      FROM typing_results tr
      LEFT JOIN contents c ON c.id = tr.content_id
     WHERE tr.user_id = $1 AND tr.flagged = false
    UNION ALL
    SELECT 'labyrinth', gp.joined_at, 'room',
           NULL, NULL, ${stateInt('gp', 'rank')},
           gp.score, ${stateInt('gp', 'right')}, ${stateInt('gp', 'level')},
           coalesce(c.title, r.topic)
      FROM game_players gp
      JOIN game_rooms r ON r.id = gp.room_id
      LEFT JOIN contents c ON c.id = r.content_id
     WHERE gp.user_id = $1
       AND r.game_type = 'labyrinth'
       AND r.started_at IS NOT NULL
       AND gp.kicked = false
  ) x
  ORDER BY at DESC
  LIMIT 6`;

/**
 * Profil: foydalanuvchi ma'lumotlari + rolga qarab statistika.
 * @param {(text:string, params?:any[])=>Promise<{rows:any[]}>} run  db.query yoki tranzaksiya client.query
 * @param {string} userId
 */
export async function getProfile(run, userId) {
  const { rows } = await run(USER_SQL, [userId]);
  const user = rows[0];
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Foydalanuvchi topilmadi');

  if (user.role === 'teacher') {
    const { rows: s } = await run(TEACHER_STATS_SQL, [userId]);
    return { user, stats: s[0] };
  }

  const [stats, classes, recent, it] = await Promise.all([
    run(STUDENT_STATS_SQL, [userId]),
    run(STUDENT_CLASSES_SQL, [userId]),
    run(STUDENT_RECENT_SQL, [userId]),
    getItSummary(run, userId),
  ]);
  return { user, stats: { ...stats.rows[0], classes: classes.rows, recent: recent.rows, it } };
}

/**
 * Profilni yangilaydi. Faqat yuborilgan maydonlar o'zgaradi.
 * Ustoz maydonlarini o'quvchi yubora olmaydi.
 * @param {{query:Function}} client tranzaksiya ichidagi client
 */
export async function updateProfile(client, userId, role, data) {
  const teacherCols = TEACHER_FIELDS.filter((k) => data[k] !== undefined);
  if (teacherCols.length && role !== 'teacher') {
    throw new AppError(403, 'TEACHER_ONLY_FIELDS', "Bu maydonlarni faqat ustoz o'zgartira oladi");
  }

  if (data.nickname !== undefined) {
    await client.query('UPDATE users SET nickname = $2, updated_at = now() WHERE id = $1', [
      userId,
      data.nickname,
    ]);
  }

  if (!teacherCols.length) return;

  // Ustun nomlari faqat TEACHER_FIELDS ro'yxatidan olinadi, foydalanuvchi matni SQL'ga tushmaydi
  const values = teacherCols.map((k) => data[k]);
  const sets = teacherCols.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const updated = await client.query(
    `UPDATE teacher_profiles SET ${sets}, updated_at = now() WHERE user_id = $1 RETURNING user_id`,
    [userId, ...values]
  );
  if (updated.rows.length) return;

  // Ro'yxatdan o'tishda profil yaratilmagan bo'lsa, yangisini ochamiz.
  // To'liq ism majburiy: yuborilmagan bo'lsa nikneym qo'yiladi.
  const cols = ['full_name', ...teacherCols.filter((k) => k !== 'full_name')];
  const marks = cols.map((k, i) =>
    k === 'full_name' ? 'coalesce($2, (SELECT nickname FROM users WHERE id = $1))' : `$${i + 2}`
  );
  await client.query(
    `INSERT INTO teacher_profiles (user_id, ${cols.join(', ')}) VALUES ($1, ${marks.join(', ')})`,
    [userId, ...cols.map((k) => (data[k] === undefined ? null : data[k]))]
  );
}
