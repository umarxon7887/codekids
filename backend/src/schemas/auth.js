import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, "Parol kamida 8 belgi bo'lishi kerak").max(72);

export const registerSchema = z
  .object({
    email,
    password,
    role: z.enum(['student', 'teacher']),
    nickname: z.string().trim().min(2).max(40),
    full_name: z.string().trim().min(2).max(120).optional(),
    school: z.string().trim().max(200).optional(),
    subjects: z.array(z.string().trim().max(50)).max(20).optional(),
    experience_years: z.number().int().min(0).max(70).optional(),
    age_group: z.string().trim().max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'teacher' && !data.full_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: "O'qituvchi uchun to'liq ism majburiy",
      });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});