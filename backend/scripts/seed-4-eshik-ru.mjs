// 4-eshikning ruscha nusxasi «Телефон: компьютер в кармане»: ruscha bo'lim (1-eshik-ru bilan bir xil, lang='ru'),
// 3-eshikdan keyin (qolgan darslar suriladi, bo'lim 0..n qayta raqamlanadi). Rasmlar o'zbekcha nusxa bilan bir xil.
// Video: frontend/public/it/video/4-eshik-ru.mp4 bo'lsa qo'shiladi.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-4-eshik-ru.mjs              -> qoralama
//   node --env-file=.env scripts/seed-4-eshik-ru.mjs --publish    -> chop etadi
//   node --env-file=.env scripts/seed-4-eshik-ru.mjs --remove     -> mavzuni o'chiradi
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { withImages } from './seed-1-eshik.mjs';
import { SECTION_ID, LESSON_ID as LESSON_1 } from './seed-1-eshik-ru.mjs';
import { LESSON_ID as LESSON_2 } from './seed-2-eshik-ru.mjs';
import { LESSON_ID as LESSON_3 } from './seed-3-eshik-ru.mjs';
import { imageIds, placeAfter } from './seed-4-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e008';
const VIDEO = 'it/video/4-eshik-ru.mp4';
const hasVideo = () => existsSync(new URL(`../../frontend/public/${VIDEO}`, import.meta.url));
const img = (name) => `@${name}`;

export const LESSON = {
  title: 'Телефон: компьютер в кармане',
  term: 'SIM-карта + вышка связи + датчики',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: 'С возвращением, {ism}! Ты уже знаешь компьютер, ноутбук и планшет. Остался самый маленький.',
          buttons: [{ label: 'Дальше', reply: '' }] },
        { pose: 'oylash', text: 'Вот телефон. Он меньше планшета, но умеет то, чего планшет часто не умеет. Что именно?',
          buttons: [
            { label: 'Не знаю', reply: 'Звонить! С телефона можно позвонить другу откуда угодно.', reply_pose: 'tushuntirish' },
            { label: 'Звонить!', reply: 'Молодец, {ism}! Именно звонить.', reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: 'А знаешь, как твой голос попадает на телефон друга? Давай посмотрим!',
          buttons: [{ label: 'Поехали!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Планшет → телефон',
      text: [
        'Большой экран → карманный экран.',
        'Интернет по Wi-Fi → SIM-карта и вышка: связь везде.',
        'Датчик поворота → + датчик приближения, GPS.',
        'Звуковой сигнал → + вибрация.',
        'Путь звонка: микрофон → антенна → вышка → телефон друга → динамик.',
      ].join('\n'),
      image: img('telefon'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('telefon-keng'),
        prompt: 'Какая деталь позволяет телефону звонить? У планшетов её часто нет.',
        options: ['SIM-карта', 'Кулер', 'Клавиатура'], answer: 0,
        option_images: [img('sim'), null, null],
        explain: 'SIM-карта подключает телефон к сети связи. На ней же записан твой номер.',
        hint: 'Вспомни видео: какая маленькая карточка — «паспорт» телефона?' },
      { type: 'order', prompt: 'Ты позвонил другу и сказал «Привет!». Как до него дойдёт голос? Расставь по порядку',
        items: ['Ты говоришь', 'Микрофон превращает голос в сигнал', 'Антенна отправляет сигнал радиоволной', 'Вышка связи передаёт его на телефон друга', 'Динамик друга воспроизводит голос'],
        item_images: [img('gapirish'), img('mikrofon'), img('antenna'), img('minora'), img('dost-tel')],
        explain: 'Снова та же цепочка: ввод (микрофон) → передача (антенна и вышка) → вывод (динамик). Только теперь между двумя телефонами!',
        hint: 'Ты первый, динамик друга последний. Посередине голос летит по воздуху.' },
      { type: 'match', prompt: 'Соедини деталь телефона с тем, что она делает',
        pairs: [['Датчик приближения', 'Гасит экран у уха'], ['GPS', 'Находит тебя на карте'], ['Сканер отпечатка', 'Открывает телефон только хозяину'], ['Вибромотор', 'Дрожит в беззвучном режиме']],
        pair_images: [[img('yaqinlik'), null], [img('gps'), null], [img('barmoq-izi'), null], [img('vibratsiya'), null]],
        explain: 'Телефон маленький, но внутри много датчиков и деталей. Каждая делает своё дело.',
        hint: 'GPS слушает спутники в небе. Кто поможет, когда нужна карта?' },
      { type: 'sort', prompt: 'Раздели детали телефона: ввод, вывод или оба?',
        groups: ['Ввод', 'Вывод', 'Оба'],
        group_images: [img('kirish'), img('chiqish'), img('ikkalasi')],
        items: ['Микрофон', 'Сканер отпечатка', 'Динамик', 'Вибромотор', 'Сенсорный экран'],
        item_images: [img('mikrofon'), img('barmoq-izi'), img('ichki-karnay'), img('vibratsiya'), img('sensor')],
        item_groups: [0, 0, 1, 1, 2],
        explain: 'Микрофон и сканер отпечатка вводят данные. Динамик и вибрация подают тебе сигнал. А сенсорный экран делает и то и другое.',
        hint: 'Вибрация что-то сообщает тебе или что-то получает от тебя?' },
      { type: 'choice', kind: 'predict', image: img('yaqinlik'),
        prompt: 'Во время разговора ты поднёс телефон к уху, и экран погас. Почему?',
        options: ['Датчик приближения заметил лицо', 'Села батарея', 'Телефон сломался'], answer: 0,
        explain: 'Датчик приближения над экраном замечает лицо и гасит экран. Так щека ничего не нажмёт, а батарея сэкономится.',
        hint: 'Телефон не сломан: убери от уха, и экран снова загорится.' },
      { type: 'choice', kind: 'predict', image: img('tarmoq-yoq-keng'),
        prompt: 'В горах телефон пишет «Нет сети», и позвонить не получается. Почему?',
        options: ['Рядом нет вышки связи, радиоволна не доходит', 'SIM-карта уснула', 'Микрофон замёрз'], answer: 0,
        explain: 'Телефон общается с вышкой радиоволнами. Если вышка далеко или её закрывает гора, сигнал не доходит, и звонка не будет.',
        hint: 'Вспомни путь звонка: куда идёт голос после антенны?' },
    ],
    term_text: 'Молодец, {ism}! Теперь ты знаешь: телефон — компьютер в кармане. Он звонит через SIM-карту и вышку, а датчики чувствуют и ухо, и где ты находишься.',
    term_image: img('telefon'),
  },
};

export async function seed(run, { publish = false } = {}) {
  const ids = await imageIds(run);
  const raw = { ...LESSON.content };
  if (hasVideo()) raw.video = { file: VIDEO, title: LESSON.title, check: true };
  const content = lessonContentSchema.parse(withImages(raw, ids));
  const { rows: [s] } = await run('SELECT id FROM it_sections WHERE id = $1', [SECTION_ID]);
  if (!s) throw new Error('Ruscha bo\'lim topilmadi: avval seed-1-eshik-ru.mjs ni ishga tushiring');
  await run(
    `INSERT INTO it_lessons (id, section_id, position, kind, title, term, tool_id, minutes, xp, content, is_published)
     VALUES ($1, $2, 3, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, term = EXCLUDED.term,
       minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content,
       is_published = it_lessons.is_published OR EXCLUDED.is_published`,
    [LESSON_ID, SECTION_ID, LESSON.title, LESSON.term, LESSON.minutes, LESSON.xp, JSON.stringify(content), publish]
  );
  const position = await placeAfter(run, SECTION_ID, LESSON_ID, [LESSON_3, LESSON_2, LESSON_1]);
  return { video: !!raw.video, exercises: content.exercises.length, position };
}

export async function remove(run) {
  await run('DELETE FROM it_lessons WHERE id = $1', [LESSON_ID]);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const URL_ = process.env.DATABASE_URL;
  if (!URL_) { console.error('DATABASE_URL kerak'); process.exit(1); }
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: URL_ });
  await client.connect();
  try {
    const run = (text, params) => client.query(text, params);
    if (process.argv.includes('--remove')) {
      await remove(run);
      console.log("Ruscha 4-eshik o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`Ruscha 4-eshik yozildi: ${r.position + 1}-o'rin, ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
      console.log(process.argv.includes('--publish') ? 'Mavzu chop etildi.' : "Qoralama: muharrirda ko'rib, chop eting.");
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
