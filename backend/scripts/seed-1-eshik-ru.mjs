// 1-eshikning ruscha nusxasi «Что такое компьютер?»: alohida ruscha bo'lim (lang='ru') va mavzu.
// Rasmlar o'zbekcha nusxa bilan bir xil (sha256 bo'yicha takrorlanmaydi).
// Video: frontend/public/it/video/1-eshik-ru.mp4 bo'lsa qo'shiladi, bo'lmasa mavzu videosiz yoziladi
// (video tayyor bo'lgach skriptni qayta ishga tushirish kifoya).
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-1-eshik-ru.mjs              -> qoralama
//   node --env-file=.env scripts/seed-1-eshik-ru.mjs --publish    -> bo'lim va mavzuni chop etadi
//   node --env-file=.env scripts/seed-1-eshik-ru.mjs --remove     -> mavzuni o'chiradi
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { IMAGES, putImage, withImages } from './seed-1-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e002';
export const SECTION_ID = '00000000-0000-4000-8000-00000001e102';
const VIDEO = 'it/video/1-eshik-ru.mp4';
const hasVideo = () => existsSync(new URL(`../../frontend/public/${VIDEO}`, import.meta.url));
const img = (name) => `@${name}`;

export const LESSON = {
  title: 'Что такое компьютер?',
  term: 'Ввод → обработка → вывод',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: 'С возвращением, {ism}!',
      lines: [
        { pose: 'salom', text: 'Привет! Я Киби, кибер-мальчик. Как тебя зовут?', ask_name: true, first_only: true,
          buttons: [{ label: 'Дальше', reply: '' }] },
        { pose: 'oylash', text: 'Рад познакомиться, {ism}! Ты решил изучать IT?', ask_name: false, first_only: true,
          buttons: [
            { label: 'Да!', reply: 'Молодец, {ism}! Это очень правильное решение.', reply_pose: 'maqtash' },
            { label: 'Пока не знаю', reply: 'Ничего страшного! Давай попробуем вместе. Уверен, тебе понравится.', reply_pose: 'dalda' },
          ] },
        { pose: 'tushuntirish', text: 'Тогда давай начнём нашу первую тему! Знаешь, что происходит внутри компьютера, когда ты нажимаешь кнопку включения? Давай посмотрим вместе!',
          ask_name: false, first_only: false, buttons: [{ label: 'Поехали!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Цепочка включения',
      text: [
        'Ты нажимаешь кнопку.',
        'Блок питания подаёт ток всем частям.',
        'Процессор просыпается и проверяет детали.',
        'Windows загружается с диска в оперативную память.',
        'На мониторе появляется рабочий стол, компьютер готов.',
      ].join('\n'),
      image: img('sistema-bloki-ochiq'),
    },
    exercises: [
      { type: 'choice', kind: 'general', prompt: 'Что начинает работать первым, когда ты нажимаешь кнопку включения?',
        options: ['Блок питания подаёт ток', 'Загорается монитор', 'Двигается мышь'], answer: 0,
        option_images: [img('quvvat-bloki'), img('monitor'), img('sichqoncha')],
        explain: 'Блок питания подаёт ток всем частям. Без тока ни одна деталь не работает.',
        hint: 'Смогут ли другие части работать без тока?' },
      { type: 'order', prompt: 'Расставь шаги включения компьютера по порядку',
        items: ['Нажимаем кнопку', 'Блок питания подаёт ток', 'Процессор проверяет детали', 'Windows загружается в память', 'На мониторе появляется рабочий стол'],
        item_images: [img('sistema-bloki'), img('quvvat-bloki'), img('ona-plata'), img('operativ-xotira'), img('monitor')],
        explain: 'Сначала приходит ток, потом просыпается процессор, загружается Windows, и в конце экран готов.',
        hint: 'Кто должен проснуться первым? Экран появился в самом конце.' },
      { type: 'match', prompt: 'Соедини каждую внешнюю часть с её работой',
        pairs: [['Монитор', 'Показывает'], ['Клавиатура', 'Печатает буквы'], ['Мышь', 'Управляет указателем'], ['Колонки', 'Издают звук']],
        pair_images: [[img('monitor'), null], [img('klaviatura'), null], [img('sichqoncha'), null], [img('karnaylar'), null]],
        explain: '',
        hint: 'Чем мы видим экран, а чем слышим?' },
      { type: 'sort', prompt: 'Разложи детали на две коробки: внутри системного блока или снаружи',
        groups: ['Внутри', 'Снаружи'],
        group_images: [img('sistema-bloki-ochiq'), img('kompyuter-toliq')],
        items: ['Процессор', 'Оперативная память', 'Жёсткий диск', 'Монитор', 'Клавиатура', 'Мышь'],
        item_images: [img('protsessor'), img('operativ-xotira'), img('qattiq-disk'), img('monitor'), img('klaviatura'), img('sichqoncha')],
        item_groups: [0, 0, 0, 1, 1, 1],
        explain: 'Процессор, оперативная память и жёсткий диск находятся внутри корпуса. А монитор, клавиатура и мышь подключаются снаружи.',
        hint: 'Что ты видел внутри, когда корпус открыли?' },
      { type: 'choice', kind: 'general', prompt: 'Где хранятся твои файлы, даже когда компьютер выключен?',
        options: ['Жёсткий диск', 'Оперативная память', 'Процессор'], answer: 0,
        option_images: [img('qattiq-disk'), img('operativ-xotira'), img('protsessor')],
        explain: 'Жёсткий диск хранит файлы, даже когда компьютер выключен.',
        hint: 'Оперативная память очищается, когда компьютер выключается.' },
      { type: 'choice', kind: 'predict', prompt: 'Ты нажал «A» на клавиатуре. Что будет дальше?',
        options: ['Процессор поймёт это, и на мониторе появится «A»', 'Компьютер выключится', 'Буква уйдёт на диск, а на экране ничего не появится'], answer: 0,
        explain: 'Клавиатура отправляет сигнал (ввод), процессор его понимает (обработка), на мониторе появляется «A» (вывод).',
        hint: 'Ввод → обработка → вывод. Где виден результат?' },
    ],
    term_text: 'Молодец, {ism}! Теперь ты знаешь: когда ты нажимаешь кнопку, блок питания подаёт ток, процессор просыпается и проверяет детали, Windows загружается с диска в память, и на мониторе появляется рабочий стол. Потом ты даёшь команду, процессор её выполняет, а монитор показывает результат. Программисты называют это ввод → обработка → вывод.',
    term_image: img('kompyuter-toliq'),
  },
};

export async function seed(run, { publish = false } = {}) {
  const ids = {};
  for (const name of Object.keys(IMAGES)) ids[name] = await putImage(run, name);
  const raw = { ...LESSON.content };
  if (hasVideo()) raw.video = { file: VIDEO, title: LESSON.title, check: true };
  const content = lessonContentSchema.parse(withImages(raw, ids));

  await run(
    `INSERT INTO it_sections (id, is_global, position, title, method, description, is_published, lang)
     VALUES ($1, true, 1, 'Знакомство с компьютером', 'Последовательность', '', $2, 'ru')
     ON CONFLICT (id) DO UPDATE SET lang = 'ru', is_published = it_sections.is_published OR EXCLUDED.is_published`,
    [SECTION_ID, publish]
  );
  await run(
    `INSERT INTO it_lessons (id, section_id, position, kind, title, term, tool_id, minutes, xp, content, is_published)
     VALUES ($1, $2, 0, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, term = EXCLUDED.term,
       minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content,
       is_published = it_lessons.is_published OR EXCLUDED.is_published`,
    [LESSON_ID, SECTION_ID, LESSON.title, LESSON.term, LESSON.minutes, LESSON.xp, JSON.stringify(content), publish]
  );
  return { video: !!raw.video, exercises: content.exercises.length };
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
      console.log("Ruscha 1-eshik o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`Ruscha 1-eshik yozildi: ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q (keyin qo'shiladi)"}.`);
      console.log(process.argv.includes('--publish') ? "Bo'lim va mavzu chop etildi." : "Qoralama: muharrirda ko'rib, chop eting.");
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
