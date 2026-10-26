import { z } from 'zod';
import { analyzeMaze } from '../utils/maze.js';

export const lessonParams = z.object({ id: z.string().uuid() });

/** POST /it/lessons/:id/complete: necha marta xato qilgani (statistika uchun). */
export const completeSchema = z
  .object({
    mistakes: z.number().int().min(0).max(200).default(0),
  })
  .strict();

// ---------- Dars kontenti (it_lessons.content) ----------
// O'quvchi API'si shu tuzilmani qaytaradi. Rasm maydonlari — it_images jadvalidagi rasm ID'si (uuid).
const text = (max) => z.string().trim().min(1).max(max);
const label = (max) => z.string().trim().max(max); // rasm qo'yilgan bo'lsa matn bo'sh bo'lishi mumkin
const explain = z.string().trim().max(400).optional();
export const imageId = z.string().uuid();
const image = imageId.optional();
const images = (n) => z.array(imageId.nullable()).max(n).optional();
const pairImages = z.array(z.tuple([imageId.nullable(), imageId.nullable()])).max(5).optional();
const filled = (texts, imgs) => texts.every((t, k) => t || imgs?.[k]);
const needText = (path) => ({ message: "Matn yoki rasm bo'lishi kerak", path: [path] });
const KINDS = ['predict', 'error', 'odd', 'analogy', 'general'];

const choiceExercise = z.object({
  type: z.literal('choice'),
  // Savol turi (faqat yorliq uchun): nima bo'ladi?, xatoni top, ortiqchasini top, hayotdan o'xshatish
  kind: z.enum(KINDS).default('general'),
  prompt: text(400),
  image,
  options: z.array(label(160)).min(2).max(5),
  option_images: images(5),
  answer: z.number().int().min(0),
  explain,
}).refine((e) => e.answer < e.options.length, { message: "To'g'ri javob varianti ro'yxatda yo'q", path: ['answer'] })
  .refine((e) => filled(e.options, e.option_images), needText('options'));

const orderExercise = z.object({
  type: z.literal('order'),
  prompt: text(400),
  image,
  items: z.array(label(120)).min(3).max(6), // to'g'ri tartibda yoziladi, o'quvchiga aralashtirib ko'rsatiladi
  item_images: images(6),
  explain,
}).refine((e) => filled(e.items, e.item_images), needText('items'));

const matchExercise = z.object({
  type: z.literal('match'),
  prompt: text(400),
  image,
  pairs: z.array(z.tuple([label(80), label(80)])).min(2).max(5),
  pair_images: pairImages,
  explain,
}).refine((e) => e.pairs.every(([a, b], k) => (a || e.pair_images?.[k]?.[0]) && (b || e.pair_images?.[k]?.[1])), needText('pairs'));

// Mini-o'yin: berilgan matnni yozish (aniqlik chegarasidan o'tsa to'g'ri)
const typingExercise = z.object({
  type: z.literal('typing'),
  prompt: text(400),
  image,
  text: text(300),
  min_accuracy: z.number().int().min(50).max(100).default(90),
  case_sensitive: z.boolean().default(false),
  explain,
});

// Mini-o'yin: labirint. program — bola buyruqlar tuzib ishga tushiradi; direct — strelkalar bilan o'zi yurgizadi
const MAZE_ROW = /^[#.SG]+$/;
const mazeExercise = z.object({
  type: z.literal('maze'),
  prompt: text(400),
  image,
  mode: z.enum(['program', 'direct']).default('program'),
  grid: z.array(z.string().regex(MAZE_ROW)).min(3).max(10),
  max_commands: z.number().int().min(1).max(40).nullable().default(null),
  explain,
}).superRefine((e, ctx) => {
  const { errors, shortest } = analyzeMaze(e.grid);
  for (const m of errors) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grid'], message: m });
  if (shortest != null && e.mode === 'program' && e.max_commands != null && e.max_commands < shortest) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_commands'], message: `eng qisqa yo'l ${shortest} qadam` });
  }
});

export const exerciseSchema = z.union([choiceExercise, orderExercise, matchExercise, typingExercise, mazeExercise]);

// YouTube videosi: faqat 11 belgili video ID saqlanadi (havola muharrirda ID'ga aylantiriladi).
// Pleyer har doim youtube-nocookie.com/embed/<ID> dan quriladi, shuning uchun begona havola sahifaga tushmaydi.
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "YouTube havolasi noto'g'ri");
const video = z.object({ id: youtubeId, title: z.string().trim().max(120).default('') });

export const lessonContentSchema = z.object({
  story: z.string().trim().max(1500).default(''),              // vaziyat / hikoya
  story_image: image,
  video: video.optional(),                                      // hikoyadan keyin ko'rsatiladigan video
  helper: z.object({ title: z.string().trim().max(80), text: z.string().trim().max(800), image }).optional(), // yordamchi karta
  exercises: z.array(exerciseSchema).min(1).max(12),
  term_text: z.string().trim().max(600).default(''),           // yakunda termin tushuntirishi
  term_image: image,
});

// ---------- Muharrir: qoralama ----------
// Qoralama chala bo'lishi mumkin (bo'sh savol, bitta variant...), faqat tuzilma va uzunliklar tekshiriladi.
// E'lon qilishda services/itManage.js publishIssues() to'liq tekshiradi.
const dText = (max) => z.string().trim().max(max).default('');
const draftExercise = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('choice'),
    kind: z.enum(KINDS).default('general'),
    prompt: dText(400),
    image,
    options: z.array(dText(160)).max(5).default([]),
    option_images: images(5),
    answer: z.number().int().min(0).max(4).default(0),
    explain: dText(400),
  }),
  z.object({ type: z.literal('order'), prompt: dText(400), image, items: z.array(dText(120)).max(6).default([]), item_images: images(6), explain: dText(400) }),
  z.object({ type: z.literal('match'), prompt: dText(400), image, pairs: z.array(z.tuple([dText(80), dText(80)])).max(5).default([]), pair_images: pairImages, explain: dText(400) }),
  z.object({
    type: z.literal('typing'),
    prompt: dText(400),
    image,
    text: dText(300),
    min_accuracy: z.number().int().min(50).max(100).default(90),
    case_sensitive: z.boolean().default(false),
    explain: dText(400),
  }),
  z.object({
    type: z.literal('maze'),
    prompt: dText(400),
    image,
    mode: z.enum(['program', 'direct']).default('program'),
    grid: z.array(z.string().max(10).regex(/^[#.SG]*$/)).max(10).default([]),
    max_commands: z.number().int().min(1).max(40).nullable().default(null),
    explain: dText(400),
  }),
]);

export const draftContentSchema = z.object({
  story: dText(1500),
  story_image: image,
  video: z.object({ id: youtubeId, title: dText(120) }).optional(),
  helper: z.object({ title: dText(80), text: dText(800), image }).optional(),
  exercises: z.array(draftExercise).max(12, "Bitta mavzuda ko'pi bilan 12 ta mashq").default([]),
  term_text: dText(600),
  term_image: image,
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
