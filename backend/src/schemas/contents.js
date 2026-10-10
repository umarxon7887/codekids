import { z } from 'zod';

export const uuidParams = z.object({
  id: z.string().uuid(),
});

const titleField = z.string().trim().min(3).max(200);
const descriptionField = z.string().trim().max(1000);
const topicField = z.string().trim().min(1).max(100);
const levelField = z.number().int().min(1).max(4);

const questionItem = z
  .object({
    text: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((q) => q.answer < q.options.length, {
    message: "Javob indeksi variantlar sonidan katta",
    path: ['answer'],
  });

export const questionsDataSchema = z.object({
  questions: z.array(questionItem).min(1).max(100),
});

export const typingDataSchema = z.object({
  text: z.string().trim().min(20).max(2000),
});

export const contentDataSchemas = {
  questions: questionsDataSchema,
  typing_text: typingDataSchema,
};

export const createContentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('questions'),
    title: titleField,
    description: descriptionField.optional(),
    topic: topicField.optional(),
    level: levelField.default(1),
    data: questionsDataSchema,
  }),
  z.object({
    type: z.literal('typing_text'),
    title: titleField,
    description: descriptionField.optional(),
    topic: topicField.optional(),
    level: levelField.default(1),
    data: typingDataSchema,
  }),
]);

export const updateContentSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    topic: topicField.optional(),
    level: levelField.optional(),
    data: z.record(z.unknown()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Yangilash uchun kamida bitta maydon kerak",
  });

export const listQuerySchema = z.object({
  topic: topicField.optional(),
  level: z.coerce.number().int().min(1).max(4).optional(),
  type: z.enum(['questions', 'typing_text']).optional(),
  language: z.enum(['uz', 'ru']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Qidiruv uchun kamida 2 belgi").max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const bulkMetaSchema = z.object({
  title: titleField,
  topic: topicField.optional(),
  level: z.coerce.number().int().min(1).max(4).default(1),
});

export const csvRowSchema = z.object({
  question: z.string().trim().min(1).max(500),
  option_a: z.string().trim().min(1).max(200),
  option_b: z.string().trim().min(1).max(200),
  option_c: z.string().trim().max(200).default(''),
  option_d: z.string().trim().max(200).default(''),
  correct: z.enum(['A', 'B', 'C', 'D']),
});