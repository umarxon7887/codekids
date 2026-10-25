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

export const lessonContentSchema = z.object({
  story: z.string().trim().max(1500).default(''),              // vaziyat / hikoya
  helper: z.object({ title: z.string().trim().max(80), text: z.string().trim().max(800) }).optional(), // yordamchi karta
  exercises: z.array(exerciseSchema).min(1).max(12),
  term_text: z.string().trim().max(600).default(''),           // yakunda termin tushuntirishi
});
