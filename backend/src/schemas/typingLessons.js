import { z } from 'zod';

export const startSchema = z.object({ lesson_id: z.string().regex(/^r?\d-(\d|x)$/, "Dars id noto'g'ri") }).strict();

export const stepParams = z.object({
  id: z.string().uuid(),
  i: z.coerce.number().int().min(0).max(20),
});

export const stepSubmitSchema = z
  .object({
    typed: z.string().max(2000),
    errors: z.number().int().min(0).max(10000).default(0), // noto'g'ri bosilgan tugmalar soni
  })
  .strict();

export const courseQuery = z.object({ lang: z.enum(['uz', 'ru']).default('uz') });
