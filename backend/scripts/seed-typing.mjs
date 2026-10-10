// Mehmon typing uchun matnlar: 20 o'zbekcha + 20 ruscha. Takroriy ishlatsa ham xavfsiz (sarlavha bo'yicha tekshiradi).
// Foydalanish: DATABASE_URL="..." node scripts/seed-typing.mjs
import pg from 'pg';

const URL = process.env.DATABASE_URL;
if (!URL) { console.error('DATABASE_URL kerak'); process.exit(1); }

const UZ = [
  "Bugun ob-havo juda yaxshi va quyosh porlab turibdi.",
  "Kitob o'qish bilan bilimimiz ortadi va fikrimiz kengayadi.",
  "Daraxtlar kislorod chiqarib, havoni toza va sof qiladi.",
  "Har kuni ozgina mashq qilsak, katta natijaga erishamiz.",
  "Do'stlar bilan birga o'ynash ham o'rganish kabi foydali.",
  "Suv hayot manbai, uni tejash har birimizning burchimiz.",
  "Kompyuter dasturlari buyruqlar ketma-ketligi asosida ishlaydi.",
  "Mehnat qilgan odam, mevasini albatta ko'radi va quvonadi.",
  "Yulduzlar kechasi osmonni chiroyli nurlar bilan bezaydi.",
  "Bolalar bog'da o'ynab, yangi do'stlar orttiradilar.",
  "Matematika fikrlashni rivojlantiradi va mantiqni o'stiradi.",
  "Sport bilan shug'ullanish sog'lom tana va baquvvat ruh beradi.",
  "Kitoblar bizga o'tmishni va kelajakni tushunishga yordam beradi.",
  "Ilm olish uchun sabr va qat'iyatli bo'lish kerak bo'ladi.",
  "Oila a'zolari bir-birini hurmat qilib yashasa, uy yanada issiq bo'ladi.",
  "Tog'lar baland va qor bilan qoplangan, ular juda go'zal ko'rinadi.",
  "Dengiz to'lqinlari qirg'oqqa urilib, ajoyib ovoz chiqaradi.",
  "Har bir yangi kun bizga yangi imkoniyatlar va tajriba beradi.",
  "Dasturchilar kichik qadamlar bilan katta loyihalarni yaratadilar.",
  "Tabiatni asrash bizning kelajagimiz uchun eng muhim ishdir.",
];

const RU = [
  "Сегодня на улице тепло, и солнце ярко светит над городом.",
  "Чтение книг расширяет наш кругозор и развивает воображение.",
  "Деревья выделяют кислород и делают воздух чистым и свежим.",
  "Если заниматься понемногу каждый день, мы добьемся больших успехов.",
  "Игра с друзьями так же полезна, как и учеба, ведь мы учимся вместе.",
  "Вода — источник жизни, поэтому беречь её должен каждый из нас.",
  "Компьютерные программы работают по последовательности команд.",
  "Кто трудится, тот непременно увидит плоды своего труда и обрадуется.",
  "Звезды ночью украшают небо красивым светом и манят путешественников.",
  "Дети играют в парке и находят новых друзей, гуляя на свежем воздухе.",
  "Математика развивает мышление и помогает логично решать задачи.",
  "Занятия спортом дают крепкое тело и бодрый, сильный дух.",
  "Книги помогают нам понять прошлое и подготовиться к будущему.",
  "Чтобы многому научиться, нужно быть терпеливым и настойчивым.",
  "Когда члены семьи уважают друг друга, дом становится теплее.",
  "Горы высокие и покрыты снегом, поэтому их вид очень красив.",
  "Морские волны накатывают на берег и создают удивительный шум.",
  "Каждый новый день приносит нам новые возможности и опыт.",
  "Программисты создают большие проекты из маленьких шагов.",
  "Бережное отношение к природе — самое важное дело для нашего будущего.",
];

const SETS = [
  { prefix: 'Typing matni #', texts: UZ, lang: 'uz' },
  { prefix: 'Typing matni (RU) #', texts: RU, lang: 'ru' },
];

const c = new pg.Client({ connectionString: URL });
await c.connect();
try {
  const { rows: t } = await c.query("SELECT id FROM users WHERE role='teacher' ORDER BY created_at LIMIT 1");
  if (!t[0]) throw new Error("ustoz hisobi topilmadi: avval ustoz sifatida ro'yxatdan o'ting");
  const author = t[0].id;

  const { rows: ex } = await c.query("SELECT title FROM contents WHERE type='typing_text' AND title LIKE 'Typing matni%' AND deleted_at IS NULL");
  const have = new Set(ex.map((r) => r.title));

  let added = 0;
  for (const set of SETS) {
    for (let i = 0; i < set.texts.length; i++) {
      const title = `${set.prefix}${i + 1}`;
      if (have.has(title)) continue;
      await c.query(
        "INSERT INTO contents (author_id, type, title, topic, level, data, is_published, language) VALUES ($1, 'typing_text', $2, 'umumiy', $3, $4, true, $5)",
        [author, title, (i % 4) + 1, JSON.stringify({ text: set.texts[i] }), set.lang]
      );
      added++;
    }
  }
  const { rows: [s] } = await c.query("SELECT count(*)::int AS n FROM contents WHERE type='typing_text' AND is_published AND deleted_at IS NULL");
  console.log(`qo'shildi: ${added}, nashr etilgan typing matnlari: ${s.n}`);
} finally {
  await c.end();
}
