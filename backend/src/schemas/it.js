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
// Xato javobda qahramon beradigan maslahat (bo'lmasa yordamchi karta matni chiqadi)
const hint = z.string().trim().max(300).optional();

/** Qahramon (Kibi) holatlari: frontend/public/it/kibi/<holat>.webp */
export const POSES = ['salom', 'oylash', 'maqtash', 'oddiy', 'tushuntirish', 'usta', 'galaba', 'dalda'];

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
  hint,
}).refine((e) => e.answer < e.options.length, { message: "To'g'ri javob varianti ro'yxatda yo'q", path: ['answer'] })
  .refine((e) => filled(e.options, e.option_images), needText('options'));

const orderExercise = z.object({
  type: z.literal('order'),
  prompt: text(400),
  image,
  items: z.array(label(120)).min(3).max(6), // to'g'ri tartibda yoziladi, o'quvchiga aralashtirib ko'rsatiladi
  item_images: images(6),
  explain,
  hint,
}).refine((e) => filled(e.items, e.item_images), needText('items'));

const matchExercise = z.object({
  type: z.literal('match'),
  prompt: text(400),
  image,
  pairs: z.array(z.tuple([label(80), label(80)])).min(2).max(5),
  pair_images: pairImages,
  explain,
  hint,
}).refine((e) => e.pairs.every(([a, b], k) => (a || e.pair_images?.[k]?.[0]) && (b || e.pair_images?.[k]?.[1])), needText('pairs'));

// Saralash: har bir narsani guruhlardan biriga ajratish (masalan: «ichida» / «tashqarida»).
// item_groups[k] — k-narsaning to'g'ri guruhi (groups ro'yxatidagi raqami).
const sortExercise = z.object({
  type: z.literal('sort'),
  prompt: text(400),
  image,
  groups: z.array(text(40)).min(2).max(3),
  group_images: images(3),
  items: z.array(label(80)).min(2).max(8),
  item_images: images(8),
  item_groups: z.array(z.number().int().min(0).max(2)).max(8),
  explain,
  hint,
}).refine((e) => e.item_groups.length === e.items.length && e.item_groups.every((g) => g < e.groups.length),
  { message: 'Har bir narsaning guruhi belgilanishi kerak', path: ['item_groups'] })
  .refine((e) => filled(e.items, e.item_images), needText('items'));

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

export const exerciseSchema = z.union([choiceExercise, orderExercise, matchExercise, sortExercise, typingExercise, mazeExercise]);

// YouTube videosi: faqat 11 belgili video ID saqlanadi (havola muharrirda ID'ga aylantiriladi).
// Pleyer har doim youtube-nocookie.com/embed/<ID> dan quriladi, shuning uchun begona havola sahifaga tushmaydi.
export const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "YouTube havolasi noto'g'ri");
// Yoki saytning o'z fayli: frontend/public/it/video/<nom>.mp4 (reklama va begona tavsiyalarsiz).
// check: video tugagach qahramon «Tushundingmi?» deb so'raydi; «Yo'q» bo'lsa yordamchi karta va video qayta.
export const videoFile = z.string().regex(/^it\/video\/[a-z0-9-]{1,60}\.mp4$/, "Video fayl yo'li noto'g'ri (masalan: it/video/1-eshik.mp4)");
const video = z.object({
  id: youtubeId.optional(),
  file: videoFile.optional(),
  title: z.string().trim().max(120).default(''),
  check: z.boolean().default(false),
}).refine((v) => v.id || v.file, { message: 'YouTube havolasi yoki video fayl kerak' });

// Qahramon dialogi (darsdan oldin). {ism} o'rniga bola yozgan ism qo'yiladi.
// ask_name: shu gapda ism so'raladi; first_only: ism avval saqlangan bo'lsa (qayta kirganda) o'tkazib yuboriladi,
// unda welcome_back gapi aytiladi. Har tugmaning o'z javobi (reply) bo'lishi mumkin, keyin keyingi gapga o'tiladi.
const dialogButton = z.object({
  label: text(40),
  reply: z.string().trim().max(300).optional(),
  reply_pose: z.enum(POSES).optional(),
});
const dialogLine = z.object({
  pose: z.enum(POSES).default('oddiy'),
  text: text(400),
  ask_name: z.boolean().default(false),
  first_only: z.boolean().default(false),
  buttons: z.array(dialogButton).max(3).default([]),
});
const dialog = z.object({
  lines: z.array(dialogLine).min(1).max(8),
  welcome_back: z.string().trim().max(300).default(''),
});

export const lessonContentSchema = z.object({
  story: z.string().trim().max(1500).default(''),              // vaziyat / hikoya
  story_image: image,
  dialog: dialog.optional(),                                    // qahramon dialogi (bo'lsa, qahramon butun dars bo'ylab chiqadi)
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
    hint: dText(300),
  }),
  z.object({ type: z.literal('order'), prompt: dText(400), image, items: z.array(dText(120)).max(6).default([]), item_images: images(6), explain: dText(400), hint: dText(300) }),
  z.object({ type: z.literal('match'), prompt: dText(400), image, pairs: z.array(z.tuple([dText(80), dText(80)])).max(5).default([]), pair_images: pairImages, explain: dText(400), hint: dText(300) }),
  z.object({
    type: z.literal('sort'),
    prompt: dText(400),
    image,
    groups: z.array(dText(40)).max(3).default([]),
    group_images: images(3),
    items: z.array(dText(80)).max(8).default([]),
    item_images: images(8),
    item_groups: z.array(z.number().int().min(0).max(2)).max(8).default([]),
    explain: dText(400),
    hint: dText(300),
  }),
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
  dialog: z.object({
    lines: z.array(z.object({
      pose: z.enum(POSES).default('oddiy'),
      text: dText(400),
      ask_name: z.boolean().default(false),
      first_only: z.boolean().default(false),
      buttons: z.array(z.object({ label: dText(40), reply: dText(300), reply_pose: z.enum(POSES).optional() })).max(3).default([]),
    })).max(8).default([]),
    welcome_back: dText(300),
  }).optional(),
  video: z.object({ id: youtubeId.optional(), file: videoFile.optional(), title: dText(120), check: z.boolean().default(false) }).optional(),
  helper: z.object({ title: dText(80), text: dText(800), image }).optional(),
  exercises: z.array(draftExercise).max(12, "Bitta mavzuda ko'pi bilan 12 ta mashq").default([]),
  term_text: dText(600),
  term_image: image,
});

// ---------- O'quvchi: haqiqiy ism ----------
// Ism harf bilan boshlanadi; o'zbekcha tutuq belgilari (O'ktam, G'ayrat) va chiziqcha mumkin.
export const nameSchema = z.object({
  name: z.string().trim().transform((s) => s.replace(/\s+/g, ' '))
    .pipe(z.string().min(2, 'Ism kamida 2 harf').max(20, "Ism 20 harfdan oshmasin")
      .regex(/^\p{L}[\p{L}\p{M}'’ʻʼ‘` -]*$/u, 'Ismda faqat harflar bo\'lsin')),
}).strict();

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
  lang: z.enum(['uz', 'ru']).default('uz'),
}).strict();

export const sectionUpdateSchema = z.object({
  title: title.optional(),
  method: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  lang: z.enum(['uz', 'ru']).optional(),
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
