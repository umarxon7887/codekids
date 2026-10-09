import { z } from 'zod';

export const createSessionSchema = z.object({
  content_id: z.string().uuid(),
  game_mode: z.enum(['solo', 'race']).default('solo'),
  language: z.enum(['uz', 'ru', 'en']),
  room_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/, "Xona kodi noto'g'ri").optional(),
  level: z.coerce.number().int().min(1).max(4).default(1),
});

export const submitResultSchema = z.object({
  session_id: z.string().uuid(),
  typed_text: z.string().max(5000),
});
export const guestSessionSchema = z.object({
  content_id: z.string().uuid().optional(),
});

export const guestResultSchema = z.object({
  guest_token: z.string().min(20).max(4000),
  typed_text: z.string().max(5000),
});
