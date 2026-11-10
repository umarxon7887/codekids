// 3-eshik «Planshet: barmoq bilan boshqariladigan kompyuter» mavzusini bazaga yozadi (o'zbekcha): Kibi dialogi,
// saytdagi video, yordamchi karta, 6 ta savol va yakun. Yangi rasmlar scripts/assets/3-eshik/ da,
// 1- va 2-eshik rasmlari ham ishlatiladi. Mavzu 1-eshik turgan bo'limga, 2-eshikdan keyin (position 2) qo'yiladi.
// Takroriy ishlatsa ham xavfsiz.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-3-eshik.mjs                    -> qoralama
//   node --env-file=.env scripts/seed-3-eshik.mjs --publish          -> darhol chop etadi
//   node --env-file=.env scripts/seed-3-eshik.mjs --section <uuid>   -> shu bo'limga qo'yadi
//   node --env-file=.env scripts/seed-3-eshik.mjs --remove           -> mavzuni o'chiradi
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { putImage as putImage1, withImages, LESSON_ID as LESSON_1 } from './seed-1-eshik.mjs';
import { imageIds as imageIds2 } from './seed-2-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e005';
const ASSETS = new URL('./assets/3-eshik/', import.meta.url);
const VIDEO = 'it/video/3-eshik.mp4';
const hasVideo = (file) => existsSync(new URL(`../../frontend/public/${file}`, import.meta.url));

// 3-eshikning yangi rasmlari: nom -> o'lcham
export const IMAGES3 = {
  planshet: [468, 640],
  'planshet-yotiq': [640, 470],
  'planshet-ichi': [447, 640],
  'ekran-klaviatura': [468, 640],
  sensor: [640, 570],
  bosish: [640, 746],
  surish: [640, 764],
  kerish: [640, 691],
  'uzoq-bosish': [640, 761],
  kamera: [640, 585],
  quloqchin: [640, 677],
  qolqop: [640, 746],
  kirish: [359, 186],
  chiqish: [346, 176],
  ikkalasi: [444, 320],
};
// 1-eshikdan qo'shimcha olinadigan rasmlar (2-eshik ro'yxatida yo'qlari)
const EXTRA1 = ['protsessor', 'operativ-xotira'];

const img = (name) => `@${name}`;

async function putImage3(run, name) {
  const buf = await readFile(new URL(`${name}.webp`, ASSETS));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const [w, h] = IMAGES3[name];
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
  const ids = await imageIds2(run);
  for (const n of EXTRA1) ids[n] = await putImage1(run, n);
  for (const n of Object.keys(IMAGES3)) ids[n] = await putImage3(run, n);
  return ids;
}

export const LESSON = {
  title: 'Planshet: barmoq bilan boshqariladigan kompyuter',
  term: 'Sensorli ekran + barmoq harakatlari + datchik',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: 'Yana xush kelibsan, {ism}! Kompyuter va noutbuk ichini bilib olding.',
          buttons: [{ label: 'Davom', reply: '' }] },
        { pose: 'oylash', text: 'Mana bu planshet. Unda na klaviatura bor, na sichqoncha. Uni qanday boshqaramiz?',
          buttons: [
            { label: 'Bilmayman', reply: "Barmog'ing bilan! Ekranning o'zi ham tugma, ham sichqoncha.", reply_pose: 'tushuntirish' },
            { label: 'Barmoq bilan!', reply: 'Barakalla, {ism}! Aynan barmoq bilan.', reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: "Bilasanmi, ekran barmog'ingni qanday sezadi? Kel, ichiga qaraymiz!",
          buttons: [{ label: 'Ketdik!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Noutbuk → planshet',
      text: [
        'Klaviatura → ekrandagi klaviatura.',
        'Sensorli panel → barmoq bilan ekranga.',
        'Veb-kamera → old va orqa kamera.',
        'Klaviatura ostidagi qismlar → ekran ortida.',
        "Ekran ustida ko'rinmas sensor to'r bor: u barmog'ing qayerga tekkanini sezadi.",
      ].join('\n'),
      image: img('planshet'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('planshet'),
        prompt: "Planshetda klaviatura va sichqoncha o'rnini nima bosadi?",
        options: ['Sensorli ekran: barmoq bilan tegasan', 'Ichida yashirin sichqoncha bor', "Planshetni boshqarib bo'lmaydi"], answer: 0,
        explain: "Planshetda ekranning o'zi sezadi: qayerga tegsang, o'sha yer bosiladi. Yozish kerak bo'lsa, klaviatura ekranda chiqadi.",
        hint: "Planshetni qo'lingga olganda, nimaga tegasan?" },
      { type: 'match', prompt: 'Barmoq harakatini u qiladigan ish bilan juftla',
        pairs: [['Bir marta bosish', 'Ilovani ochadi'], ['Surish', 'Sahifani varaqlaydi'], ['Ikki barmoqni kerish', 'Rasmni kattalashtiradi'], ['Uzoq bosib turish', "Qo'shimcha menyu ochadi"]],
        pair_images: [[img('bosish'), null], [img('surish'), null], [img('kerish'), null], [img('uzoq-bosish'), null]],
        explain: "Sichqonchada bosish va g'ildirak bor edi. Planshetda ularning hammasini barmoq harakatlari qiladi.",
        hint: "Rasmni kattaroq ko'rish uchun barmoqlarni bir-biridan uzoqlashtirasan." },
      { type: 'sort', prompt: 'Planshet qismlarini ajrat: kirish, chiqish yoki ikkalasi?',
        groups: ['Kirish', 'Chiqish', 'Ikkalasi'],
        group_images: [img('kirish'), img('chiqish'), img('ikkalasi')],
        items: ['Mikrofon', 'Kamera', 'Karnaylar', 'Quloqchin', 'Sensorli ekran'],
        item_images: [img('mikrofon'), img('kamera'), img('ichki-karnay'), img('quloqchin'), img('sensor')],
        item_groups: [0, 0, 1, 1, 2],
        explain: "Mikrofon va kamera ma'lumot kiritadi, karnay va quloqchin ovoz chiqaradi. Sensorli ekran esa ikkalasini qiladi: rasm ko'rsatadi va barmog'ingni sezadi!",
        hint: "Ekran senga rasm ko'rsatadimi? Barmog'ingni sezadimi? Ikkalasi ham bo'lsa-chi?" },
      { type: 'order', prompt: "Ilova belgisiga bosding. Ichida nima bo'ladi? Tartibga qo'y",
        items: ['Barmoq ekranga tegadi', "Sensor to'r tegilgan joyni sezadi", 'Protsessor qaysi ilova ekanini topadi', 'Ilova diskdan operativ xotiraga yuklanadi', 'Ekranda ilova ochiladi'],
        item_images: [img('bosish'), img('sensor'), img('protsessor'), img('operativ-xotira'), img('planshet-yotiq')],
        explain: "Bu 1-eshikdagi zanjirning o'zi: kirish (barmoq) → ishlov (protsessor va xotira) → chiqish (ekran).",
        hint: 'Kirish → ishlov → chiqish. Barmoq birinchi, ekrandagi natija oxirgi.' },
      { type: 'choice', kind: 'predict', image: img('planshet-yotiq'),
        prompt: "Planshetni yonboshlatib burding, video ham yotiq bo'ldi. Buni kim sezdi?",
        options: ['Ichidagi burilish datchigi', "Kamera seni ko'rib qoldi", 'Batareya burilib ketdi'], answer: 0,
        explain: 'Planshet ichida burilish datchigi bor. U planshet qanday turganini sezadi va protsessorga aytadi, protsessor esa ekranni buradi.',
        hint: 'Planshetda nafaqat ekran, balki harakatni sezuvchi datchiklar ham bor.' },
      { type: 'choice', kind: 'predict', image: img('qolqop'),
        prompt: "Qishda qalin qo'lqop bilan ekranga bosding, planshet sezmadi. Nega?",
        options: ["Ekran barmoqdagi kichik tokni sezadi, qo'lqop uni to'sdi", 'Planshet sovuqda uxlab qoladi', "Qo'lqop juda og'ir"], answer: 0,
        explain: "Sensor to'r barmog'ingdagi juda kichik elektr tokini sezadi. Qalin qo'lqop uni o'tkazmaydi. Shuning uchun maxsus «sensorli» qo'lqoplar ham bor.",
        hint: "Videoni esla: sensor to'r barmog'ingdagi nimani sezadi?" },
    ],
    term_text: "Barakalla, {ism}! Endi bilasan: planshet o'sha kompyuter, faqat ekrani barmog'ingni sezadi. Ichida datchiklar bor, ular planshet burilganini ham sezadi.",
    term_image: img('planshet'),
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
     VALUES ($1, $2, 2, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
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
      console.log("3-eshik mavzusi o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { section: arg('--section'), publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`3-eshik yozildi: bo'lim «${r.section.title}», ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
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
