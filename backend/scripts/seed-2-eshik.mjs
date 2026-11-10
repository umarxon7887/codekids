// 2-eshik «Noutbuk: kompyuter bitta sumkada» mavzusini bazaga yozadi (o'zbekcha): Kibi dialogi, saytdagi video,
// yordamchi karta, 6 ta savol va yakun. Yangi rasmlar scripts/assets/2-eshik/ da, 1-eshik rasmlari ham ishlatiladi.
// Mavzu 1-eshik turgan bo'limga, undan keyin (position 1) qo'yiladi. Takroriy ishlatsa ham xavfsiz.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-2-eshik.mjs                    -> qoralama
//   node --env-file=.env scripts/seed-2-eshik.mjs --publish          -> darhol chop etadi
//   node --env-file=.env scripts/seed-2-eshik.mjs --section <uuid>   -> shu bo'limga qo'yadi
//   node --env-file=.env scripts/seed-2-eshik.mjs --remove           -> mavzuni o'chiradi
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { putImage as putImage1, withImages, LESSON_ID as LESSON_1 } from './seed-1-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e003';
const ASSETS = new URL('./assets/2-eshik/', import.meta.url);
const VIDEO = 'it/video/2-eshik.mp4';
const hasVideo = (file) => existsSync(new URL(`../../frontend/public/${file}`, import.meta.url));

// 2-eshikning yangi rasmlari: nom -> o'lcham
export const IMAGES2 = {
  noutbuk: [640, 579],
  'noutbuk-yopiq': [640, 261],
  'noutbuk-ichi': [640, 482],
  ekran: [640, 488],
  touchpad: [640, 603],
  batareya: [640, 624],
  'batareya-bosh': [640, 531],
  zaryadlovchi: [640, 551],
  'ichki-karnay': [640, 533],
  vebkamera: [640, 361],
  mikrofon: [640, 361],
  korpa: [640, 542],
  rozetka: [261, 221],
};
// 1-eshikdan olinadigan rasmlar
export const IMAGES1 = ['monitor', 'sichqoncha', 'karnaylar', 'klaviatura', 'kompyuter-toliq', 'sistema-bloki', 'quvvat-bloki'];

const img = (name) => `@${name}`;

export async function putImage2(run, name) {
  const buf = await readFile(new URL(`${name}.webp`, ASSETS));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const [w, h] = IMAGES2[name];
  const { rows } = await run(
    `INSERT INTO it_images (author_id, mime, width, height, bytes, sha256, data)
     VALUES (NULL, 'image/webp', $1, $2, $3, $4, decode($5, 'base64'))
     ON CONFLICT (sha256) DO UPDATE SET sha256 = EXCLUDED.sha256
     RETURNING id`,
    [w, h, buf.length, sha, buf.toString('base64')]
  );
  return rows[0].id;
}

export async function imageIds(run) {
  const ids = {};
  for (const n of IMAGES1) ids[n] = await putImage1(run, n);
  for (const n of Object.keys(IMAGES2)) ids[n] = await putImage2(run, n);
  return ids;
}

export const LESSON = {
  title: 'Noutbuk: kompyuter bitta sumkada',
  term: 'Ekran + sensorli panel + batareya',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: "Yana xush kelibsan, {ism}! 1-eshikda kompyuter qanday yonishini o'rganding.",
          buttons: [{ label: 'Davom', reply: '' }] },
        { pose: 'oylash', text: 'Endi savol: shu kompyuterni maktabga olib bora olasanmi? Monitor, sistema bloki, simlar...',
          buttons: [
            { label: "Yo'q, og'ir", reply: "To'g'ri, og'ir! Lekin odamlar bunga yechim topishgan.", reply_pose: 'tushuntirish' },
            { label: 'Noutbuk bor-ku!', reply: 'Barakalla, {ism}! Aynan shu.', reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: 'Bilasanmi, noutbukning sistema bloki qayerda yashiringan? Kel, ichiga qaraymiz!',
          buttons: [{ label: 'Ketdik!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Kompyuter → noutbuk',
      text: [
        'Monitor → qopqoqdagi ekran.',
        'Sichqoncha → sensorli panel.',
        'Karnaylar → ichki karnaylar.',
        'Sistema bloki → klaviatura ostida.',
        'Rozetkadan tok → batareya.',
      ].join('\n'),
      image: img('noutbuk'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('noutbuk'),
        prompt: 'Noutbukda ekran, klaviatura va sistema bloki qayerda turadi?',
        options: ['Hammasi bitta qopqoqli qutida', 'Alohida-alohida, simlar bilan ulanadi', "Noutbukda ular yo'q"], answer: 0,
        explain: 'Noutbukda ekran qopqoqda, klaviatura pastda, sistema bloki esa klaviatura ostida. Hammasi bitta qutida.',
        hint: "Noutbukni bitta qo'l bilan ko'tarsa bo'ladi. Simlar kerakmi?" },
      { type: 'match', prompt: "Kompyuter qismini noutbukdagi o'rni bilan juftla",
        pairs: [['Monitor', 'Qopqoqdagi ekran'], ['Sichqoncha', 'Sensorli panel'], ['Karnaylar', 'Ichki karnaylar'], ['Rozetkadan tok', 'Batareya']],
        pair_images: [[img('monitor'), null], [img('sichqoncha'), null], [img('karnaylar'), null], [img('quvvat-bloki'), null]],
        explain: "Noutbukda har bir qismning kichik «egizagi» bor: ekran, sensorli panel, ichki karnaylar va batareya.",
        hint: "Sichqonchasiz noutbukda ko'rsatkichni nima bilan yurgizasan?" },
      { type: 'sort', prompt: 'Noutbuk qismlarini ajrat: kirish yoki chiqish?',
        groups: ['Kirish', 'Chiqish'],
        items: ['Klaviatura', 'Sensorli panel', 'Veb-kamera', 'Mikrofon', 'Ekran', 'Ichki karnaylar'],
        item_images: [img('klaviatura'), img('touchpad'), img('vebkamera'), img('mikrofon'), img('ekran'), img('ichki-karnay')],
        item_groups: [0, 0, 0, 0, 1, 1],
        explain: "Klaviatura, sensorli panel, kamera va mikrofon ma'lumot kiritadi. Ekran va karnaylar natijani chiqaradi. 1-eshikdagi kirish → ishlov → chiqish!",
        hint: "Kamera seni «ko'radi» (kiradi), ekran senga «ko'rsatadi» (chiqadi)." },
      { type: 'order', prompt: "Noutbuk qanday zaryadlanadi? Tartibga qo'y",
        items: ['Zaryadlovchini rozetkaga ulaysan', 'Zaryadlovchi tokni noutbukka beradi', "Batareya to'ladi", 'Simni uzasan', 'Noutbuk batareyadan ishlaydi'],
        item_images: [img('rozetka'), img('zaryadlovchi'), img('batareya'), img('noutbuk-yopiq'), img('noutbuk')],
        explain: "Tok rozetkadan zaryadlovchi orqali batareyaga boradi. Batareya to'lgach, noutbuk simsiz ham ishlaydi.",
        hint: "Tok qayerdan boshlanadi? Simni qachon uzsa bo'ladi?" },
      { type: 'choice', kind: 'predict', image: img('batareya-bosh'),
        prompt: "Zaryadlovchi ulanmagan, batareya 0% bo'ldi. Nima bo'ladi?",
        options: ["Noutbuk o'chadi, saqlanmagan ish yo'qolishi mumkin", 'Noutbuk diskdan quvvat oladi', "Hech narsa bo'lmaydi"], answer: 0,
        explain: "Batareya noutbukning «quvvat bloki». Tok tugasa, hamma qism to'xtaydi. Shuning uchun ishni oldindan saqlab qo'y.",
        hint: "1-eshikni esla: tok bo'lmasa, qismlar ishlay oladimi?" },
      { type: 'choice', kind: 'predict', image: img('korpa'),
        prompt: "Noutbukni yumshoq ko'rpa ustiga qo'yding, u qizib ketdi. Nega?",
        options: ["Ko'rpa havo teshiklarini to'sdi, sovutgich issiqni chiqara olmadi", "Ko'rpa noutbukka tok berdi", "Ekran juda yorug' edi"], answer: 0,
        explain: "Noutbuk ichida ham sovutgich bor. U havo teshiklaridan issiqni chiqaradi. Noutbukni stol kabi qattiq va tekis joyga qo'y.",
        hint: '1-eshikdagi changli sovutgichni esla. Issiq havo qayerdan chiqadi?' },
    ],
    term_text: "Barakalla, {ism}! Endi bilasan: noutbuk o'sha kompyuter, faqat bitta qutida. Ekran qopqoqda, sistema bloki klaviatura ostida, quvvatni esa batareya beradi.",
    term_image: img('noutbuk'),
  },
};

export async function seed(run, { section, publish = false } = {}) {
  const ids = await imageIds(run);
  const raw = { ...LESSON.content };
  if (hasVideo(VIDEO)) raw.video = { file: VIDEO, title: LESSON.title, check: true };
  const content = lessonContentSchema.parse(withImages(raw, ids));

  // Bo'lim: --section, bo'lmasa avvalgi joyi, bo'lmasa 1-eshik turgan bo'lim
  let sec = section;
  if (!sec) {
    const { rows: [old] } = await run('SELECT section_id FROM it_lessons WHERE id = $1', [LESSON_ID]);
    const { rows: [first] } = await run('SELECT section_id FROM it_lessons WHERE id = $1', [LESSON_1]);
    sec = old?.section_id || first?.section_id;
  }
  if (!sec) throw new Error("1-eshik topilmadi: avval seed-1-eshik.mjs ni ishga tushiring yoki --section bering");
  const { rows: [s] } = await run('SELECT id, title FROM it_sections WHERE id = $1', [sec]);
  if (!s) throw new Error(`Bo'lim topilmadi: ${sec}`);

  await run(
    `INSERT INTO it_lessons (id, section_id, position, kind, title, term, tool_id, minutes, xp, content, is_published)
     VALUES ($1, $2, 1, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET section_id = EXCLUDED.section_id, title = EXCLUDED.title, term = EXCLUDED.term,
       minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content,
       is_published = it_lessons.is_published OR EXCLUDED.is_published`,
    [LESSON_ID, s.id, LESSON.title, LESSON.term, LESSON.minutes, LESSON.xp, JSON.stringify(content), publish]
  );
  return { section: s, video: !!raw.video, exercises: content.exercises.length };
}

export async function remove(run) {
  await run('DELETE FROM it_lessons WHERE id = $1', [LESSON_ID]);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const URL_ = process.env.DATABASE_URL;
  if (!URL_) { console.error('DATABASE_URL kerak'); process.exit(1); }
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: URL_ });
  await client.connect();
  try {
    const run = (text, params) => client.query(text, params);
    if (process.argv.includes('--remove')) {
      await remove(run);
      console.log("2-eshik mavzusi o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { section: arg('--section'), publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`2-eshik yozildi: bo'lim «${r.section.title}», ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
      console.log(process.argv.includes('--publish') ? 'Mavzu chop etildi.' : "Mavzu qoralama: muharrirda ko'rib, «Chop etish» ni bosing.");
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
