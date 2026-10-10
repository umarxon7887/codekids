/** @file Host amallari: xonani yopish va o'yinchini chiqarish (backend shartnomasi). */
import { api } from './api.js';

/** @param {string} code */
export const closeRoom = (code) => api.post(`/rooms/${code}/close`, {});

/** @param {string} code @param {string|number} playerId */
export const kickPlayer = (code, playerId) => api.post(`/rooms/${code}/players/${playerId}/kick`, {});
