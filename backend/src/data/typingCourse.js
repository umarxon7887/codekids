import { LEVELS_RU } from './typingCourseRu.js';

/**
 * Typing darslari kursi (o'zbek, lotin; ruscha kurs typingCourseRu.js da). Kontent kodda turadi: o'zgartirish uchun shu faylni tahrirlang.
 * Har daraja: 4 ta dars + 1 ta imtihon. Har dars 3 ta mashqdan (step) iborat.
 * Dars id'lari ("1-1", "1-x") bazada progress kaliti sifatida saqlanadi: mavjud id'larni o'zgartirmang.
 * Har bir mashq matnida faqat shu darajagacha o'rganilgan tugmalar ishlatiladi.
 */

/** Daraja tezlik maqsadi (WPM): imtihondan o'tish va darsda 3 yulduz uchun. */
const LEVELS_UZ = [
  {
    n: 1,
    title: 'Asosiy qator',
    desc: "Barmoqlar uyi: a s d f g h j k l",
    wpm: 10,
    lessons: [
      {
        id: '1-1', title: 'F J D K', keys: ['f', 'j', 'd', 'k'],
        steps: [
          { kind: 'keys', text: 'ff jj ff jj fj jf fj jf dd kk dd kk dk kd dk kd' },
          { kind: 'keys', text: 'fd jk df kj fdj jkd dfk kjd fjdk kdjf djkf fkdj' },
          { kind: 'keys', text: 'fff jjj ddd kkk fjd kdj jfk dkf fdk jdk kfj dfj' },
        ],
      },
      {
        id: '1-2', title: 'A S L', keys: ['a', 's', 'l'],
        steps: [
          { kind: 'keys', text: 'aa ss ll as sa la al sal las als sla asl lsa' },
          { kind: 'words', text: 'aks sal lak kal dala salla kassa falak jadal' },
          { kind: 'words', text: 'sadaf kasal fasl alla kalla dala salla jadal aks' },
        ],
      },
      {
        id: '1-3', title: 'G H', keys: ['g', 'h'],
        steps: [
          { kind: 'keys', text: 'gg hh gh hg gah hag gal hal gash hash gag hah' },
          { kind: 'words', text: 'hal had ahd jahl gala galla hasad shah hakka' },
          { kind: 'words', text: 'galla dala jahl hasad gala ahd had hal shahd' },
        ],
      },
      {
        id: '1-4', title: "Asosiy qator so'zlari", keys: [],
        steps: [
          { kind: 'words', text: 'dala falak salla kassa jadal sadaf hasad galla' },
          { kind: 'words', text: 'aks jahl gala kasal fasl ahd lak sal kal had' },
          { kind: 'words', text: 'shahd salla dala galla falak kassa jadal kasal sadaf' },
        ],
      },
    ],
    exam: { id: '1-x', text: 'dala falak salla kassa jadal sadaf hasad galla aks jahl gala kasal fasl ahd lak sal kal had' },
  },
  {
    n: 2,
    title: 'Yuqori qator',
    desc: 'q w e r t y u i o p',
    wpm: 15,
    lessons: [
      {
        id: '2-1', title: 'E I R U', keys: ['e', 'i', 'r', 'u'],
        steps: [
          { kind: 'keys', text: 'ee ii rr uu er re ir ri ur ru ei ie ue iu' },
          { kind: 'words', text: 'ish ilk kir uka gul dars eski ilik sir dil ruh' },
          { kind: 'words', text: 'erkak sel uka gul ish dars eski kir ilik sur dil' },
        ],
      },
      {
        id: '2-2', title: 'T O W', keys: ['t', 'o', 'w'],
        steps: [
          { kind: 'keys', text: 'tt oo ww to ot tw wo tot oto wow tow two' },
          { kind: 'words', text: 'ot ota tosh tor olti tola sotdi tilla torta' },
          { kind: 'words', text: 'toshlar tortadi otalar sotdi olti tilla tosh ota' },
        ],
      },
      {
        id: '2-3', title: 'Q Y P', keys: ['q', 'y', 'p'],
        steps: [
          { kind: 'keys', text: 'qq yy pp qy yq qp pq yp py qyp pyq yqp' },
          { kind: 'words', text: 'qor qosh qish yer yil yoq pul papka tepa yosh' },
          { kind: 'words', text: 'piyola qayiq qopqoq uyqu qirq pishiq shapka qiyshiq' },
        ],
      },
      {
        id: '2-4', title: "Ikki qator so'zlari", keys: [],
        steps: [
          { kind: 'words', text: 'qish keldi ota uyda uka dars qildi yer issiq' },
          { kind: 'words', text: 'opa piyola oldi sport foydali yoshlar sport qildi' },
          { kind: 'words', text: 'tushlik qildik toshlar katta qor ketdi uyda issiq' },
        ],
      },
    ],
    exam: { id: '2-x', text: 'qish keldi ota uyda opa piyola oldi yoshlar sport qildi uka dars qildi tushlik foydali yer issiq qor ketdi' },
  },
  {
    n: 3,
    title: 'Pastki qator',
    desc: 'z x c v b n m , .',
    wpm: 18,
    lessons: [
      {
        id: '3-1', title: 'N M', keys: ['n', 'm'],
        steps: [
          { kind: 'keys', text: 'nn mm nm mn nam man min nim mon non mun nun' },
          { kind: 'words', text: 'non men sen ona mana nima kun tun olma nomi' },
          { kind: 'words', text: 'mening dunyo inson ilm sinf mamnun kompyuter' },
        ],
      },
      {
        id: '3-2', title: 'B V', keys: ['b', 'v'],
        steps: [
          { kind: 'keys', text: 'bb vv bv vb bob vov bab vav bib viv bub vuv' },
          { kind: 'words', text: 'bola bir va vaqt suv bobo kitob ovoz baliq' },
          { kind: 'words', text: 'bayram bilim bulut barvaqt kitobni bolalar vatan' },
        ],
      },
      {
        id: '3-3', title: 'C X Z , .', keys: ['c', 'x', 'z', ',', '.'],
        steps: [
          { kind: 'keys', text: 'cc xx zz ch xa za, ich, uch. xo zo, cho. zx xz' },
          { kind: 'words', text: 'chiroq uchun qachon xona xat xalq zamon tez yoz kuz' },
          { kind: 'words', text: 'biz, siz, xabar. chaqmoq, ixcham. kuz, yoz, qish.' },
        ],
      },
      {
        id: '3-4', title: 'Birinchi gaplar', keys: [],
        steps: [
          { kind: 'text', text: 'bugun havo issiq. biz kompyuter xonasida ishladik.' },
          { kind: 'text', text: 'bola tez yozishni mashq qildi. ustoz uni maqtadi.' },
          { kind: 'text', text: 'har kuni mashq qilsak, natija albatta yaxshi chiqadi.' },
        ],
      },
    ],
    exam: { id: '3-x', text: 'bugun biz kompyuter xonasida ishladik. har kuni mashq qilsak, tez va aniq yozamiz. kitob bilim beradi, sport esa kuch beradi.' },
  },
  {
    n: 4,
    title: 'Bosh harf va belgilar',
    desc: "Shift, o' g', ? !",
    wpm: 20,
    lessons: [
      {
        id: '4-1', title: 'Bosh harflar', keys: ['shift'],
        steps: [
          { kind: 'words', text: 'Ali Vali Salim Laylo Nodir Malika Jasur Zarina' },
          { kind: 'words', text: 'Toshkent Samarqand Buxoro Xiva Nukus Andijon Termiz' },
          { kind: 'text', text: 'Bugun Ali va Laylo Samarqandga bordi. Ular Registonga kirdi.' },
        ],
      },
      {
        id: '4-2', title: "O' va G'", keys: ["'"],
        steps: [
          { kind: 'words', text: "o'n o'yin o'qish so'z qo'l to'p bo'ldi ko'p" },
          { kind: 'words', text: "g'isht g'alaba tog' bog' sog'lom yog'och to'g'ri" },
          { kind: 'text', text: "O'g'il bola bog'da to'p o'ynadi. Qo'shnisi g'olib bo'ldi." },
        ],
      },
      {
        id: '4-3', title: 'Savol va undov', keys: ['?', '!'],
        steps: [
          { kind: 'text', text: 'Sen qayerdasan? Men uydaman! Ismingiz nima? Rahmat!' },
          { kind: 'text', text: "Bugun nima o'qiymiz? Zo'r, ketdik! Bu kimning kitobi?" },
          { kind: 'text', text: "Qachon kelasan? Ertaga keling! Qanday chiroyli kun!" },
        ],
      },
      {
        id: '4-4', title: 'Hammasi birga', keys: [],
        steps: [
          { kind: 'text', text: "O'zbekiston go'zal yurt. Tog'lari baland, bog'lari ko'p." },
          { kind: 'text', text: "Siz qaysi shaharda yashaysiz? Men Toshkentda yashayman." },
          { kind: 'text', text: "Dasturchi bo'lish uchun nima kerak? Sabr va ko'p mashq!" },
        ],
      },
    ],
    exam: { id: '4-x', text: "O'zbekiston go'zal yurt. Tog'lari baland, bog'lari ko'p. Siz qaysi shaharda yashaysiz? Men Samarqandda yashayman! Dasturchi bo'lish uchun sabr va ko'p mashq kerak." },
  },
  {
    n: 5,
    title: 'Raqamlar',
    desc: '1 2 3 4 5 6 7 8 9 0',
    wpm: 22,
    lessons: [
      {
        id: '5-1', title: '1 2 3 4 5', keys: ['1', '2', '3', '4', '5'],
        steps: [
          { kind: 'keys', text: '11 22 33 44 55 12 21 34 43 45 54 13 31 25 52' },
          { kind: 'keys', text: '123 234 345 451 512 135 241 352 413 524' },
          { kind: 'text', text: '5 ta olma, 3 ta nok, 12 ta kitob, 24 ta bola, 45 daqiqa.' },
        ],
      },
      {
        id: '5-2', title: '6 7 8 9 0', keys: ['6', '7', '8', '9', '0'],
        steps: [
          { kind: 'keys', text: '66 77 88 99 00 67 76 89 98 90 09 68 86 70 07' },
          { kind: 'keys', text: '678 789 890 906 067 1098 2076 3089 4567 5890' },
          { kind: 'text', text: 'Sinfda 30 ta parta bor. Maktabda 860 ta o\'quvchi o\'qiydi.' },
        ],
      },
      {
        id: '5-3', title: 'Sana va narx', keys: ['-'],
        steps: [
          { kind: 'text', text: "1-sentabr, 21-mart, 9-may, 31-dekabr, 2026-yil." },
          { kind: 'text', text: "Non 4000 so'm, olma 12000 so'm, daftar 3500 so'm." },
          { kind: 'text', text: "Men 2015-yilda tug'ilganman. Bugun 7-noyabr." },
        ],
      },
      {
        id: '5-4', title: 'Misollar', keys: ['+', '='],
        steps: [
          { kind: 'text', text: '2 + 3 = 5, 7 + 8 = 15, 12 + 9 = 21, 40 + 60 = 100' },
          { kind: 'text', text: '9 - 4 = 5, 45 - 15 = 30, 100 - 1 = 99, 70 - 25 = 45' },
          { kind: 'text', text: "Alida 15 ta qalam bor edi. U 6 tasini berdi. 15 - 6 = 9." },
        ],
      },
    ],
    exam: { id: '5-x', text: "1-sentabrda maktabga 120 ta yangi o'quvchi keldi. Har bir sinfda 30 tadan bola bor. 120 - 30 = 90. Daftar 3500 so'm, kitob 25000 so'm turadi." },
  },
  {
    n: 6,
    title: 'Haqiqiy matnlar',
    desc: 'Uzun matnlar, tezlik va chidamlilik',
    wpm: 25,
    lessons: [
      {
        id: '6-1', title: 'Kompyuter', keys: [],
        steps: [
          { kind: 'text', text: "Kompyuter buyruqlarni juda tez bajaradi. Lekin u o'zi o'ylamaydi: hamma ishni dastur aytadi." },
          { kind: 'text', text: "Klaviatura orqali biz kompyuterga harf va raqamlarni yuboramiz. Sichqoncha bilan esa ekrandagi narsani tanlaymiz." },
          { kind: 'text', text: "Tez yozishni bilgan odam vaqtini tejaydi. Barmoqlar o'z joyida tursa, ko'zlar ekranda qoladi." },
        ],
      },
      {
        id: '6-2', title: 'Tabiat', keys: [],
        steps: [
          { kind: 'text', text: "Bahorda daraxtlar gullaydi, qushlar uzoq yurtlardan qaytib keladi. Dalalar yashil rangga kiradi." },
          { kind: 'text', text: "Suv hayot manbai. Uni tejash har birimizning burchimiz. Jo'mrakni ochiq qoldirmang!" },
          { kind: 'text', text: "Tog'lar baland va qor bilan qoplangan. Yozda ham ularning cho'qqisida oppoq qor turadi." },
        ],
      },
      {
        id: '6-3', title: 'Maktab', keys: [],
        steps: [
          { kind: 'text', text: "Har kuni ertalab soat 8:00 da darslar boshlanadi. Biz birinchi bo'lib matematika o'qiymiz." },
          { kind: 'text', text: "Kutubxonada 5000 dan ortiq kitob bor. U yerda jim o'tirib, yangi narsalarni bilib olamiz." },
          { kind: 'text', text: "Ustozimiz aytdi: \"Xato qilishdan qo'rqmang, xatodan o'rganing!\" Bu gap esimda qoldi." },
        ],
      },
      {
        id: '6-4', title: 'Dasturchi', keys: [],
        steps: [
          { kind: 'text', text: "Dasturchilar katta loyihani kichik qadamlarga bo'lib chiqadi. Har bir qadamni alohida tekshiradi." },
          { kind: 'text', text: "Birinchi dastur ko'pincha ekranga \"Salom, dunyo!\" yozadi. Keyin esa o'yinlar va saytlar yaratiladi." },
          { kind: 'text', text: "Kim har kuni 15 daqiqa mashq qilsa, bir oydan keyin ikki baravar tez yozadi. Sinab ko'ring!" },
        ],
      },
    ],
    exam: { id: '6-x', text: "Kompyuter buyruqlarni juda tez bajaradi, lekin hamma ishni dastur aytadi. Dasturchilar katta loyihani kichik qadamlarga bo'lib chiqadi. Har kuni 15 daqiqa mashq qilgan bola bir oydan keyin ancha tez yozadi. Xato qilishdan qo'rqmang, xatodan o'rganing!" },
  },
];

/** Darsni o'tish uchun eng kam aniqlik (%). */
export const PASS_ACCURACY = 90;

/** Coin qoidalari. */
export const COINS = { lesson: 10, exam: 50, star: 5, daily: 5 };

/** Kurslar tili bo'yicha. Ruscha dars id'lari "r" bilan boshlanadi ("r1-1"). */
export const LANGS = ['uz', 'ru'];
const prefix = { uz: '', ru: 'r' };
export const COURSES = Object.fromEntries(LANGS.map((lang) => {
  const src = lang === 'ru' ? LEVELS_RU : LEVELS_UZ;
  const p = prefix[lang];
  return [lang, src.map((lv) => ({
    ...lv,
    lessons: lv.lessons.map((l) => ({ ...l, id: p + l.id })),
    exam: { ...lv.exam, id: p + lv.exam.id },
  }))];
}));

/**
 * Hamma darslar bitta tekis ro'yxatda (har til o'z tartibida).
 * @type {{id:string, lang:string, level:number, index:number, kind:'lesson'|'exam', title:string, keys:string[], wpm:number, steps:{kind:string,text:string}[]}[]}
 */
export const LESSONS = LANGS.flatMap((lang) => COURSES[lang].flatMap((lv) => [
  ...lv.lessons.map((l, i) => ({ ...l, lang, level: lv.n, index: i, kind: 'lesson', wpm: lv.wpm })),
  { id: lv.exam.id, lang, level: lv.n, index: lv.lessons.length, kind: 'exam', title: lang === 'ru' ? `Экзамен ${lv.n} уровня` : `${lv.n}-daraja imtihoni`, keys: [], wpm: lv.wpm, steps: [{ kind: 'text', text: lv.exam.text }] },
]));

export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
export const lessonsOf = (lang) => LESSONS.filter((l) => l.lang === lang);

/**
 * Yulduzlar (0 = o'tmadi). Darsda: 1 = 90%+, 2 = 95%+, 3 = 98%+ va daraja tezligi.
 * Imtihonda o'tish uchun daraja tezligi ham shart; 3 yulduz uchun tezlik +5.
 */
export function starsFor(lesson, wpm, accuracy) {
  if (accuracy < PASS_ACCURACY) return 0;
  if (lesson.kind === 'exam') {
    if (wpm < lesson.wpm) return 0;
    if (accuracy >= 98 && wpm >= lesson.wpm + 5) return 3;
    return accuracy >= 95 ? 2 : 1;
  }
  if (accuracy >= 98 && wpm >= lesson.wpm) return 3;
  return accuracy >= 95 ? 2 : 1;
}
