/** @file Renderer tanlash: WebGL bo'lsa 3D (Three.js, kechiktirib yuklanadi), aks holda 2D fallback. */
import { isLowPower } from '../../core/settings.js';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/** @param {HTMLCanvasElement} canvas @returns {Promise<any>} */
export async function createRenderer(canvas) {
  if (webglOk()) {
    try {
      const { MazeRenderer3D } = await import('./renderer3d.js');
      return new MazeRenderer3D(canvas, { lowPower: isLowPower() });
    } catch (e) { console.warn('3D yuklanmadi, 2D ishlatiladi:', e); }
  }
  const { MazeRenderer } = await import('./renderer2d.js');
  return new MazeRenderer(canvas);
}
