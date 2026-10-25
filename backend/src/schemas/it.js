import { z } from 'zod';

export const lessonParams = z.object({ id: z.string().uuid() });

/** POST /it/lessons/:id/complete: necha marta xato qilgani (statistika uchun). */
export const completeSchema = z
  .object({
    mistakes: z.number().int().min(0).max(200).default(0),
  })
  .strict();

// ---------- Dars kontenti (it_lessons.content) ----------
// Muharrir (3-bosqich) shu sxema bilan tekshiradi; o'quvchi API'si ham shu tuzilmani qaytaradi.
const text = (max) => z.string().trim().min(1).max(max);
const explain = z.string().trim().max(400).optional();

const choiceExercise = z.object({
  type: z.literal('choice'),
  // Savol turi (faqat yorliq uchun): nima bo'ladi?, xatoni top, ortiqchasini top, hayotdan o'xshatish
  kind: z.enum(['predict', 'error', 'odd', 'analogy', 'general']).default('general'),
  prompt: text(400),
  options: z.array(text(160)).min(2).max(5),
  answer: z.number().int().min(0),
  explain,
}).refine((e) => e.answer < e.options.length, { message: "To'g'ri javob varianti ro'yxatda yo'q", path: ['answer'] });

const orderExercise = z.object({
  type: z.literal('order'),
  prompt: text(400),
  items: z.array(text(120)).min(3).max(6), // to'g'ri tartibda yoziladi, o'quvchiga aralashtirib ko'rsatiladi
  explain,
});

const matchExercise = z.object({
  type: z.literal('match'),
  prompt: text(400),
  pairs: z.array(z.tuple([text(80), text(80)])).min(2).max(5),
  explain,
});

export const exerciseSchema = z.union([choiceExercise, orderExercise, matchExercise]);

// YouTube videosi: faqat 11 belgili video ID saqlanadi (havola muharrirda ID'ga aylantiriladi).
// Pleyer har doim youtube-nocookie.com/embed/<ID> dan quriladi, shuning uchun begona havola sahifaga tushmaydi.
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "YouTube havolasi noto'g'ri");
const video = z.object({ id: youtubeId, title: z.string().trim().max(120).default('') });

export const lessonContentSchema = z.object({
  story: z.string().trim().max(1500).default(''),              // vaziyat / hikoya
  video: video.optional(),                                      // hikoyadan keyin ko'rsatiladigan video
  helper: z.object({ title: z.string().trim().max(80), text: z.string().trim().max(800) }).optional(), // yordamchi karta
  exercises: z.array(exerciseSchema).min(1).max(12),
  term_text: z.string().trim().max(600).default(''),           // yakunda termin tushuntirishi
});

// ---------- Muharrir: qoralama ----------
// Qoralama chala bo'lishi mumkin (bo'sh savol, bitta variant...), faqat tuzilma va uzunliklar tekshiriladi.
// E'lon qilishda services/itManage.js publishIssues() to'liq tekshiradi.
const dText = (max) => z.string().trim().max(max).default('');
const draftExercise = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('choice'),
    kind: z.enum(['predict', 'error', 'odd', 'analogy', 'general']).default('general'),
    prompt: dText(400),
    options: z.array(dText(160)).max(5).default([]),
    answer: z.number().int().min(0).max(4).default(0),
    explain: dText(400),
  }),
  z.object({ type: z.literal('order'), prompt: dText(400), items: z.array(dText(120)).max(6).default([]), explain: dText(400) }),
  z.object({ type: z.literal('match'), prompt: dText(400), pairs: z.array(z.tuple([dText(80), dText(80)])).max(5).default([]), explain: dText(400) }),
]);

export const draftContentSchema = z.object({
  story: dText(1500),
  video: z.object({ id: youtubeId, title: dText(120) }).optional(),
  helper: z.object({ title: dText(80), text: dText(800) }).optional(),
  exercises: z.array(draftExercise).max(12, "Bitta mavzuda ko'pi bilan 12 ta mashq").default([]),
  term_text: dText(600),
});

// ---------- Muharrir: so'rovlar ----------
export const idParams = z.object({ id: z.string().uuid() });
export const forceQuery = z.object({ force: z.enum(['1']).optional() });
export const moveSchema = z.object({ dir: z.enum(['up', 'down']) }).strict();

const title = z.string().trim().min(1, "Nomi bo'sh bo'lmasin").max(120);
const atLeastOne = (o) => Object.values(o).some((v) => v !== undefined);
const nothing = { message: "O'zgartirish uchun hech narsa yuborilmadi" };

export const sectionCreateSchema = z.object({
  title,
  method: z.string().trim().max(120).default(''),
  description: z.string().trim().max(1000).default(''),
}).strict();

export const sectionUpdateSchema = z.object({
  title: title.optional(),
  method: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  is_published: z.boolean().optional(),
}).strict().refine(atLeastOne, nothing);

export const lessonCreateSchema = z.object({
  title,
  kind: z.enum(['lesson', 'test']).default('lesson'),
}).strict();

export const lessonUpdateSchema = z.object({
  title: title.optional(),
  kind: z.enum(['lesson', 'test']).optional(),
  term: z.string().trim().max(80).optional(),
  tool_id: z.string().uuid().nullable().optional(),
  minutes: z.number().int().min(1).max(60).optional(),
  xp: z.number().int().min(0).max(1000).optional(),
  content: draftContentSchema.optional(),
  is_published: z.boolean().optional(),
}).strict().refine(atLeastOne, nothing);

export const toolCreateSchema = z.object({
  name: z.string().trim().min(1, "Qurol nomi bo'sh bo'lmasin").max(80),
  short: z.string().trim().max(160).default(''),
  body: z.string().trim().max(1000).default(''),
}).strict();

export const toolUpdateSchema = z.object({
  name: z.string().trim().min(1, "Qurol nomi bo'sh bo'lmasin").max(80).optional(),
  short: z.string().trim().max(160).optional(),
  body: z.string().trim().max(1000).optional(),
}).strict().refine(atLeastOne, nothing);
