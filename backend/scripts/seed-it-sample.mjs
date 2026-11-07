// IT darslari uchun NAMUNA kontent: faqat sinov uchun (admin o'z darslarini yozgach o'chiriladi).
// Takroriy ishlatsa ham xavfsiz: qatorlar doimiy ID bilan yoziladi va yangilanadi.
// Foydalanish:
//   DATABASE_URL="..." node scripts/seed-it-sample.mjs           -> namunani qo'shadi / yangilaydi
//   DATABASE_URL="..." node scripts/seed-it-sample.mjs --remove  -> namunani butunlay o'chiradi
import { pathToFileURL } from 'node:url';

const ID = (n) => `00000000-0000-4000-8000-0000000e${String(n).padStart(4, '0')}`;

export const TOOLS = [
  { id: ID(1), name: "O'xshatish", short: 'Yangi narsani tanish narsaga solishtir',
    body: "Tushunish qiyin bo'lsa, o'zingdan so'ra: «Bu nimaga o'xshaydi?» Oshpaz, pochtachi, zavod kabi tanish narsalar yangi narsani tushunishga yordam beradi." },
  { id: ID(2), name: 'Sabab → oqibat', short: "Har bir harakatning natijasi bor",
    body: "Biror narsa bo'lsa, o'zingdan so'ra: «Bunga nima sabab bo'ldi?» va «Endi nima bo'ladi?» Tugmani bosish sabab, ekranda harf chiqishi oqibat." },
  { id: ID(3), name: 'Taxmin qil → tekshir', short: 'Avval taxmin qil, keyin sinab ko\'r',
    body: "Javobni bilmasang, avval taxmin qil. Keyin tekshirib ko'r: to'g'ri chiqdimi? Xato bo'lsa ham foydali, chunki endi ko'proq bilasan." },
];

export const SECTIONS = [
  { id: ID(101), position: 1, title: 'Kompyuter bilan tanishuv', method: 'Ketma-ketlik',
    description: "NAMUNA: sinov uchun. Admin o'z darslarini yozgach o'chiriladi." },
  { id: ID(102), position: 2, title: 'Algoritmlar', method: 'Shart',
    description: "NAMUNA: sinov uchun." },
];

const ch = (kind, prompt, options, answer, explain) => ({ type: 'choice', kind, prompt, options, answer, ...(explain ? { explain } : {}) });

export const LESSONS = [
  {
    id: ID(201), section_id: ID(101), position: 1, kind: 'lesson', title: 'Kompyuter qanday ishlaydi',
    term: 'Kirish → Ishlov → Chiqish', tool_id: ID(1), minutes: 5, xp: 10,
    content: {
      story: "Oshxonada oshpaz bor. Unga guruch, sabzi va go'sht olib kelishdi. Oshpaz ularni yuvdi, to'g'radi va qozonda pishirdi. Oxirida dasturxonga issiq osh tortildi. Kompyuter ham xuddi shu oshpazga o'xshab ishlaydi!",
      helper: { title: 'Uch qadam', text: "Avval nimadir beriladi. Keyin u bilan ish qilinadi. Oxirida natija chiqadi. Oshpazda: mahsulotlar → pishirish → osh." },
      exercises: [
        { type: 'order', prompt: "Oshpaz ishini to'g'ri tartibga qo'y", items: ['Mahsulot olib kelinadi', 'Oshpaz pishiradi', 'Osh dasturxonga tortiladi'] },
        ch('predict', "Kompyuterda «A» tugmasini bossang, nima bo'ladi?", ['Ekranda A harfi chiqadi', "Kompyuter o'chadi", "Hech narsa bo'lmaydi"], 0,
          'Tugma bosildi (berildi) → kompyuter tushundi (ish qildi) → ekranda harf chiqdi (natija).'),
        { type: 'match', prompt: 'Oshpaz va kompyuterni moslashtir', pairs: [['Mahsulotlar', 'Bosilgan tugma'], ['Pishirish', "Kompyuterning o'ylashi"], ['Tayyor osh', 'Ekrandagi harf']] },
        ch('odd', 'Qaysi biri ortiqcha? Qolganlari natijani ko\'rsatadi.', ['Ekran', 'Karnay', 'Printer', 'Sichqoncha'], 3,
          "Sichqoncha kompyuterga ma'lumot beradi. Ekran, karnay va printer esa natijani ko'rsatadi."),
        ch('error', "Ali aytdi: «Avval ekranda harf chiqadi, keyin men tugmani bosaman». Xato qayerda?",
          ["Tartib noto'g'ri: avval tugma bosiladi, keyin harf chiqadi", "Hammasi to'g'ri", 'Ekran kerak emas'], 0),
        ch('analogy', "Qaysi biri ham «berildi → ish qilindi → natija» kabi ishlaydi?",
          ['Choynakka suv quyib, qaynatib, choy damlash', 'Uxlash', 'Rasmga qarab turish'], 0),
      ],
      term_text: "Kompyuter har doim shu uch qadamda ishlaydi: ma'lumot kiradi, kompyuter uni qayta ishlaydi, natija chiqadi. Dasturchilar buni «kirish – ishlov – chiqish» deb atashadi.",
    },
  },
  {
    id: ID(202), section_id: ID(101), position: 2, kind: 'lesson', title: 'Klaviatura va sichqoncha',
    term: 'Kiritish qurilmalari', tool_id: ID(2), minutes: 4, xp: 10,
    content: {
      story: "Madina rasm chizmoqchi. U sichqonchani yurgizdi, ekrandagi strelka ham yurdi. Keyin klaviaturada ismini yozdi.",
      helper: { title: 'Kompyuterga gapirish', text: "Klaviatura va sichqoncha orqali biz kompyuterga nima qilish kerakligini aytamiz." },
      exercises: [
        ch('predict', "Sichqonchani o'ngga yurgizsang, ekrandagi strelka qayerga boradi?", ["O'ngga", 'Chapga', "Joyida qoladi"], 0),
        { type: 'match', prompt: 'Harakat va natijani moslashtir', pairs: [['Tugmani bosish', 'Harf chiqadi'], ['Sichqonchani yurgizish', 'Strelka yuradi'], ["Sichqonchani bosish", 'Narsa tanlanadi']] },
        ch('odd', 'Qaysi biri kompyuterga buyruq bermaydi?', ['Klaviatura', 'Sichqoncha', 'Monitor'], 2),
      ],
      term_text: "Kompyuterga ma'lumot beradigan qurilmalar kiritish qurilmalari deyiladi: klaviatura, sichqoncha, mikrofon.",
    },
  },
  {
    id: ID(203), section_id: ID(101), position: 3, kind: 'lesson', title: 'Fayl va papka',
    term: 'Fayl va papka', tool_id: ID(1), minutes: 5, xp: 10,
    content: {
      story: "Jasurning xonasida kitoblar sochilib yotibdi. Onasi ularni javonga, har birini o'z bo'limiga qo'yishni so'radi.",
      helper: { title: 'Tartib', text: "Narsalar guruhlarga ajratilsa, kerakli narsani tez topamiz." },
      exercises: [
        ch('analogy', "Kompyuterdagi papka nimaga o'xshaydi?", ['Kitob javonidagi bo\'limga', 'Qalamga', 'Derazaga'], 0),
        { type: 'order', prompt: "Rasmni saqlash qadamlarini tartibla", items: ['Rasm chiziladi', '«Saqlash» bosiladi', 'Papka tanlanadi', 'Fayl papkada paydo bo\'ladi'] },
        ch('error', "Ali barcha fayllarini bitta joyga tashladi va endi hech narsani topa olmayapti. Nima qilish kerak edi?", ['Fayllarni papkalarga ajratish', "Kompyuterni o'chirish", "Fayllarni o'chirib yuborish"], 0),
      ],
      term_text: "Fayl — bitta ish (rasm, matn, o'yin). Papka — fayllar saqlanadigan quti.",
    },
  },
  {
    id: ID(204), section_id: ID(101), position: 4, kind: 'lesson', title: 'Internet nima?',
    term: 'Internet', tool_id: ID(3), minutes: 4, xp: 10,
    content: {
      story: "Buvijon Samarqanddan nevarasiga xat yubordi. Pochtachi xatni olib, Toshkentga yetkazdi.",
      helper: { title: 'Xabar yo\'li', text: "Xabar bir joydan chiqadi, yo'l bo'ylab boradi va boshqa joyga yetadi." },
      exercises: [
        { type: 'order', prompt: "Xat yo'lini tartibla", items: ['Buvijon xat yozadi', 'Pochtachi xatni oladi', 'Xat Toshkentga boradi', 'Nevara xatni o\'qiydi'] },
        ch('predict', "Internet uzilsa, do'stingga yuborgan xabaring nima bo'ladi?", ['Yetib bormaydi', 'Ikki marta boradi', "Rasmga aylanadi"], 0),
        ch('analogy', "Internet nimaga o'xshaydi?", ['Kompyuterlar orasidagi pochtaga', 'Muzlatkichga', 'Soatga'], 0),
      ],
      term_text: "Internet — dunyodagi kompyuterlarni bir-biriga bog'laydigan katta tarmoq. Xabarlar unda xuddi pochta kabi yuradi.",
    },
  },
  {
    id: ID(205), section_id: ID(101), position: 5, kind: 'test', title: "Bo'lim testi",
    term: null, tool_id: null, minutes: 5, xp: 20,
    content: {
      story: "Bo'limda o'rganganlaringni tekshirib ko'ramiz!",
      exercises: [
        ch('general', "Kompyuter qanday tartibda ishlaydi?", ['Kirish → ishlov → chiqish', 'Chiqish → kirish → ishlov', 'Faqat chiqish'], 0),
        ch('odd', 'Qaysi biri kiritish qurilmasi emas?', ['Klaviatura', 'Sichqoncha', 'Printer'], 2),
        { type: 'match', prompt: 'Moslashtir', pairs: [['Fayl', 'Bitta rasm'], ['Papka', 'Fayllar qutisi'], ['Internet', 'Kompyuterlar tarmog\'i']] },
        { type: 'order', prompt: "Xabar yuborishni tartibla", items: ['Xabar yoziladi', '«Yuborish» bosiladi', 'Xabar internet orqali boradi', "Do'st xabarni o'qiydi"] },
      ],
    },
  },
  {
    id: ID(206), section_id: ID(102), position: 1, kind: 'lesson', title: 'Ketma-ketlik',
    term: 'Algoritm', tool_id: ID(2), minutes: 4, xp: 10,
    content: {
      story: "Ertalab maktabga tayyorlanish ham bir nechta qadamdan iborat.",
      exercises: [
        { type: 'order', prompt: 'Ertalabki ishlarni tartibla', items: ['Uyg\'onish', 'Yuvinish', 'Nonushta qilish', 'Maktabga borish'] },
        ch('predict', "Tishni yuvishdan oldin tish pastani ochmasang nima bo'ladi?", ['Pasta chiqmaydi', 'Tish oqaradi', "Hech narsa o'zgarmaydi"], 0),
      ],
      term_text: "Aniq tartibda bajariladigan qadamlar ketma-ketligi algoritm deyiladi.",
    },
  },
];

/** @param {(text:string, params?:any[])=>Promise<any>} run */
export async function seed(run) {
  for (const t of TOOLS) {
    await run(
      `INSERT INTO it_tools (id, name, short, body) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, body = EXCLUDED.body`,
      [t.id, t.name, t.short, t.body]
    );
  }
  for (const s of SECTIONS) {
    await run(
      `INSERT INTO it_sections (id, is_global, position, title, method, description, is_published)
       VALUES ($1, true, $2, $3, $4, $5, true)
       ON CONFLICT (id) DO UPDATE SET position = EXCLUDED.position, title = EXCLUDED.title,
         method = EXCLUDED.method, description = EXCLUDED.description, is_published = true`,
      [s.id, s.position, s.title, s.method, s.description]
    );
  }
  for (const l of LESSONS) {
    await run(
      `INSERT INTO it_lessons (id, section_id, position, kind, title, term, tool_id, minutes, xp, content, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, true)
       ON CONFLICT (id) DO UPDATE SET section_id = EXCLUDED.section_id, position = EXCLUDED.position,
         kind = EXCLUDED.kind, title = EXCLUDED.title, term = EXCLUDED.term, tool_id = EXCLUDED.tool_id,
         minutes = EXCLUDED.minutes, xp = EXCLUDED.xp, content = EXCLUDED.content, is_published = true`,
      [l.id, l.section_id, l.position, l.kind, l.title, l.term, l.tool_id, l.minutes, l.xp, JSON.stringify(l.content)]
    );
  }
}

/** Namunani butunlay o'chiradi (bo'limlar bilan birga qasrlar va ularning progressi ham o'chadi). */
export async function remove(run) {
  await run('DELETE FROM it_sections WHERE id = ANY($1::uuid[])', [SECTIONS.map((s) => s.id)]);
  await run('DELETE FROM it_tools WHERE id = ANY($1::uuid[])', [TOOLS.map((t) => t.id)]);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const URL = process.env.DATABASE_URL;
  if (!URL) { console.error('DATABASE_URL kerak'); process.exit(1); }
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: URL });
  await client.connect();
  try {
    const run = (text, params) => client.query(text, params);
    if (process.argv.includes('--remove')) {
      await remove(run);
      console.log("IT darslari namunasi o'chirildi.");
    } else {
      await seed(run);
      console.log(`IT darslari namunasi yozildi: ${SECTIONS.length} bo'lim, ${LESSONS.length} mavzu, ${TOOLS.length} fikrlash quroli.`);
    }
  } finally {
    await client.end();
  }
}
