// Typing uchun 20 ta inglizcha uzun matn. Takroriy ishlatsa ham xavfsiz (sarlavha bo'yicha tekshiradi).
// Sarlavha "Uzun matn EN #" bilan boshlanadi: seed-typing-long.mjs qayta ishga tushsa ham bu matnlar nashrdan olinmaydi.
// Matnlarda faqat oddiy ASCII belgilar bor (to'g'ri qo'shtirnoq/tire yo'q): bolalar klaviaturada yoza oladi.
// Foydalanish: DATABASE_URL="..." node scripts/seed-typing-en.mjs
import pg from 'pg';

const URL = process.env.DATABASE_URL;
if (!URL) { console.error('DATABASE_URL kerak'); process.exit(1); }

const EN = [
  "Nature is our greatest treasure. Behind every tree, every river and every mountain there is life. If we protect it, future generations will also breathe clean air, drink fresh water and enjoy beautiful views. So let us make it a habit to sort our trash, save water and plant trees every year.",
  "Reading takes us to other worlds. When we turn one page after another, history, travel and mysterious adventures pull us in. A child who reads for twenty minutes every day learns hundreds of new words in a year, grows a bigger imagination and thinks more clearly. May a good book always be your most loyal friend.",
  "Math is hidden everywhere in our lives. When we shop in a store, cook a meal or plan a trip, we work with numbers all the time. A person who knows how to add, subtract, multiply and divide can make decisions quickly and carefully. Regular practice makes this skill stronger and keeps our mind sharp.",
  "Sport is the base of a healthy life. A person who moves for at least thirty minutes every day has a strong heart, strong muscles and a good mood. Running, swimming, riding a bike or simply walking in the park are all great choices. What matters most is patience and doing it regularly. Start today, and tomorrow you will feel stronger.",
  "Friendship is one of the most valuable treasures. A true friend stands next to you in hard times, shares your happiness and forgives your mistakes. Playing, talking and learning together make us better people. Take care of your friends, listen to them and always treat them with kindness and respect.",
  "Computer programs are made of instructions that follow one another. A programmer plans every step very carefully: when to read information, when to calculate and when to show the answer. You can start with a tiny program and slowly move on to bigger projects. Making a mistake is part of learning, because every bug teaches us something new.",
  "Water is the base of all life, but it is not endless. The supply of clean drinking water on our planet is getting smaller, so saving it is the duty of every person. Turn off the tap while you brush your teeth, never pour water out for no reason and wash the car less often. These are small actions, but together they make a big difference.",
  "The planets in our solar system travel around the Sun. The closest planet is Mercury, and the biggest planet is Jupiter. Earth is special because it has liquid water and air that living things can breathe. Looking at the stars, reading about space and learning about new discoveries bring us closer to the beauty of the universe.",
  "Hard work and patience are the keys to every goal. Nobody becomes a master in one day. Skill grows when we practice a little every day for many years. Do not be afraid of difficulties, because they are chances to grow. Every fall gives you more experience, and you can always stand up again and keep moving forward.",
  "Family is the first school of every person and the safest place in the world. The love of parents, the stories of grandma, the advice of an older brother and the smile of a little sister prepare us for life. Eating dinner together, talking and helping each other teach children kindness and responsibility. Spend a little time with your family every day.",
  "Animals are our neighbors on this planet. Birds build nests high in the trees, bees fly from flower to flower to make sweet honey, and dolphins talk to each other with clicks and whistles. Every creature has an important job in nature. When we take care of animals and their homes, we also take care of ourselves and the world we share.",
  "The ocean covers more than two thirds of our planet. It is full of colorful fish, giant whales and plants that grow under the waves. The ocean also helps to clean the air and keeps the weather steady. Please never throw plastic into rivers or seas, because every bottle can hurt the animals that live there.",
  "Healthy food gives our body the energy it needs. Fresh fruits, vegetables, bread, eggs and milk help children grow tall and stay strong. It is fine to enjoy a sweet treat sometimes, but it should not replace a real meal. Drink plenty of water, wash your hands before eating and try a new healthy dish every week.",
  "Sleep is like a battery charger for our body and brain. While we sleep, our body rests, our muscles grow and our memory sorts everything we learned during the day. Children need about nine or ten hours of sleep every night. Go to bed at the same time, turn off screens early and wake up ready for a great new day.",
  "Kindness costs nothing, but it can change someone's whole day. A warm smile, a polite word or a small act of help can make another person feel happy and safe. When you see someone sad or alone, invite them to play or sit with them. Kind people make the world a brighter and friendlier place for everyone.",
  "Robots are machines that can do tasks by following instructions from people. Some robots build cars in factories, some explore faraway planets and some help doctors in hospitals. Every robot needs a clever program written by a programmer. Maybe one day you will build your own robot that cleans your room or waters your flowers.",
  "Weather changes from day to day. The sun warms the land, clouds bring rain and cold winds can carry snow. Farmers watch the weather to know when to plant seeds, and travelers check it before every trip. Learning to read the sky, the clouds and the temperature teaches us to notice small details in the world around us.",
  "Music is a language that everybody understands. A drum can make us march, a violin can make us feel calm and a happy song can make us dance. Learning to play an instrument trains our ears, our hands and our patience. Practice a little each day, and soon you will be able to play your favorite melody for your family and friends.",
  "Staying safe on the internet is very important. Never share your password, your address or your phone number with strangers. If someone writes something rude or strange to you, do not answer and tell a trusted adult right away. Think before you click on a link or download a file, because not everything online is what it seems.",
  "Recycling gives old things a second life. Paper can become new notebooks, glass bottles can be melted into new jars and plastic can be turned into toys or clothes. Put each kind of trash into the right bin and try to reuse things before you throw them away. A small habit at home can protect forests, rivers and animals for many years.",
];

// Himoya: bu yerda xato bo'lsa bazaga tegmasdan to'xtaymiz
for (const [i, s] of EN.entries()) {
  if (!/^[\x20-\x7E]+$/.test(s)) throw new Error(`#${i + 1}: ASCII bo'lmagan belgi bor`);
  if (s.length < 20 || s.length > 2000) throw new Error(`#${i + 1}: uzunligi 20-2000 oralig'ida emas`);
  if (s !== s.trim() || /\s{2,}/.test(s)) throw new Error(`#${i + 1}: ortiqcha bo'shliq bor`);
}
if (EN.length !== 20 || new Set(EN).size !== 20) throw new Error('20 ta takrorlanmas matn kerak');

const PREFIX = 'Uzun matn EN #';

const c = new pg.Client({ connectionString: URL });
await c.connect();
try {
  const { rows: t } = await c.query("SELECT id FROM users WHERE role='teacher' ORDER BY created_at LIMIT 1");
  if (!t[0]) throw new Error("ustoz hisobi topilmadi");
  const author = t[0].id;

  const { rows: ex } = await c.query("SELECT title FROM contents WHERE type='typing_text' AND title LIKE 'Uzun matn EN%' AND deleted_at IS NULL");
  const have = new Set(ex.map((r) => r.title));

  let added = 0;
  for (let i = 0; i < EN.length; i++) {
    const title = `${PREFIX}${i + 1}`;
    if (have.has(title)) continue;
    await c.query(
      "INSERT INTO contents (author_id, type, title, topic, level, data, is_published, language) VALUES ($1, 'typing_text', $2, 'umumiy', $3, $4, true, 'en')",
      [author, title, (i % 4) + 1, JSON.stringify({ text: EN[i] })]
    );
    added++;
  }
  const { rows: [s] } = await c.query("SELECT count(*)::int AS n FROM contents WHERE type='typing_text' AND is_published AND language='en' AND deleted_at IS NULL");
  console.log(`qo'shildi: ${added}, nashr etilgan inglizcha matnlar: ${s.n}`);
} finally {
  await c.end();
}
