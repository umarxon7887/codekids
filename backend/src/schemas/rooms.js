import { z } from 'zod';

const labyrinthSettings = z.object({
  size: z
    .number()
    .int()
    .min(5)
    .max(41)
    .refine((n) => n % 2 === 1, { message: "Labirint o'lchami toq son bo'lishi kerak" }),
});

export const createRoomSchema = z
  .object({
    game_type: z.enum(['typing', 'labyrinth']),
    content_id: z.string().uuid().optional(),
    topic: z.string().trim().min(1).max(100).optional(),
    level: z.number().int().min(1).max(4).default(1),
    max_players: z.number().int().min(2).max(100).default(30),
    duration_minutes: z.number().int().min(1).max(120).default(10),
    labyrinth: labyrinthSettings.default({ size: 15 }),
    mode: z.unknown().optional().transform((v) => (v === 'kids' ? 'kids' : 'standard')),
  })
  .superRefine((d, ctx) => {
    if (!d.content_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content_id'],
        message:
          d.game_type === 'typing'
            ? 'Typing xonasi uchun content_id kerak'
            : 'Labirint xonasi uchun savollar (questions) kontenti kerak',
      });
    }
  });

const roomCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,8}$/, "Xona kodi noto'g'ri");

export const joinRoomSchema = z.object({ code: roomCode });

export const roomCodeParams = z.object({ code: roomCode });

export const socketProgressPayload = z.object({
  code: roomCode,
  correct: z.number().int().min(0).max(5000),
});

export const labyrinthMoveSchema = z.object({
  code: roomCode,
  direction: z.enum(['up', 'down', 'left', 'right']),
});

export const labyrinthAnswerSchema = z.object({
  code: roomCode,
  choice: z.number().int().min(0).max(3),
});
export const kickParams = z.object({ code: roomCode, playerId: z.string().uuid() });
