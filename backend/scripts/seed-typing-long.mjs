// Uzun typing matnlari: 10 o'zbekcha + 10 ruscha. Eski qisqa matnlarni nashrdan oladi (o'chirmaydi).
// Foydalanish: DATABASE_URL="..." node scripts/seed-typing-long.mjs
import pg from 'pg';

const URL = process.env.DATABASE_URL;
if (!URL) { console.error('https://www.postgresql.org/docs/current/libpq-ssl.html'); process.exit(1); }

const UZ = [
  "Tabiat bizning eng katta boyligimizdir. Har bir daraxt, har bir daryo va har bir tog' ortida hayot bor. Biz ularni asrasak, kelajak avlodlar ham toza havo nafas oladi, ichimlik suvi bilan ta'minlanadi va go'zal manzaralardan bahra oladi. Shuning uchun har kuni chiqindini saralash, suvni tejash va daraxt ekishni odat qilaylik.",
  "Kitob o'qish insonni boshqa dunyolarga olib boradi. Bir sahifa ortidan ikkinchisini ochganda tarix, sayohat va sirli voqealar bizni o'ziga jalb qiladi. Har kuni yigirma daqiqa kitob o'qigan bola yil oxirida yuzlab yangi so'z o'rganadi, xayoli boyiydi va fikrlash qobiliyati o'sadi. Kitob sizning eng sodiq do'stingiz bo'lsin.",
  "Matematika hayotning hamma joyida uchraydigan fan. Do'konda xarid qilganda, taom tayyorlaganda yoki sayohat rejalashtirganda biz sonlar bilan ishlaymiz. Qo'shish, ayirish, ko'paytirish va bo'lish amallarini puxta o'zlashtirgan odam qaror qabul qilishda ham tez va aniq bo'ladi. Muntazam mashq qilish esa bu qobiliyatni yanada kuchaytiradi.",
  "Sport sog'lom turmushning asosidir. Har kuni kamida o'ttiz daqiqa harakat qilgan odamning yuragi kuchli, mushaklari baquvvat bo'ladi, kayfiyati esa doim yaxshi turadi. Yugurish, suzish, velosiped haydash yoki oddiy yurish, qaysi birini tanlasangiz ham muhimi muntazamlik va sabrdir. Bugun boshlang, ertaga o'zingizni yanada kuchliroq his qilasiz.",
  "Do'stlik eng qimmatli boyliklardan biridir. Haqiqiy do'st qiyin paytda yoningizda turadi, quvonchingizga sherik bo'ladi va xatolaringizni kechirib, sizga yana bir imkoniyat beradi. Do'stlar bilan birga o'ynash, suhbatlashish va birgalikda o'rganish bizni yaxshiroq inson qiladi. Do'stlaringizni qadrlang va ularga doim mehr bilan qarang.",
  "Kompyuter dasturlari buyruqlar ketma-ketligidan iborat. Dasturchi har bir qadamni aniq belgilaydi: qachon ma'lumotni o'qish, qachon hisoblash, qachon natijani ko'rsatish kerakligini tushuntiradi. Kichik dastur yozish bilan boshlab, asta-sekin murakkab loyihalarga o'tish mumkin. Xatoga yo'l qo'yish ham o'rganishning bir qismi, chunki har bir xato bizga yangi tajriba beradi.",
  "Suv hayotning asosi, lekin u cheksiz emas. Dunyoda ichimlik suvi zaxirasi kamayib bormoqda, shu sababli uni tejash har bir insonning burchi hisoblanadi. Tishlaringizni yuvayotganda kranni yopib qo'yish, ortiqcha suvni to'kmaslik, mashinani kamroq yuvish, bu kichik ishlar, lekin ularning yig'indisi katta natija beradi. Suvni asrash bugungi kunning eng dolzarb vazifalaridan biridir.",
  "Quyosh tizimimizdagi sayyoralar Quyosh atrofida aylanadi. Eng yaqin sayyora Merkuriy, eng katta sayyora esa Yupiterdir. Yer esa o'zining suyuq suvi va hayot uchun qulay atmosferasi bilan ajralib turadi. Osmonga qarab yulduzlarni kuzatish, kosmos haqida o'qish va yangi kashfiyotlar bilan tanishish bizni koinotning go'zalligiga yaqinlashtiradi.",
  "Mehnat va sabr har qanday maqsadga erishishning kalitidir. Bir kunda hech kim mohir bo'lib qolmaydi, balki yillar davomida har kuni ozgina mashq qilish natijasida mahorat paydo bo'ladi. Qiyinchiliklardan qo'rqmang, ularni o'sish uchun imkoniyat deb biling. Har bir yiqilish sizga yana bir tajriba beradi, va siz yana turib, oldinga intilasiz.",
  "Oila insonning eng birinchi maktabi va eng ishonchli panohidir. Ota-onaning mehri, buvining ertaklari, akaning maslahati va singlining tabassumi bizni hayotga tayyorlaydi. Oilada birgalikda ovqatlanish, suhbatlashish va bir-birini qo'llab-quvvatlash bolalarda mehr-oqibat va mas'uliyat tuyg'usini uyg'otadi. Oilangizga har kuni biroz vaqt ajrating.",
];

const RU = [
  "Природа — наше самое большое богатство. За каждым деревом, у каждой реки и на каждой горе есть жизнь. Если мы будем беречь её, будущие поколения тоже смогут дышать чистым воздухом, пить чистую воду и любоваться красивыми пейзажами. Поэтому каждый день старайтесь сортировать мусор, экономить воду и сажать деревья.",
  "Чтение книг переносит человека в другие миры. Открывая одну страницу за другой, мы погружаемся в историю, путешествия и загадочные события. Ребёнок, который каждый день читает двадцать минут, за год узнаёт сотни новых слов, обогащает воображение и развивает способность мыслить. Пусть книга станет вашим самым верным другом.",
  "Математика есть во всех сферах нашей жизни. В магазине, на кухне, при планировании поездки мы постоянно работаем с числами. Тот, кто хорошо освоил сложение, вычитание, умножение и деление, принимает решения быстро и точно. Регулярные упражнения помогают укрепить эти навыки и сделать мышление ещё более ясным.",
  "Спорт — основа здорового образа жизни. Человек, который ежедневно занимается хотя бы тридцать минут, имеет крепкое сердце, сильные мышцы и хорошее настроение. Бег, плавание, езда на велосипеде или просто прогулка — выбирайте то, что нравится, главное здесь регулярность и терпение. Начните сегодня, и завтра вы почувствуете себя сильнее.",
  "Дружба — одно из самых ценных сокровищ. Настоящий друг поддерживает вас в трудную минуту, разделяет вашу радость и прощает ошибки, давая шанс всё исправить. Игры, разговоры и совместное обучение с друзьями делают нас лучше. Цените своих друзей и относитесь к ним с добротой и теплом.",
  "Компьютерные программы состоят из последовательности команд. Программист точно указывает, когда нужно прочитать данные, когда выполнить вычисления и когда показать результат. Начав с небольшой программы, можно постепенно переходить к сложным проектам. Ошибки тоже часть обучения, ведь каждая из них даёт новый опыт и помогает понять, как устроен код.",
  "Вода — основа жизни, но её запасы не безграничны. Во многих странах чистой питьевой воды становится меньше, поэтому её экономия — обязанность каждого человека. Закрывать кран во время чистки зубов, не выливать лишнюю воду, мыть машину реже — это небольшие дела, но вместе они дают большой результат. Беречь воду сегодня значит заботиться о завтрашнем дне.",
  "Планеты Солнечной системы вращаются вокруг Солнца. Самая близкая к нему планета — Меркурий, а самая большая — Юпитер. Земля выделяется наличием жидкой воды и атмосферы, пригодной для жизни. Наблюдая за звёздами, читая о космосе и знакомясь с новыми открытиями, мы становимся ближе к величию Вселенной.",
  "Труд и терпение — ключ к достижению любой цели. Никто не становится мастером за один день, мастерство приходит со временем, когда каждый день мы занимаемся понемногу. Не бойтесь трудностей, воспринимайте их как возможность вырасти. Каждое падение даёт новый опыт, и вы снова поднимаетесь и идёте вперёд.",
  "Семья — первая школа человека и самая надёжная опора. Любовь родителей, сказки бабушки, советы старшего брата и улыбка младшей сестры готовят нас к жизни. Совместные ужины, разговоры и взаимная поддержка в семье воспитывают в детях доброту и чувство ответственности. Уделяйте своей семье каждый день немного времени.",
];

const SETS = [
  { prefix: 'Uzun matn UZ #', texts: UZ, lang: 'uz' },
  { prefix: 'Uzun matn RU #', texts: RU, lang: 'ru' },
];

const c = new pg.Client({ connectionString: URL });
await c.connect();
try {
  const { rows: t } = await c.query("SELECT id FROM users WHERE role='teacher' ORDER BY created_at LIMIT 1");
  if (!t[0]) throw new Error("ustoz hisobi topilmadi");
  const author = t[0].id;

  const { rows: ex } = await c.query("SELECT title FROM contents WHERE type='typing_text' AND title LIKE 'Uzun matn%' AND deleted_at IS NULL");
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

  const { rowCount: off } = await c.query(
    "UPDATE contents SET is_published = false WHERE type='typing_text' AND title NOT LIKE 'Uzun matn%' AND is_published = true AND deleted_at IS NULL"
  );
  const { rows: [s] } = await c.query("SELECT count(*)::int AS n FROM contents WHERE type='typing_text' AND is_published AND deleted_at IS NULL");
  console.log(`qo'shildi: ${added}, qisqa matnlar nashrdan olindi: ${off}, nashr etilgan: ${s.n}`);
} finally {
  await c.end();
}
