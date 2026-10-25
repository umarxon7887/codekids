import { z } from 'zod';

// Bo'sh satr "tozalash" degani: bazaga NULL yoziladi
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

/** PUT /api/v1/profile: faqat yuborilgan maydonlar o'zgaradi. */
export const updateProfileSchema = z
  .object({
    nickname: z.string().trim().min(2, "Nikneym kamida 2 belgi bo'lishi kerak").max(40),
    // Quyidagilar faqat ustoz uchun (routes/profile.js tekshiradi)
    full_name: z.string().trim().min(2, "To'liq ism kamida 2 belgi bo'lishi kerak").max(120),
    school: optionalText(200),
    subjects: z
      .array(z.string().trim().min(1).max(50))
      .max(20)
      .transform((list) => [...new Set(list)]),
    experience_years: z.number().int().min(0).max(70).nullable(),
    age_group: optionalText(20),
  })
  .partial()
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "O'zgartirish uchun kamida bitta maydon yuboring",
  });

export const TEACHER_FIELDS = ['full_name', 'school', 'subjects', 'experience_years', 'age_group'];
