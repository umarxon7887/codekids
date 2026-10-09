/** @file O'quvchi xonaga qo'shiladi: POST /rooms/join, so'ng o'yin turiga qarab mount qiladi. */
import { api } from '../core/api.js';
import { showError } from '../core/toast.js';
import { html } from '../utils/dom.js';

/**
 * @param {HTMLElement} root
 * @param {string} code 6 belgili xona kodi
 * @returns {Promise<()=>void>}
 */
export async function mountRoom(root, code) {
  root.replaceChildren(html('<div class="skeleton skeleton--page"></div>'));
  try {
    const r = await api.post('/rooms/join', { code: code.toUpperCase() });
    const room = r.room || r;
    const roomCode = room.code || code.toUpperCase();
    if (room.game_type === 'labyrinth') {
      return (await import('../games/labyrinth/game.js')).mountLabyrinth(root, { code: roomCode });
    }
    return (await import('../games/typing/game.js')).mountTyping(root, {
      mode: 'room', code: roomCode, contentId: room.content_id, language: room.language || 'uz',
    });
  } catch (e) {
    showError(e);
    location.hash = '#/';
    return () => {};
  }
}
