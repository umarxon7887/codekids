// 3-eshikning ruscha nusxasi «Планшет: компьютер, которым управляют пальцем»: ruscha bo'lim (1-eshik-ru bilan bir xil, lang='ru'),
// 2-eshikdan keyin (position 2). Rasmlar o'zbekcha nusxa bilan bir xil.
// Video: frontend/public/it/video/3-eshik-ru.mp4 bo'lsa qo'shiladi.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-3-eshik-ru.mjs              -> qoralama
//   node --env-file=.env scripts/seed-3-eshik-ru.mjs --publish    -> chop etadi
//   node --env-file=.env scripts/seed-3-eshik-ru.mjs --remove     -> mavzuni o'chiradi
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { withImages } from './seed-1-eshik.mjs';
import { SECTION_ID } from './seed-1-eshik-ru.mjs';
import { imageIds } from './seed-3-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e006';
const VIDEO = 'it/video/3-eshik-ru.mp4';
const hasVideo = () => existsSync(new URL(`../../frontend/public/${VIDEO}`, import.meta.url));
const img = (name) => `@${name}`;

export const LESSON = {
  title: 'Планшет: компьютер, которым управляют пальцем',
  term: 'Сенсорный экран + жесты + датчик',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: 'С возвращением, {ism}! Ты уже знаешь, что внутри компьютера и ноутбука.',
          buttons: [{ label: 'Дальше', reply: '' }] },
        { pose: 'oylash', text: 'Вот планшет. У него нет ни клавиатуры, ни мыши. Как же им управлять?',
          buttons: [
            { label: 'Не знаю', reply: 'Пальцем! Экран сам и кнопка, и мышь.', reply_pose: 'tushuntirish' },
            { label: 'Пальцем!', reply: 'Молодец, {ism}! Именно пальцем.', reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: 'А знаешь, как экран чувствует твой палец? Давай заглянем внутрь!',
          buttons: [{ label: 'Поехали!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Ноутбук → планшет',
      text: [
        'Клавиатура → клавиатура на экране.',
        'Тачпад → палец по экрану.',
        'Веб-камера → передняя и задняя камера.',
        'Детали под клавиатурой → за экраном.',
        'Поверх экрана есть невидимая сенсорная сетка: она чувствует, где ты коснулся пальцем.',
      ].join('\n'),
      image: img('planshet'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('planshet'),
        prompt: 'Что в планшете заменяет клавиатуру и мышь?',
        options: ['Сенсорный экран: касаешься пальцем', 'Внутри спрятана мышь', 'Планшетом нельзя управлять'], answer: 0,
        explain: 'В планшете экран сам всё чувствует: куда коснёшься, там и нажатие. Для текста клавиатура появляется на экране.',
        hint: 'Когда берёшь планшет в руки, чего ты касаешься?' },
      { type: 'match', prompt: 'Соедини жест с тем, что он делает',
        pairs: [['Одно нажатие', 'Открывает приложение'], ['Свайп', 'Листает страницу'], ['Развести два пальца', 'Увеличивает картинку'], ['Долгое нажатие', 'Открывает доп. меню']],
        pair_images: [[img('bosish'), null], [img('surish'), null], [img('kerish'), null], [img('uzoq-bosish'), null]],
        explain: 'У мыши были клик и колёсико. В планшете всё это делают жесты пальцами.',
        hint: 'Чтобы увеличить картинку, пальцы раздвигают в стороны.' },
      { type: 'sort', prompt: 'Раздели детали планшета: ввод, вывод или оба?',
        groups: ['Ввод', 'Вывод', 'Оба'],
        group_images: [img('kirish'), img('chiqish'), img('ikkalasi')],
        items: ['Микрофон', 'Камера', 'Динамики', 'Наушники', 'Сенсорный экран'],
        item_images: [img('mikrofon'), img('kamera'), img('ichki-karnay'), img('quloqchin'), img('sensor')],
        item_groups: [0, 0, 1, 1, 2],
        explain: 'Микрофон и камера вводят данные, динамики и наушники выводят звук. А сенсорный экран делает и то и другое: показывает картинку и чувствует палец!',
        hint: 'Экран показывает тебе картинку? Чувствует твой палец? А если и то и другое?' },
      { type: 'order', prompt: 'Ты нажал на значок приложения. Что происходит внутри? Расставь по порядку',
        items: ['Палец касается экрана', 'Сенсорная сетка чувствует место касания', 'Процессор понимает, какое это приложение', 'Приложение загружается с диска в оперативную память', 'На экране открывается приложение'],
        item_images: [img('bosish'), img('sensor'), img('protsessor'), img('operativ-xotira'), img('planshet-yotiq')],
        explain: 'Это та же цепочка из 1-й двери: ввод (палец) → обработка (процессор и память) → вывод (экран).',
        hint: 'Ввод → обработка → вывод. Палец первый, результат на экране последний.' },
      { type: 'choice', kind: 'predict', image: img('planshet-yotiq'),
        prompt: 'Ты повернул планшет боком, и видео тоже легло. Кто это заметил?',
        options: ['Датчик поворота внутри', 'Камера тебя увидела', 'Батарея повернулась'], answer: 0,
        explain: 'Внутри планшета есть датчик поворота. Он чувствует, как стоит планшет, и сообщает процессору, а процессор поворачивает экран.',
        hint: 'В планшете есть не только экран, но и датчики, которые чувствуют движение.' },
      { type: 'choice', kind: 'predict', image: img('qolqop'),
        prompt: 'Зимой ты нажал на экран в толстой перчатке, и планшет не почувствовал. Почему?',
        options: ['Экран чувствует крошечный ток пальца, а перчатка его закрыла', 'Планшет засыпает на холоде', 'Перчатка слишком тяжёлая'], answer: 0,
        explain: 'Сенсорная сетка чувствует крошечный ток в пальце. Толстая перчатка его не пропускает. Поэтому бывают специальные «сенсорные» перчатки.',
        hint: 'Вспомни видео: что сенсорная сетка чувствует в твоём пальце?' },
    ],
    term_text: 'Молодец, {ism}! Теперь ты знаешь: планшет — тот же компьютер, только его экран чувствует палец. А датчики внутри чувствуют даже поворот.',
    term_image: img('planshet'),
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
     VALUES ($1, $2, 2, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
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
      console.log("Ruscha 3-eshik o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`Ruscha 3-eshik yozildi: ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
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
