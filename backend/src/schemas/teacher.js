import { z } from 'zod';

export const classIdParams = z.object({
  id: z.string().uuid(),
});

export const studentParams = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Sinf nomi kamida 2 belgi").max(120),
});

export const addStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
