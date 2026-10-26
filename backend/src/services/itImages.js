/** @file IT darslari rasmlari: saqlash (bazada), ko'rsatish (xotira keshi bilan) va tozalash. */
import crypto from 'node:crypto';
import { AppError } from '../errors.js';

export const IMAGE_MAX_BYTES = 600 * 1024;
// Neon bepul tarifida joy cheklangan: rasmlar uchun umumiy chegara (MB)
const STORAGE_LIMIT = Number(process.env.IT_IMAGES_MAX_MB || 300) * 1024 * 1024;
// Server xotirasida eng ko'p ochilgan rasmlar (bazaga har safar bormaslik uchun)
const CACHE_LIMIT = 40 * 1024 * 1024;
const cache = new Map();
let cacheBytes = 0;

/** Fayl turini sarlavhasidan aniqlaydi (brauzer yuborgan turga ishonmaymiz). SVG qabul qilinmaydi. */
export function sniff(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

const size = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : null;
};

/**
 * Rasmni saqlaydi. Bir xil fayl ikkinchi marta yuklansa, avvalgisi qaytadi.
 * @param {Buffer} buf
 * @param {{width?:any, height?:any}} meta brauzer o'lchagan o'lcham (sahifa sakramasligi uchun)
 */
export async function saveImage(run, user, buf, meta = {}) {
  if (!buf?.length) throw new AppError(400, 'NO_FILE', 'Rasm fayli yuborilmadi');
  if (buf.length > IMAGE_MAX_BYTES) throw new AppError(413, 'IMAGE_TOO_LARGE', 'Rasm juda katta (600 KB gacha)');
  const mime = sniff(buf);
  if (!mime) throw new AppError(400, 'NOT_AN_IMAGE', 'Faqat WebP, JPEG yoki PNG rasm yuklash mumkin');
  const sha = crypto.createHash('sha256').update(buf).digest('hex');

  const { rows: [{ used }] } = await run('SELECT coalesce(sum(bytes), 0)::bigint AS used FROM it_images');
  if (Number(used) + buf.length > STORAGE_LIMIT) {
    throw new AppError(413, 'STORAGE_FULL', "Rasmlar uchun ajratilgan joy tugadi. Muharrir bosh sahifasida ishlatilmagan rasmlarni tozalang.");
  }
  const { rows } = await run(
    `INSERT INTO it_images (author_id, mime, width, height, bytes, sha256, data)
     VALUES ($1, $2, $3, $4, $5, $6, decode($7, 'base64'))
     ON CONFLICT (sha256) DO UPDATE SET sha256 = EXCLUDED.sha256
     RETURNING id, width, height, bytes`,
    [user.id, mime, size(meta.width), size(meta.height), buf.length, sha, buf.toString('base64')]
  );
  return rows[0];
}

/** @returns {Promise<{mime:string, data:Buffer}|null>} */
export async function getImage(run, id) {
  const hit = cache.get(id);
  if (hit) {
    cache.delete(id); // eng so'nggi ishlatilgan oxirga o'tadi
    cache.set(id, hit);
    return hit;
  }
  const { rows } = await run(`SELECT mime, encode(data, 'base64') AS b64 FROM it_images WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const img = { mime: rows[0].mime, data: Buffer.from(rows[0].b64, 'base64') };
  cache.set(id, img);
  cacheBytes += img.data.length;
  while (cacheBytes > CACHE_LIMIT && cache.size > 1) {
    const [k, v] = cache.entries().next().value;
    cache.delete(k);
    cacheBytes -= v.data.length;
  }
  return img;
}

// Hech bir mavzu kontentida uchramaydigan rasmlar. Yangi yuklangan (hali saqlanmagan) rasm
// tasodifan o'chib ketmasligi uchun 1 soatdan eskilari olinadi.
const UNUSED = `
  FROM it_images i
 WHERE i.created_at < now() - interval '1 hour'
   AND NOT EXISTS (SELECT 1 FROM it_lessons l WHERE position(i.id::text IN l.content::text) > 0)`;

export async function imageStats(run) {
  const { rows } = await run(
    `SELECT (SELECT count(*)::int FROM it_images) AS total,
            (SELECT coalesce(sum(bytes), 0)::bigint FROM it_images) AS bytes,
            (SELECT count(*)::int ${UNUSED}) AS unused,
            (SELECT coalesce(sum(i.bytes), 0)::bigint ${UNUSED}) AS unused_bytes`
  );
  const r = rows[0];
  return { total: r.total, bytes: Number(r.bytes), unused: r.unused, unused_bytes: Number(r.unused_bytes), limit: STORAGE_LIMIT };
}

export async function deleteUnusedImages(run) {
  const { rows } = await run(`DELETE FROM it_images WHERE id IN (SELECT i.id ${UNUSED}) RETURNING id`);
  for (const { id } of rows) {
    const v = cache.get(id);
    if (v) { cache.delete(id); cacheBytes -= v.data.length; }
  }
  return { deleted: rows.length };
}
