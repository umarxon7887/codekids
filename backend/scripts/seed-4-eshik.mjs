// 4-eshik «Telefon: cho'ntakdagi kompyuter» mavzusini bazaga yozadi (o'zbekcha): Kibi dialogi,
// saytdagi video, yordamchi karta, 6 ta savol va yakun. Yangi rasmlar scripts/assets/4-eshik/ da,
// 1-, 2- va 3-eshik rasmlari ham ishlatiladi. Mavzu 1-eshik turgan bo'limga, 3-eshikdan keyin qo'yiladi
// (bo'lim 0..n qayta raqamlanadi). Takroriy ishlatsa ham xavfsiz.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-4-eshik.mjs                    -> qoralama
//   node --env-file=.env scripts/seed-4-eshik.mjs --publish          -> darhol chop etadi
//   node --env-file=.env scripts/seed-4-eshik.mjs --section <uuid>   -> shu bo'limga qo'yadi
//   node --env-file=.env scripts/seed-4-eshik.mjs --remove           -> mavzuni o'chiradi
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { withImages, LESSON_ID as LESSON_1 } from './seed-1-eshik.mjs';
import { LESSON_ID as LESSON_2 } from './seed-2-eshik.mjs';
import { imageIds as imageIds3, LESSON_ID as LESSON_3 } from './seed-3-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e007';
const ASSETS = new URL('./assets/4-eshik/', import.meta.url);
const VIDEO = 'it/video/4-eshik.mp4';
const hasVideo = (file) => existsSync(new URL(`../../frontend/public/${file}`, import.meta.url));

// 4-eshikning yangi rasmlari: nom -> o'lcham.
// telefon-keng va tarmoq-yoq-keng: atrofi shaffof keng nusxalar, savolda rasm kichikroq ko'rinsin deb.
export const IMAGES4 = {
  telefon: [252, 440],
  'telefon-keng': [640, 400],
  'telefon-ichi': [254, 440],
  sim: [266, 332],
  antenna: [460, 640],
  minora: [482, 640],
  gapirish: [640, 591],
  'dost-tel': [640, 634],
  yaqinlik: [603, 640],
  gps: [402, 640],
  'barmoq-izi': [545, 640],
  vibratsiya: [374, 346],
  'tarmoq-yoq': [373, 640],
  'tarmoq-yoq-keng': [640, 400],
};

const img = (name) => `@${name}`;

async function putImage4(run, name) {
  const buf = await readFile(new URL(`${name}.webp`, ASSETS));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const [w, h] = IMAGES4[name];
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
  const ids = await imageIds3(run);
  for (const n of Object.keys(IMAGES4)) ids[n] = await putImage4(run, n);
  return ids;
}

// Darsni bo'limda `after` ro'yxatidagi birinchi topilgan darsdan keyin qo'yadi va bo'limni 0..n qilib qayta raqamlaydi.
// Hech biri topilmasa, oxiriga qo'yadi. Bo'limda boshqa (eski) darslar bo'lsa ham tartib buzilmaydi.
export async function placeAfter(run, sectionId, lessonId, after) {
  const { rows } = await run(
    'SELECT id FROM it_lessons WHERE section_id = $1 AND id <> $2 ORDER BY position, created_at, id',
    [sectionId, lessonId]
  );
  const ids = rows.map((r) => r.id);
  let at = ids.length;
  for (const a of after) { const i = ids.indexOf(a); if (i >= 0) { at = i + 1; break; } }
  ids.splice(at, 0, lessonId);
  await run(
    `UPDATE it_lessons l SET position = (v.pos - 1)::int
     FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, pos)
     WHERE l.id = v.id AND l.position <> (v.pos - 1)::int`,
    [ids]
  );
  return at;
}

export const LESSON = {
  title: "Telefon: cho'ntakdagi kompyuter",
  term: 'SIM karta + aloqa minorasi + datchiklar',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: 'Yana xush kelibsan, {ism}! Kompyuter, noutbuk va planshetni bilib olding. Endi eng kichigi qoldi.',
          buttons: [{ label: 'Davom', reply: '' }] },
        { pose: 'oylash', text: "Mana bu telefon. U planshetdan kichik, lekin planshet ko'pincha qila olmaydigan bitta ishni qiladi. Qaysi?",
          buttons: [
            { label: 'Bilmayman', reply: "Qo'ng'iroq qilish! Telefon bilan istalgan joydan do'stingga qo'ng'iroq qila olasan.", reply_pose: 'tushuntirish' },
            { label: "Qo'ng'iroq qilish!", reply: "Barakalla, {ism}! Aynan qo'ng'iroq qilish.", reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: "Bilasanmi, ovozing do'stingning telefoniga qanday yetib boradi? Kel, ko'ramiz!",
          buttons: [{ label: 'Ketdik!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Planshet → telefon',
      text: [
        "Katta ekran → cho'ntakbop ekran.",
        'Wi-Fi bilan internet → SIM karta va minora: hamma joyda aloqa.',
        'Burilish datchigi → + yaqinlik datchigi, GPS.',
        'Ovozli signal → + vibratsiya.',
        "Qo'ng'iroq yo'li: mikrofon → antenna → minora → do'stingning telefoni → karnay.",
      ].join('\n'),
      image: img('telefon'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('telefon-keng'),
        prompt: "Telefon qaysi qism bilan qo'ng'iroq qila oladi? Planshetlarda u ko'pincha bo'lmaydi.",
        options: ['SIM karta', 'Sovutgich', 'Klaviatura'], answer: 0,
        option_images: [img('sim'), null, null],
        explain: "SIM karta telefonni aloqa tarmog'iga ulaydi. Telefon raqaming ham shu kartada yozilgan.",
        hint: "Videoni esla: telefonning «pasporti» qaysi kichkina karta edi?" },
      { type: 'order', prompt: "Do'stingga qo'ng'iroq qilib, «Salom!» deding. Ovozing qanday yetib boradi? Tartibga qo'y",
        items: ['Sen gapirasan', 'Mikrofon ovozni signalga aylantiradi', "Antenna signalni radio to'lqin qilib yuboradi", "Aloqa minorasi do'stingning telefoniga uzatadi", "Do'stingning karnayi ovozni chiqaradi"],
        item_images: [img('gapirish'), img('mikrofon'), img('antenna'), img('minora'), img('dost-tel')],
        explain: "Yana o'sha zanjir: kirish (mikrofon) → uzatish (antenna va minora) → chiqish (karnay). Faqat bu safar ikki telefon orasida!",
        hint: "Sen birinchi, do'stingning karnayi oxirgi. O'rtada ovoz havoda uchadi." },
      { type: 'match', prompt: 'Telefon qismini u qiladigan ish bilan juftla',
        pairs: [['Yaqinlik datchigi', "Qulog'ingga tutsang, ekranni o'chiradi"], ['GPS', 'Xaritada qayerdaligingni topadi'], ['Barmoq izi skaneri', 'Telefonni faqat egasiga ochadi'], ['Vibratsiya motori', 'Ovozsiz rejimda titraydi']],
        pair_images: [[img('yaqinlik'), null], [img('gps'), null], [img('barmoq-izi'), null], [img('vibratsiya'), null]],
        explain: "Telefon kichkina, lekin ichida datchik va qismlar juda ko'p. Har biri bitta ishni bajaradi.",
        hint: "GPS osmondagi sun'iy yo'ldoshlarni eshitadi. Xarita kerak bo'lsa, kim yordam beradi?" },
      { type: 'sort', prompt: 'Telefon qismlarini ajrat: kirish, chiqish yoki ikkalasi?',
        groups: ['Kirish', 'Chiqish', 'Ikkalasi'],
        group_images: [img('kirish'), img('chiqish'), img('ikkalasi')],
        items: ['Mikrofon', 'Barmoq izi skaneri', 'Karnay', 'Vibratsiya motori', 'Sensorli ekran'],
        item_images: [img('mikrofon'), img('barmoq-izi'), img('ichki-karnay'), img('vibratsiya'), img('sensor')],
        item_groups: [0, 0, 1, 1, 2],
        explain: "Mikrofon va barmoq izi skaneri ma'lumot kiritadi. Karnay va vibratsiya senga xabar beradi. Sensorli ekran esa ikkalasini qiladi.",
        hint: 'Vibratsiya senga nimadir aytadimi yoki sendan nimadir oladimi?' },
      { type: 'choice', kind: 'predict', image: img('yaqinlik'),
        prompt: "Gaplashayotganda telefonni qulog'ingga tutding, ekran o'chib qoldi. Nega?",
        options: ['Yaqinlik datchigi yuzingni sezdi', 'Batareya tugab qoldi', 'Telefon buzilib qoldi'], answer: 0,
        explain: "Ekran tepasidagi yaqinlik datchigi yuz yaqinlashganini sezadi va ekranni o'chiradi. Shunda yuzing bilan tugmalarni bosib yubormaysan va batareya tejaladi.",
        hint: "Telefon buzilmagan: qulog'ingdan olsang, ekran yana yonadi." },
      { type: 'choice', kind: 'predict', image: img('tarmoq-yoq-keng'),
        prompt: "Tog'da telefon «Tarmoq yo'q» dedi va qo'ng'iroq bo'lmayapti. Nega?",
        options: ["Yaqin atrofda aloqa minorasi yo'q, radio to'lqin yetib kelmayapti", 'SIM karta uxlab qoldi', 'Mikrofon sovqotdi'], answer: 0,
        explain: "Telefon minora bilan radio to'lqin orqali gaplashadi. Minora uzoq bo'lsa yoki tog' to'sib qo'ysa, signal yetmaydi va qo'ng'iroq bo'lmaydi.",
        hint: "Qo'ng'iroq yo'lini esla: antennadan keyin ovoz qayerga boradi?" },
    ],
    term_text: "Barakalla, {ism}! Endi bilasan: telefon cho'ntakdagi kompyuter. SIM karta va minora orqali gaplashadi, datchiklari esa qulog'ingni ham, qayerdaligingni ham sezadi.",
    term_image: img('telefon'),
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
     VALUES ($1, $2, 3, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET section_id = EXCLUDED.section_id, title = EXCLUDED.title, term = EXCLUDED.term,
       minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content,
       is_published = it_lessons.is_published OR EXCLUDED.is_published`,
    [LESSON_ID, s.id, LESSON.title, LESSON.term, LESSON.minutes, LESSON.xp, JSON.stringify(content), publish]
  );
  const position = await placeAfter(run, s.id, LESSON_ID, [LESSON_3, LESSON_2, LESSON_1]);
  return { section: s, video: !!raw.video, exercises: content.exercises.length, position };
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
      console.log("4-eshik mavzusi o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { section: arg('--section'), publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`4-eshik yozildi: bo'lim «${r.section.title}», ${r.position + 1}-o'rin, ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
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
