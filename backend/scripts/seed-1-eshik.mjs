// 1-eshik «Kompyuter nima?» mavzusini bazaga yozadi: Kibi dialogi, saytdagi video («Tushundingmi?» bilan),
// yordamchi karta, 6 ta savol va yakun. Rasmlar scripts/assets/1-eshik/ dan it_images jadvaliga qo'shiladi.
// Takroriy ishlatsa ham xavfsiz: mavzu doimiy ID bilan yoziladi, rasmlar sha256 bo'yicha takrorlanmaydi.
// Mavzu muharrirda qanday joylashtirilgan bo'lsa (bo'lim, tartib, chop etilgani), shunday qoladi.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-1-eshik.mjs                    -> qoralama sifatida yozadi
//   node --env-file=.env scripts/seed-1-eshik.mjs --publish          -> darhol chop etadi
//   node --env-file=.env scripts/seed-1-eshik.mjs --section <uuid>   -> shu bo'limga qo'yadi
//   node --env-file=.env scripts/seed-1-eshik.mjs --remove           -> mavzuni o'chiradi
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e001';
const SECTION_ID = '00000000-0000-4000-8000-00000001e101'; // bo'lim topilmasa shu ID bilan yaratiladi
const ASSETS = new URL('./assets/1-eshik/', import.meta.url);

// Rasm nomi -> o'lchami (sahifa sakramasligi uchun)
const IMAGES = {
  'quvvat-bloki': [290, 227],
  monitor: [282, 257],
  sichqoncha: [178, 247],
  klaviatura: [316, 193],
  karnaylar: [289, 201],
  'operativ-xotira': [305, 77],
  'qattiq-disk': [248, 171],
  'sistema-bloki-ochiq': [816, 892],
  'kompyuter-toliq': [883, 504],
};
// Kontentda rasm o'rniga «@nom» yoziladi, yozishdan oldin rasm ID'siga almashtiriladi
const img = (name) => `@${name}`;

export const LESSON = {
  title: 'Kompyuter nima?',
  term: 'Kirish → ishlov → chiqish',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: 'Yana xush kelibsan, {ism}!',
      lines: [
        { pose: 'salom', text: 'Salom! Men Kibi, kiber bolakayman. Isming nima?', ask_name: true, first_only: true,
          buttons: [{ label: 'Davom', reply: '' }] },
        { pose: 'oylash', text: "Tanishganimdan xursandman, {ism}! IT ni o'rganishga qaror qildingmi?", ask_name: false, first_only: true,
          buttons: [
            { label: 'Ha!', reply: "Barakalla, {ism}! Bu juda to'g'ri qaror.", reply_pose: 'maqtash' },
            { label: 'Hali bilmayman', reply: "Hechqisi yo'q! Keling, birga sinab ko'ramiz. Senga yoqib qolishiga ishonaman.", reply_pose: 'dalda' },
          ] },
        { pose: 'tushuntirish', text: "Unday bo'lsa, kel 1-mavzumizni boshlaymiz! Bilasanmi, kompyuterni yoqish tugmasini bosganingda ichida nimalar bo'ladi? Kel, birga ko'ramiz!",
          ask_name: false, first_only: false, buttons: [{ label: 'Ketdik!', reply: '' }] },
      ],
    },
    story: '',
    video: { file: 'it/video/1-eshik.mp4', title: 'Kompyuter nima?', check: true },
    helper: {
      title: 'Yoqish zanjiri',
      text: [
        'Tugmani bosasan.',
        'Quvvat bloki hamma qismlarga tok beradi.',
        "Protsessor uyg'onib, qismlarni tekshiradi.",
        'Windows diskdan operativ xotiraga yuklanadi.',
        'Monitorda ish stoli chiqadi, kompyuter tayyor.',
      ].join('\n'),
      image: img('sistema-bloki-ochiq'),
    },
    exercises: [
      { type: 'choice', kind: 'general', prompt: 'Yoqish tugmasini bosganingda birinchi bo\'lib nima ishlaydi?',
        options: ['Quvvat bloki tok beradi', 'Monitor yonadi', 'Sichqoncha qimirlaydi'], answer: 0,
        option_images: [img('quvvat-bloki'), img('monitor'), img('sichqoncha')],
        explain: "Quvvat bloki hamma qismlarga tok beradi. Tok bo'lmasa, hech bir qism ishlamaydi.",
        hint: "Tok bo'lmasa, boshqa qismlar ishlay oladimi?" },
      { type: 'order', prompt: "Kompyuter yonish tartibini to'g'ri qo'y",
        items: ['Tugma bosiladi', 'Quvvat bloki tok beradi', 'Protsessor qismlarni tekshiradi', 'Windows xotiraga yuklanadi', 'Monitorda ish stoli chiqadi'],
        explain: 'Avval tok keladi, keyin protsessor uyg\'onadi, Windows yuklanadi va oxirida ekran tayyor bo\'ladi.',
        hint: 'Kim birinchi uyg\'onishi kerak? Ekran eng oxirida chiqqan edi.' },
      { type: 'match', prompt: 'Har bir tashqi qismni vazifasi bilan juftla',
        pairs: [['Monitor', "Ko'rsatadi"], ['Klaviatura', 'Harf yozadi'], ['Sichqoncha', "Ko'rsatkichni boshqaradi"], ['Karnay', 'Ovoz chiqaradi']],
        pair_images: [[img('monitor'), null], [img('klaviatura'), null], [img('sichqoncha'), null], [img('karnaylar'), null]],
        explain: '',
        hint: "Qaysi qism bilan ekranni ko'ramiz, qaysi biri bilan eshitamiz?" },
      { type: 'sort', prompt: 'Qismlarni ikki qutiga ajrat: sistema bloki ichida yoki tashqarida',
        groups: ['Ichida', 'Tashqarida'],
        items: ['Protsessor', 'Operativ xotira', 'Qattiq disk', 'Monitor', 'Klaviatura', 'Sichqoncha'],
        item_images: [null, img('operativ-xotira'), img('qattiq-disk'), img('monitor'), img('klaviatura'), img('sichqoncha')],
        item_groups: [0, 0, 0, 1, 1, 1],
        explain: 'Protsessor, operativ xotira va qattiq disk qutining ichida turadi. Monitor, klaviatura va sichqoncha esa tashqarida ulanadi.',
        hint: 'Qutini ochganda ichida nimalarni ko\'rgan eding?' },
      { type: 'choice', kind: 'general', prompt: "Kompyuter o'chganda ham fayllaring qayerda saqlanib qoladi?",
        options: ['Qattiq disk', 'Operativ xotira', 'Protsessor'], answer: 0,
        option_images: [img('qattiq-disk'), img('operativ-xotira'), null],
        explain: "Qattiq disk fayllarni kompyuter o'chganda ham saqlaydi.",
        hint: "Operativ xotira kompyuter o'chganda tozalanadi." },
      { type: 'choice', kind: 'predict', prompt: 'Klaviaturada «A» ni bosding. Keyin nima bo\'ladi?',
        options: ['Protsessor uni tushunadi va monitorda «A» chiqadi', "Kompyuter o'chib qoladi", "Harf diskka ketib, ekranda hech narsa chiqmaydi"], answer: 0,
        explain: 'Klaviatura signal yuboradi (kirish), protsessor uni tushunadi (ishlov), monitorda «A» chiqadi (chiqish).',
        hint: 'Kirish → ishlov → chiqish. Natija qayerda ko\'rinadi?' },
    ],
    term_text: "Barakalla, {ism}! Endi bilasan: tugmani bosganingda quvvat bloki tok beradi, protsessor uyg'onib qismlarni tekshiradi, Windows diskdan xotiraga yuklanadi va monitorda ish stoli chiqadi. Keyin sen buyruq berasan, protsessor uni bajaradi va monitor natijani ko'rsatadi. Dasturchilar buni kirish → ishlov → chiqish deb atashadi.",
    term_image: img('kompyuter-toliq'),
  },
};

/** Rasmni bazaga qo'shadi (bor bo'lsa, borini qaytaradi). */
async function putImage(run, name) {
  const buf = await readFile(new URL(`${name}.webp`, ASSETS));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const [w, h] = IMAGES[name];
  const { rows } = await run(
    `INSERT INTO it_images (author_id, mime, width, height, bytes, sha256, data)
     VALUES (NULL, 'image/webp', $1, $2, $3, $4, decode($5, 'base64'))
     ON CONFLICT (sha256) DO UPDATE SET sha256 = EXCLUDED.sha256
     RETURNING id`,
    [w, h, buf.length, sha, buf.toString('base64')]
  );
  return rows[0].id;
}

/** «@nom» belgilarini rasm ID'lariga almashtiradi. */
function withImages(value, ids) {
  if (typeof value === 'string' && value.startsWith('@')) return ids[value.slice(1)];
  if (Array.isArray(value)) return value.map((v) => withImages(v, ids));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withImages(v, ids)]));
  return value;
}

async function pickSection(run, wanted) {
  if (wanted) {
    const { rows } = await run('SELECT id, title FROM it_sections WHERE id = $1', [wanted]);
    if (!rows[0]) throw new Error(`Bo'lim topilmadi: ${wanted}`);
    return rows[0];
  }
  const { rows } = await run('SELECT id, title FROM it_sections WHERE is_global ORDER BY position, created_at LIMIT 1');
  if (rows[0]) return rows[0];
  await run(
    `INSERT INTO it_sections (id, is_global, position, title, method, description, is_published)
     VALUES ($1, true, 1, 'Kompyuter bilan tanishuv', 'Ketma-ketlik', '', false)
     ON CONFLICT (id) DO NOTHING`,
    [SECTION_ID]
  );
  return { id: SECTION_ID, title: "Kompyuter bilan tanishuv (yangi, chop etilmagan)" };
}

export async function seed(run, { section, publish = false } = {}) {
  const ids = {};
  for (const name of Object.keys(IMAGES)) ids[name] = await putImage(run, name);
  const content = lessonContentSchema.parse(withImages(LESSON.content, ids));

  const { rows: [old] } = await run('SELECT section_id FROM it_lessons WHERE id = $1', [LESSON_ID]);
  const sec = old && !section ? { id: old.section_id, title: '(avvalgi joyida)' } : await pickSection(run, section);
  await run(
    `INSERT INTO it_lessons (id, section_id, position, kind, title, term, tool_id, minutes, xp, content, is_published)
     VALUES ($1, $2, 0, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET section_id = EXCLUDED.section_id, title = EXCLUDED.title, term = EXCLUDED.term,
       minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content,
       is_published = it_lessons.is_published OR EXCLUDED.is_published`,
    [LESSON_ID, sec.id, LESSON.title, LESSON.term, LESSON.minutes, LESSON.xp, JSON.stringify(content), publish]
  );
  return { section: sec, images: Object.keys(ids).length, exercises: content.exercises.length };
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
      console.log("1-eshik mavzusi o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { section: arg('--section'), publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`1-eshik yozildi: bo'lim «${r.section.title}», ${r.exercises} ta savol, ${r.images} ta rasm.`);
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
