import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createRoomSchema, joinRoomSchema, roomCodeParams, kickParams } from '../schemas/rooms.js';
import { createRoom, joinRoom, getRoomForUser, listPlayers, publicRoom } from '../services/rooms.js';
import { closeRoom, kickPlayer } from '../socket/control.js';

const router = Router();

// POST /api/v1/rooms: xona yaratish (teacher)
router.post(
  '/',
  requireAuth,
  requireRole('teacher'),
  validate({ body: createRoomSchema }),
  async (req, res) => {
    const room = await createRoom(req.user.id, req.validated.body);
    res.status(201).json({ room: publicRoom(room, { includeSettings: true }) });
  }
);

// POST /api/v1/rooms/join: kod orqali qo'shilish (student)
router.post(
  '/join',
  requireAuth,
  validate({ body: joinRoomSchema }),
  async (req, res) => {
    const { room, player, joined } = await joinRoom(req.user.id, req.validated.body.code);
    res.status(joined ? 201 : 200).json({ room: publicRoom(room), player, joined });
  }
);

// GET /api/v1/rooms/:code
router.get(
  '/:code',
  requireAuth,
  validate({ params: roomCodeParams }),
  async (req, res) => {
    const { room, isHost } = await getRoomForUser(req.validated.params.code, req.user.id);
    res.json({ room: publicRoom(room, { includeSettings: isHost }) });
  }
);

// GET /api/v1/rooms/:code/players
router.get(
  '/:code/players',
  requireAuth,
  validate({ params: roomCodeParams }),
  async (req, res) => {
    const { room } = await getRoomForUser(req.validated.params.code, req.user.id);
    const players = await listPlayers(room.id);
    res.json({ players });
  }
);

// POST /api/v1/rooms/:code/close: xonani yopish (faqat host)
router.post(
  '/:code/close',
  requireAuth,
  requireRole('teacher'),
  validate({ params: roomCodeParams }),
  async (req, res) => {
    res.json(await closeRoom(req.validated.params.code, req.user.id));
  }
);

// POST /api/v1/rooms/:code/players/:playerId/kick: o'yinchini chiqarish (faqat host)
router.post(
  '/:code/players/:playerId/kick',
  requireAuth,
  requireRole('teacher'),
  validate({ params: kickParams }),
  async (req, res) => {
    const { code, playerId } = req.validated.params;
    res.json(await kickPlayer(code, req.user.id, playerId));
  }
);

export default router;
