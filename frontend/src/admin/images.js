/**
 * @file Admin: rasm tanlash, brauzerda kichraytirish va yuklash.
 * Telefon rasmi 3-5 MB bo'lishi mumkin; bazaga yuborishdan oldin uzun tomoni 1280px gacha
 * kichraytiriladi va WebP (ishlamasa JPEG) qilinadi — odatda 50-300 KB.
 */
import { api } from '../core/api.js';
import { showError, toast } from '../core/toast.js';

const MAX_SIDE = 1280;
const TARGET = 450 * 1024; // serverda chegara 600 KB

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** @param {File} file @returns {Promise<{blob:Blob, width:number, height:number}>} */
export async function shrink(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) throw new Error('decode');
  let side = MAX_SIDE;
  for (let attempt = 0; attempt < 4; attempt++) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; // shaffof PNG JPEG'ga aylansa qora bo'lib qolmasin
    g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    const q = attempt === 0 ? 0.82 : 0.72;
    let blob = await canvasBlob(canvas, 'image/webp', q);
    if (!blob || blob.type !== 'image/webp') blob = await canvasBlob(canvas, 'image/jpeg', q + 0.05);
    if (blob && (blob.size <= TARGET || attempt === 3)) { bmp.close?.(); return { blob, width: w, height: h }; }
    side = Math.round(side * 0.75);
  }
  throw new Error('size');
}

/**
 * Fayl tanlash oynasini ochadi; fayl tanlansa kichraytirib yuklaydi.
 * Bekor qilinsa hech narsa qaytmaydi (Promise ochiq qoladi — chaqiruvchi faqat onStart'dan keyin kutadi).
 * @param {{onStart?:()=>void}} [o]
 * @returns {Promise<{id:string,width:number,height:number}|null>}
 */
export function pickAndUpload(o = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      o.onStart?.();
      resolve(await upload(file));
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** @param {File|Blob} file */
export async function upload(file) {
  if (!/^image\//.test(file.type)) { toast('Faqat rasm fayli (PNG, JPEG, WebP)'); return null; }
  let out;
  try {
    out = await shrink(file);
  } catch {
    toast("Rasmni ochib bo'lmadi. Boshqa rasm tanlang.");
    return null;
  }
  const fd = new FormData();
  fd.append('width', String(out.width));
  fd.append('height', String(out.height));
  fd.append('file', out.blob, out.blob.type === 'image/webp' ? 'rasm.webp' : 'rasm.jpg');
  try {
    const { image } = await api.post('/it/manage/images', fd);
    return image;
  } catch (e) {
    showError(e);
    return null;
  }
}
