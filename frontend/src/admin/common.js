/** @file Admin paneli: umumiy yordamchilar. */
import { api } from '../core/api.js';
import { showError, toast } from '../core/toast.js';

/** O'chirish: o'quvchi progressi bo'lsa server 409 qaytaradi, admin yana bir bor tasdiqlaydi. */
export async function removeWithProgress(path) {
  try {
    await api.del(path);
    toast("O'chirildi");
    return true;
  } catch (e) {
    if (e.code !== 'HAS_PROGRESS' && e.code !== 'TOOL_IN_USE') { showError(e); return false; }
    if (!confirm(`${e.message}\n\nBaribir o'chirilsinmi?`)) return false;
    try {
      await api.del(path, { query: { force: 1 } });
      toast("O'chirildi");
      return true;
    } catch (e2) { showError(e2); return false; }
  }
}


// Yig'ilgan/ochilgan bo'limlar shu brauzerda eslab qolinadi (localStorage bo'lmasa ham ishlaydi)
const FOLD_KEY = 'ck.ad.fold';
const readFolds = () => { try { return JSON.parse(localStorage.getItem(FOLD_KEY) || '{}') || {}; } catch { return {}; } };
export const folds = {
  /** @param {string} k @param {boolean} def true = yig'ilgan */
  get(k, def = false) { const v = readFolds()[k]; return typeof v === 'boolean' ? v : def; },
  set(k, v) { try { const o = readFolds(); o[k] = v; localStorage.setItem(FOLD_KEY, JSON.stringify(o)); } catch { /* xotira yopiq */ } },
};
