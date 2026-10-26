/** @file IT darslari muharriri: bo'limlar, mavzular va fikrlash qurollarini boshqarish. */
import { AppError } from '../errors.js';
import { draftContentSchema, lessonContentSchema } from '../schemas/it.js';
import { analyzeMaze } from '../utils/maze.js';

/**
 * Kim qaysi bo'limlarni boshqaradi:
 * - admin: umumiy (is_global) bo'limlar, ularni hamma o'quvchi ko'radi;
 * - ustoz (keyingi bosqich): o'zi yozgan bo'limlar, ularni faqat uning sinflaridagi o'quvchilar ko'radi.
 * @param {{id:string, role:string}} user
 * @param {number} n  SQL'dagi birinchi bo'sh parametr raqami ($n)
 * @returns {{sql:string, args:any[]}}
 */
function own(user, n) {
  if (user.role === 'admin') return { sql: 's.is_global = true', args: [] };
  if (user.role === 'teacher') return { sql: `(s.is_global = false AND s.author_id = $${n})`, args: [user.id] };
  throw new AppError(403, 'FORBIDDEN', "Bu amal uchun ruxsat yo'q");
}

/** Qurollar: admin hammasini boshqaradi, ustoz (keyingi bosqich) faqat o'zinikini. */
function ownTool(user, n) {
  if (user.role === 'admin') return { sql: 'true', args: [] };
  if (user.role === 'teacher') return { sql: `t.author_id = $${n}`, args: [user.id] };
  throw new AppError(403, 'FORBIDDEN', "Bu amal uchun ruxsat yo'q");
}

const SECTION_COLS = 's.id, s.title, s.method, s.description, s.position, s.is_published, s.updated_at';
const LESSON_COLS = `l.id, l.section_id, l.position, l.kind, l.title, l.term, l.tool_id, l.minutes, l.xp,
  l.content, l.is_published, l.updated_at`;
const TOOL_COLS = 't.id, t.name, t.short, t.body';
const EMPTY_CONTENT = { story: '', exercises: [], term_text: '' };

// O'quvchi tugatgan mavzu o'chirilsa, uning XP'si va progressi ham o'chadi (ON DELETE CASCADE).
// Shuning uchun progress bo'lsa, o'chirish faqat force=1 bilan; odatda "yashirish" tavsiya qilinadi.
const hasProgress = (what, n) => new AppError(
  409,
  'HAS_PROGRESS',
  `${n} ta o'quvchi ${what} tugatgan. O'chirilsa, ularning XP'si ham o'chadi. Yashirib qo'yish tavsiya etiladi.`,
  { learners: n }
);

// ---------- Umumiy ko'rinish ----------

/** Muharrirning chap paneli: bo'limlar (ichida mavzular) va fikrlash qurollari. */
export async function overview(run, user) {
  const c = own(user, 1);
  const t = ownTool(user, 1);
  const [{ rows: sections }, { rows: lessons }, { rows: tools }] = await Promise.all([
    run(`SELECT ${SECTION_COLS} FROM it_sections s WHERE ${c.sql} ORDER BY s.position, s.created_at`, c.args),
    run(
      `SELECT l.id, l.section_id, l.position, l.kind, l.title, l.is_published,
              jsonb_array_length(coalesce(l.content->'exercises', '[]'::jsonb))::int AS exercises,
              (l.content ? 'video') AS has_video,
              (SELECT count(*)::int FROM it_progress p WHERE p.lesson_id = l.id) AS learners
         FROM it_lessons l
         JOIN it_sections s ON s.id = l.section_id
        WHERE ${c.sql}
        ORDER BY l.position, l.created_at`,
      c.args
    ),
    run(
      `SELECT ${TOOL_COLS}, (SELECT count(*)::int FROM it_lessons l WHERE l.tool_id = t.id) AS used
         FROM it_tools t WHERE ${t.sql} ORDER BY lower(t.name)`,
      t.args
    ),
  ]);
  const byId = new Map(sections.map((s) => [s.id, { ...s, lessons: [] }]));
  for (const l of lessons) byId.get(l.section_id)?.lessons.push(l);
  return { sections: [...byId.values()], tools };
}

// ---------- Bo'limlar ----------

async function ownedSection(run, user, id) {
  const c = own(user, 2);
  const { rows } = await run(`SELECT ${SECTION_COLS} FROM it_sections s WHERE s.id = $1 AND ${c.sql}`, [id, ...c.args]);
  if (!rows[0]) throw new AppError(404, 'SECTION_NOT_FOUND', "Bo'lim topilmadi");
  return rows[0];
}

/** Yangi bo'lim qoralama bo'lib, ro'yxat oxiriga qo'shiladi. */
export async function createSection(run, user, data) {
  const c = own(user, 1);
  const { rows: [{ next }] } = await run(
    `SELECT coalesce(max(s.position), 0) + 1 AS next FROM it_sections s WHERE ${c.sql}`, c.args
  );
  const { rows } = await run(
    `INSERT INTO it_sections AS s (author_id, is_global, position, title, method, description, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING ${SECTION_COLS}`,
    [user.id, user.role === 'admin', next, data.title, data.method, data.description]
  );
  return rows[0];
}

const SECTION_FIELDS = ['title', 'method', 'description', 'is_published'];

export async function updateSection(run, user, id, data) {
  const keys = SECTION_FIELDS.filter((k) => data[k] !== undefined);
  const c = own(user, keys.length + 2);
  // Ustun nomlari faqat SECTION_FIELDS ro'yxatidan olinadi
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await run(
    `UPDATE it_sections s SET ${sets} WHERE s.id = $1 AND ${c.sql} RETURNING ${SECTION_COLS}`,
    [id, ...keys.map((k) => data[k]), ...c.args]
  );
  if (!rows[0]) throw new AppError(404, 'SECTION_NOT_FOUND', "Bo'lim topilmadi");
  return rows[0];
}

export async function deleteSection(run, user, id, force = false) {
  await ownedSection(run, user, id);
  const { rows: [{ n }] } = await run(
    `SELECT count(DISTINCT p.user_id)::int AS n
       FROM it_progress p JOIN it_lessons l ON l.id = p.lesson_id
      WHERE l.section_id = $1`,
    [id]
  );
  if (n > 0 && !force) throw hasProgress("bu bo'limdagi mavzularni", n);
  await run('DELETE FROM it_sections WHERE id = $1', [id]);
  return { deleted: true, learners: n };
}

/** Ro'yxatni qayta raqamlab, tanlanganini qo'shnisi bilan almashtiradi (1, 2, 3 ...). */
function swapped(ids, id, dir) {
  const i = ids.indexOf(id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const out = ids.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

async function renumber(client, table, ids) {
  // Jadval nomi faqat shu fayldan keladi ('it_sections' yoki 'it_lessons')
  await client.query(
    `UPDATE ${table} AS x SET position = v.pos
       FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, pos)
      WHERE x.id = v.id AND x.position IS DISTINCT FROM v.pos::int`,
    [ids]
  );
}

export async function moveSection(run, tx, user, id, dir) {
  await ownedSection(run, user, id);
  const c = own(user, 1);
  return tx(async (client) => {
    const { rows } = await client.query(
      `SELECT s.id FROM it_sections s WHERE ${c.sql} ORDER BY s.position, s.created_at`, c.args
    );
    const ids = swapped(rows.map((r) => r.id), id, dir);
    if (ids) await renumber(client, 'it_sections', ids);
    return { moved: Boolean(ids) };
  });
}

// ---------- Mavzular ----------

async function ownedLesson(run, user, id) {
  const c = own(user, 2);
  const { rows } = await run(
    `SELECT ${LESSON_COLS}, s.title AS section_title,
            (SELECT count(*)::int FROM it_progress p WHERE p.lesson_id = l.id) AS learners
       FROM it_lessons l
       JOIN it_sections s ON s.id = l.section_id
      WHERE l.id = $1 AND ${c.sql}`,
    [id, ...c.args]
  );
  if (!rows[0]) throw new AppError(404, 'LESSON_NOT_FOUND', 'Mavzu topilmadi');
  return rows[0];
}

/** Muharrir uchun mavzu: to'liq kontent (qoralama bo'lsa ham). */
export async function getManagedLesson(run, user, id) {
  const l = await ownedLesson(run, user, id);
  return { ...l, content: draftContentSchema.parse(l.content || {}) };
}

/** Yangi mavzu bo'lim oxiriga qoralama bo'lib qo'shiladi. */
export async function createLesson(run, user, sectionId, data) {
  await ownedSection(run, user, sectionId);
  const { rows: [{ next }] } = await run(
    'SELECT coalesce(max(position), 0) + 1 AS next FROM it_lessons WHERE section_id = $1', [sectionId]
  );
  const { rows } = await run(
    `INSERT INTO it_lessons AS l (section_id, position, kind, title, xp, content, is_published)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, false)
     RETURNING l.id`,
    [sectionId, next, data.kind, data.title, data.kind === 'test' ? 20 : 10, JSON.stringify(EMPTY_CONTENT)]
  );
  return getManagedLesson(run, user, rows[0].id);
}

/**
 * E'lon qilishdan oldingi to'liq tekshiruv. Xabarlar muharrirda maydon yonida ko'rinadi.
 * @param {{title:string, content:object}} lesson qoralama sxemasidan o'tgan mavzu
 * @returns {{path:string, message:string}[]}
 */
export function publishIssues({ title, content }) {
  const out = [];
  const add = (path, message) => out.push({ path, message });
  const blank = (s) => !String(s ?? '').trim();
  // Takror: matn (katta-kichik harfsiz) va rasm birga bir xil bo'lsa
  // (bo'sh variant alohida xabar bilan aytiladi, shuning uchun bu yerda hisobga olinmaydi)
  const dup = (keys) => { const k = keys.filter((x) => x !== '|'); return new Set(k).size !== k.length; };
  const key = (t, img) => `${String(t ?? '').trim().toLowerCase()}|${img || ''}`;

  if (blank(title)) add('title', "Mavzu nomi bo'sh");
  const ex = content.exercises || [];
  if (!ex.length) add('exercises', "Kamida bitta mashq qo'shing");
  ex.forEach((e, i) => {
    const n = `${i + 1}-mashq`;
    const p = `exercises.${i}`;
    if (blank(e.prompt)) add(`${p}.prompt`, `${n}: savol matni bo'sh`);
    if (e.type === 'choice') {
      const im = e.option_images || [];
      if (e.options.length < 2) add(`${p}.options`, `${n}: kamida 2 ta javob varianti kerak`);
      e.options.forEach((o, k) => { if (blank(o) && !im[k]) add(`${p}.options.${k}`, `${n}: ${k + 1}-variant bo'sh (matn yoki rasm qo'ying)`); });
      if (e.answer >= e.options.length) add(`${p}.answer`, `${n}: to'g'ri javob belgilanmagan`);
      else if (e.options.length > 1 && dup(e.options.map((o, k) => key(o, im[k])))) add(`${p}.options`, `${n}: bir xil variantlar bor`);
    } else if (e.type === 'order') {
      const im = e.item_images || [];
      if (e.items.length < 3) add(`${p}.items`, `${n}: kamida 3 ta qadam kerak`);
      e.items.forEach((o, k) => { if (blank(o) && !im[k]) add(`${p}.items.${k}`, `${n}: ${k + 1}-qadam bo'sh (matn yoki rasm qo'ying)`); });
      if (e.items.length > 1 && dup(e.items.map((o, k) => key(o, im[k])))) add(`${p}.items`, `${n}: bir xil qadamlar bor (tartibni tekshirib bo'lmaydi)`);
    } else if (e.type === 'match') {
      const im = e.pair_images || [];
      if (e.pairs.length < 2) add(`${p}.pairs`, `${n}: kamida 2 ta juftlik kerak`);
      e.pairs.forEach(([a, b], k) => {
        if ((blank(a) && !im[k]?.[0]) || (blank(b) && !im[k]?.[1])) add(`${p}.pairs.${k}`, `${n}: ${k + 1}-juftlik to'liq emas`);
      });
      const side = (j) => e.pairs.map((x, k) => key(x[j], im[k]?.[j]));
      if (e.pairs.length > 1 && (dup(side(0)) || dup(side(1)))) add(`${p}.pairs`, `${n}: bir xil so'zlar bor (juftlikni ajratib bo'lmaydi)`);
    } else if (e.type === 'typing') {
      if (blank(e.text)) add(`${p}.text`, `${n}: yoziladigan matn bo'sh`);
    } else if (e.type === 'maze') {
      const { errors, shortest } = analyzeMaze(e.grid);
      errors.forEach((m) => add(`${p}.grid`, `${n}: ${m}`));
      if (shortest != null && e.mode === 'program' && e.max_commands != null && e.max_commands < shortest) {
        add(`${p}.max_commands`, `${n}: buyruqlar chegarasi juda kam (eng qisqa yo'l ${shortest} qadam)`);
      }
    }
  });
  return out;
}

/** Kontentdagi barcha rasm ID'lari. */
export function contentImages(c) {
  const ids = [c.story_image, c.helper?.image, c.term_image];
  for (const e of c.exercises || []) {
    ids.push(e.image, ...(e.option_images || []), ...(e.item_images || []), ...(e.pair_images || []).flat());
  }
  return [...new Set(ids.filter(Boolean))];
}

/** Bo'sh yordamchi karta, bo'sh izohlar va keraksiz rasm ro'yxatlarini olib tashlaydi. */
function tidy(content) {
  const c = { ...content };
  if (c.helper && !c.helper.title && !c.helper.text && !c.helper.image) delete c.helper;
  // Rasm ro'yxati variantlar soniga moslanadi; birorta rasm bo'lmasa, ro'yxat umuman saqlanmaydi
  const fit = (list, n, pair = false) => {
    if (!list) return undefined;
    const one = (x) => (pair ? [x?.[0] || null, x?.[1] || null] : x || null);
    const cut = Array.from({ length: n }, (_, k) => one(list[k]));
    return cut.flat().some(Boolean) ? cut : undefined;
  };
  c.exercises = c.exercises.map((e) => {
    const x = { ...e };
    if (!x.explain) delete x.explain;
    if (!x.image) delete x.image;
    const set = (k, v) => { if (v) x[k] = v; else delete x[k]; };
    if (x.type === 'choice') set('option_images', fit(x.option_images, x.options.length));
    if (x.type === 'order') set('item_images', fit(x.item_images, x.items.length));
    if (x.type === 'match') set('pair_images', fit(x.pair_images, x.pairs.length, true));
    return x;
  });
  return c;
}

const LESSON_FIELDS = ['title', 'kind', 'term', 'tool_id', 'minutes', 'xp', 'is_published'];

/**
 * Mavzuni saqlaydi. E'lon qilingan (yoki hozir e'lon qilinayotgan) mavzu to'liq tekshiriladi:
 * chala bo'lsa 422 LESSON_NOT_READY va xatolar ro'yxati qaytadi, hech narsa saqlanmaydi.
 */
export async function updateLesson(run, user, id, data) {
  const cur = await ownedLesson(run, user, id);
  const next = { ...cur };
  for (const k of LESSON_FIELDS) if (data[k] !== undefined) next[k] = data[k];
  let content = data.content ?? draftContentSchema.parse(cur.content || {});

  if (data.tool_id) {
    const t = ownTool(user, 2);
    const { rows } = await run(`SELECT 1 FROM it_tools t WHERE t.id = $1 AND ${t.sql}`, [data.tool_id, ...t.args]);
    if (!rows[0]) throw new AppError(400, 'TOOL_NOT_FOUND', 'Fikrlash quroli topilmadi');
  }
  const ids = contentImages(content);
  if (ids.length) {
    const { rows } = await run('SELECT id FROM it_images WHERE id = ANY($1::uuid[])', [ids]);
    if (rows.length !== ids.length) throw new AppError(400, 'IMAGE_NOT_FOUND', "Rasmlardan biri topilmadi. Uni qayta yuklang.");
  }
  if (next.is_published) {
    const issues = publishIssues({ title: next.title, content });
    if (issues.length) {
      throw new AppError(422, 'LESSON_NOT_READY', "Mavzu hali e'lon qilishga tayyor emas", issues);
    }
    content = lessonContentSchema.parse(tidy(content));
  } else {
    content = tidy(content);
  }

  await run(
    `UPDATE it_lessons
        SET title = $2, kind = $3, term = $4, tool_id = $5, minutes = $6, xp = $7,
            content = $8::jsonb, is_published = $9
      WHERE id = $1`,
    [id, next.title, next.kind, next.term || null, next.tool_id, next.minutes, next.xp, JSON.stringify(content), next.is_published]
  );
  return getManagedLesson(run, user, id);
}

export async function deleteLesson(run, user, id, force = false) {
  const l = await ownedLesson(run, user, id);
  if (l.learners > 0 && !force) throw hasProgress('bu mavzuni', l.learners);
  await run('DELETE FROM it_lessons WHERE id = $1', [id]);
  return { deleted: true, learners: l.learners };
}

export async function moveLesson(run, tx, user, id, dir) {
  const l = await ownedLesson(run, user, id);
  return tx(async (client) => {
    const { rows } = await client.query(
      'SELECT id FROM it_lessons WHERE section_id = $1 ORDER BY position, created_at', [l.section_id]
    );
    const ids = swapped(rows.map((r) => r.id), id, dir);
    if (ids) await renumber(client, 'it_lessons', ids);
    return { moved: Boolean(ids) };
  });
}

// ---------- Fikrlash qurollari ----------

export async function createTool(run, user, data) {
  const { rows } = await run(
    `INSERT INTO it_tools AS t (author_id, name, short, body) VALUES ($1, $2, $3, $4) RETURNING ${TOOL_COLS}`,
    [user.id, data.name, data.short, data.body]
  );
  return { ...rows[0], used: 0 };
}

const TOOL_FIELDS = ['name', 'short', 'body'];

export async function updateTool(run, user, id, data) {
  const keys = TOOL_FIELDS.filter((k) => data[k] !== undefined);
  const t = ownTool(user, keys.length + 2);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await run(
    `UPDATE it_tools t SET ${sets} WHERE t.id = $1 AND ${t.sql} RETURNING ${TOOL_COLS}`,
    [id, ...keys.map((k) => data[k]), ...t.args]
  );
  if (!rows[0]) throw new AppError(404, 'TOOL_NOT_FOUND', 'Fikrlash quroli topilmadi');
  return rows[0];
}

/** Qurol o'chirilsa, u biriktirilgan mavzulardan olinadi va o'quvchilar sumkasidan ham yo'qoladi. */
export async function deleteTool(run, user, id, force = false) {
  const t = ownTool(user, 2);
  const { rows } = await run(
    `SELECT t.id, (SELECT count(*)::int FROM it_lessons l WHERE l.tool_id = t.id) AS used
       FROM it_tools t WHERE t.id = $1 AND ${t.sql}`,
    [id, ...t.args]
  );
  if (!rows[0]) throw new AppError(404, 'TOOL_NOT_FOUND', 'Fikrlash quroli topilmadi');
  if (rows[0].used > 0 && !force) {
    throw new AppError(409, 'TOOL_IN_USE',
      `Bu qurol ${rows[0].used} ta mavzuga biriktirilgan. O'chirilsa, u mavzulardan va o'quvchilar sumkasidan olinadi.`,
      { used: rows[0].used });
  }
  await run('DELETE FROM it_tools WHERE id = $1', [id]);
  return { deleted: true };
}
