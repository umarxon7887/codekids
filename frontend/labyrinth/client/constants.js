// Backend bilan shartnoma (backend javobi bo'yicha). Nomlar o'zgarsa faqat shu yerda.
export const EVENTS = Object.freeze({
  JOIN: 'labyrinth:join', MOVE: 'labyrinth:move', ANSWER: 'labyrinth:answer',
  START: 'labyrinth:start', INIT: 'labyrinth:init', UPDATE: 'labyrinth:update', FINISHED: 'labyrinth:finished', APP_ERROR: 'app:error',
});
export const ERR = Object.freeze({
  BLOCKED: 'BLOCKED', TOO_FAST: 'TOO_FAST', QUESTION_PENDING: 'QUESTION_PENDING', PLAYER_FINISHED: 'PLAYER_FINISHED',
  ROOM_NOT_ACTIVE: 'ROOM_NOT_ACTIVE', ROOM_FINISHED: 'ROOM_FINISHED', NO_PENDING_QUESTION: 'NO_PENDING_QUESTION',
  LOCKED: 'LOCKED', RATE_LIMITED: 'RATE_LIMITED', VALIDATION_ERROR: 'VALIDATION_ERROR', INVALID_CHOICE: 'INVALID_CHOICE',
  NOT_A_PARTICIPANT: 'NOT_A_PARTICIPANT', FORBIDDEN: 'FORBIDDEN', GUEST_NOT_ALLOWED: 'GUEST_NOT_ALLOWED', WRONG_GAME_TYPE: 'WRONG_GAME_TYPE',
  AUTH_REQUIRED: 'AUTH_REQUIRED', TOKEN_EXPIRED: 'TOKEN_EXPIRED', TOKEN_INVALID: 'TOKEN_INVALID',
});
export const AUTH_ERRORS = [ERR.AUTH_REQUIRED, ERR.TOKEN_EXPIRED, ERR.TOKEN_INVALID];
export const DIRECTION = (dx, dy) => (dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right'); // server `direction: up|down|left|right` kutadi
export const isWall = (grid, x, y) => grid[y]?.[x] !== '0'; // grid[y] — satr (string), "1" devor, "0" yo'l; chegaradan tashqari = devor
export const State = Object.freeze({ LOBBY: 'lobby', GENERATING: 'generating', PLAYING: 'playing', ANSWERING: 'answering', FINISHED: 'finished' });
