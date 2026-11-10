// 2-eshikning ruscha nusxasi «Ноутбук: компьютер в одной сумке»: ruscha bo'lim (1-eshik-ru bilan bir xil, lang='ru'),
// 1-eshikdan keyin (position 1). Rasmlar o'zbekcha nusxa bilan bir xil.
// Video: frontend/public/it/video/2-eshik-ru.mp4 bo'lsa qo'shiladi.
//
// Foydalanish (backend papkasida):
//   node --env-file=.env scripts/seed-2-eshik-ru.mjs              -> qoralama
//   node --env-file=.env scripts/seed-2-eshik-ru.mjs --publish    -> chop etadi
//   node --env-file=.env scripts/seed-2-eshik-ru.mjs --remove     -> mavzuni o'chiradi
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lessonContentSchema } from '../src/schemas/it.js';
import { withImages } from './seed-1-eshik.mjs';
import { SECTION_ID } from './seed-1-eshik-ru.mjs';
import { imageIds } from './seed-2-eshik.mjs';

export const LESSON_ID = '00000000-0000-4000-8000-00000001e004';
const VIDEO = 'it/video/2-eshik-ru.mp4';
const hasVideo = () => existsSync(new URL(`../../frontend/public/${VIDEO}`, import.meta.url));
const img = (name) => `@${name}`;

export const LESSON = {
  title: 'Ноутбук: компьютер в одной сумке',
  term: 'Экран + тачпад + батарея',
  minutes: 8,
  xp: 20,
  content: {
    dialog: {
      welcome_back: '',
      lines: [
        { pose: 'salom', text: 'С возвращением, {ism}! В 1-й двери ты узнал, как включается компьютер.',
          buttons: [{ label: 'Дальше', reply: '' }] },
        { pose: 'oylash', text: 'А теперь вопрос: сможешь взять этот компьютер в школу? Монитор, системный блок, провода...',
          buttons: [
            { label: 'Нет, тяжело', reply: 'Верно, тяжело! Но люди придумали решение.', reply_pose: 'tushuntirish' },
            { label: 'Есть же ноутбук!', reply: 'Молодец, {ism}! Именно так.', reply_pose: 'maqtash' },
          ] },
        { pose: 'tushuntirish', text: 'А знаешь, где у ноутбука спрятан системный блок? Давай заглянем внутрь!',
          buttons: [{ label: 'Поехали!', reply: '' }] },
      ],
    },
    story: '',
    helper: {
      title: 'Компьютер → ноутбук',
      text: [
        'Монитор → экран в крышке.',
        'Мышь → тачпад.',
        'Колонки → встроенные динамики.',
        'Системный блок → под клавиатурой.',
        'Ток из розетки → батарея.',
      ].join('\n'),
      image: img('noutbuk'),
    },
    exercises: [
      { type: 'choice', kind: 'general', image: img('noutbuk'),
        prompt: 'Где в ноутбуке экран, клавиатура и системный блок?',
        options: ['Всё в одном корпусе с крышкой', 'Отдельно, соединены проводами', 'В ноутбуке их нет'], answer: 0,
        explain: 'В ноутбуке экран в крышке, клавиатура внизу, а системный блок под клавиатурой. Всё в одном корпусе.',
        hint: 'Ноутбук можно поднять одной рукой. Нужны ли провода?' },
      { type: 'match', prompt: 'Соедини деталь компьютера с её заменой в ноутбуке',
        pairs: [['Монитор', 'Экран в крышке'], ['Мышь', 'Тачпад'], ['Колонки', 'Встроенные динамики'], ['Ток из розетки', 'Батарея']],
        pair_images: [[img('monitor'), null], [img('sichqoncha'), null], [img('karnaylar'), null], [img('quvvat-bloki'), null]],
        explain: 'У каждой детали в ноутбуке есть маленький «двойник»: экран, тачпад, динамики и батарея.',
        hint: 'Чем двигать курсор на ноутбуке без мыши?' },
      { type: 'sort', prompt: 'Раздели детали ноутбука: ввод или вывод?',
        groups: ['Ввод', 'Вывод'],
        items: ['Клавиатура', 'Тачпад', 'Веб-камера', 'Микрофон', 'Экран', 'Встроенные динамики'],
        item_images: [img('klaviatura'), img('touchpad'), img('vebkamera'), img('mikrofon'), img('ekran'), img('ichki-karnay')],
        item_groups: [0, 0, 0, 0, 1, 1],
        explain: 'Клавиатура, тачпад, камера и микрофон вводят данные. Экран и динамики выводят результат. Как в 1-й двери: ввод → обработка → вывод!',
        hint: 'Камера тебя «видит» (ввод), а экран тебе «показывает» (вывод).' },
      { type: 'order', prompt: 'Как заряжается ноутбук? Расставь по порядку',
        items: ['Включаешь зарядку в розетку', 'Зарядка передаёт ток ноутбуку', 'Батарея заряжается', 'Отключаешь провод', 'Ноутбук работает от батареи'],
        item_images: [img('rozetka'), img('zaryadlovchi'), img('batareya'), img('noutbuk-yopiq'), img('noutbuk')],
        explain: 'Ток идёт из розетки через зарядку в батарею. Когда она заряжена, ноутбук работает и без провода.',
        hint: 'Откуда начинается ток? Когда можно отключить провод?' },
      { type: 'choice', kind: 'predict', image: img('batareya-bosh'),
        prompt: 'Зарядка не подключена, батарея на 0%. Что будет?',
        options: ['Ноутбук выключится, несохранённая работа может пропасть', 'Ноутбук возьмёт энергию с диска', 'Ничего не случится'], answer: 0,
        explain: 'Батарея — это «блок питания» ноутбука. Нет тока — все детали останавливаются. Поэтому сохраняй работу заранее.',
        hint: 'Вспомни 1-ю дверь: могут ли детали работать без тока?' },
      { type: 'choice', kind: 'predict', image: img('korpa'),
        prompt: 'Ты положил ноутбук на мягкое одеяло, и он перегрелся. Почему?',
        options: ['Одеяло закрыло вентиляцию, кулер не смог выгнать тепло', 'Одеяло дало ноутбуку ток', 'Экран был слишком ярким'], answer: 0,
        explain: 'В ноутбуке тоже есть кулер, он выгоняет тепло через отверстия. Ставь ноутбук на твёрдую ровную поверхность, например на стол.',
        hint: 'Вспомни пыльный кулер из 1-й двери. Откуда выходит горячий воздух?' },
    ],
    term_text: 'Молодец, {ism}! Теперь ты знаешь: ноутбук — это тот же компьютер, только в одном корпусе. Экран в крышке, системный блок под клавиатурой, а питание даёт батарея.',
    term_image: img('noutbuk'),
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
     VALUES ($1, $2, 1, 'lesson', $3, $4, NULL, $5, $6, $7::jsonb, $8)
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
      console.log("Ruscha 2-eshik o'chirildi.");
    } else {
      await client.query('BEGIN');
      const r = await seed(run, { publish: process.argv.includes('--publish') });
      await client.query('COMMIT');
      console.log(`Ruscha 2-eshik yozildi: ${r.exercises} ta savol, video: ${r.video ? 'bor' : "yo'q"}.`);
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
