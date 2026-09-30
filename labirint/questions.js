// ============================================
// SAVOLLAR BAZASI (umumiy blank) - 180 ta savol
// a = to'g'ri javob indeksi (0,1,2,3)
// level = qiyinlik (1-4, bosqichga mos)
// ============================================
const QUESTION_BANK = {
  mavzular: [
    { id:'matematik', name:'➕ Matematika' },
    { id:'mantiq',    name:'🧠 Mantiq' },
    { id:'it',        name:'💻 IT' },
    { id:'ingliz',    name:'🔤 Ingliz tili' },
    { id:'fan',       name:'🌍 Tabiat' }
  ],

  savollar: {
    matematik: [
      { level:1, q:'5 + 3 = ?', options:['7','8','9','6'], a:1 },
      { level:1, q:'10 - 4 = ?', options:['5','6','7','8'], a:1 },
      { level:1, q:'2 + 2 × 2 = ?', options:['8','6','4','10'], a:1 },
      { level:1, q:'7 + 6 = ?', options:['12','14','13','11'], a:2 },
      { level:1, q:'9 - 5 = ?', options:['4','3','5','6'], a:0 },
      { level:1, q:'3 + 3 + 3 = ?', options:['6','8','9','12'], a:2 },
      { level:1, q:'8 + 8 = ?', options:['14','15','17','16'], a:3 },
      { level:1, q:'12 - 7 = ?', options:['4','5','6','7'], a:1 },
      { level:1, q:'6 + 4 = ?', options:['8','9','10','11'], a:2 },
      { level:2, q:'7 × 3 = ?', options:['18','21','24','27'], a:1 },
      { level:2, q:'36 ÷ 6 = ?', options:['5','6','7','8'], a:1 },
      { level:2, q:'15 + 27 = ?', options:['41','42','43','44'], a:1 },
      { level:2, q:'8 × 4 = ?', options:['28','30','32','36'], a:2 },
      { level:2, q:'49 ÷ 7 = ?', options:['6','7','8','9'], a:1 },
      { level:2, q:'25 + 18 = ?', options:['42','43','44','45'], a:1 },
      { level:2, q:'6 × 6 = ?', options:['30','32','34','36'], a:3 },
      { level:2, q:'54 ÷ 9 = ?', options:['5','6','7','8'], a:1 },
      { level:2, q:'33 - 16 = ?', options:['17','16','18','19'], a:0 },
      { level:3, q:'15 × 4 = ?', options:['45','50','60','65'], a:2 },
      { level:3, q:'144 ÷ 12 = ?', options:['10','11','12','14'], a:2 },
      { level:3, q:'9 × 9 - 1 = ?', options:['79','80','81','82'], a:1 },
      { level:3, q:'125 ÷ 5 = ?', options:['20','25','30','35'], a:1 },
      { level:3, q:'16 × 3 = ?', options:['42','44','46','48'], a:3 },
      { level:3, q:'81 ÷ 9 + 1 = ?', options:['10','9','11','12'], a:0 },
      { level:3, q:'24 × 2 = ?', options:['44','46','48','50'], a:2 },
      { level:3, q:'100 - 37 = ?', options:['62','63','64','65'], a:1 },
      { level:3, q:'7 × 8 = ?', options:['54','55','56','58'], a:2 },
      { level:4, q:'200 ning 25% i = ?', options:['25','40','50','75'], a:2 },
      { level:4, q:'17 × 6 = ?', options:['96','102','108','112'], a:1 },
      { level:4, q:'(8 + 4) × 3 = ?', options:['24','30','36','48'], a:2 },
      { level:4, q:'300 ning 15% i = ?', options:['30','45','60','75'], a:1 },
      { level:4, q:'2 ning 5-darajasi = ?', options:['16','25','32','64'], a:2 },
      { level:4, q:'99 × 9 = ?', options:['881','891','901','911'], a:1 },
      { level:4, q:'1000 ÷ 8 = ?', options:['115','120','125','130'], a:2 },
      { level:4, q:'(20 - 5) × 4 = ?', options:['45','50','55','60'], a:3 },
      { level:4, q:'13 × 13 = ?', options:['159','169','179','189'], a:1 }
    ],
    mantiq: [
      { level:1, q:'2, 4, 6, 8, ... ?', options:['9','10','11','12'], a:1 },
      { level:1, q:'1, 3, 5, 7, ... ?', options:['8','9','10','11'], a:1 },
      { level:1, q:'Ortiqcha: olma, nok, sabzi, olcha?', options:['olma','nok','sabzi','olcha'], a:2 },
      { level:1, q:'5, 10, 15, ... ?', options:['18','19','20','25'], a:2 },
      { level:1, q:'Ortiqcha: it, mushuk, quyon, stul?', options:['it','mushuk','quyon','stul'], a:3 },
      { level:1, q:'10, 20, 30, ... ?', options:['35','40','45','50'], a:1 },
      { level:1, q:'Cho\'p suzsa, tosh nima qiladi?', options:['suzadi','cho\'kadi','uchadi','eriydi'], a:1 },
      { level:1, q:'1, 2, 3, 4, ... ?', options:['5','6','7','8'], a:0 },
      { level:1, q:'Ortiqcha: qizil, yashil, katta, ko\'k?', options:['qizil','yashil','katta','ko\'k'], a:2 },
      { level:2, q:'3, 6, 9, 12, ... ?', options:['13','14','15','16'], a:2 },
      { level:2, q:'Bugun seshanba, ertaga nima?', options:['dushanba','chorshanba','payshanba','juma'], a:1 },
      { level:2, q:'1, 4, 9, 16, ... ?', options:['20','24','25','36'], a:2 },
      { level:2, q:'4, 8, 12, 16, ... ?', options:['18','19','20','24'], a:2 },
      { level:2, q:'100, 90, 80, ... ?', options:['60','70','75','65'], a:1 },
      { level:2, q:'Ortiqcha: metr, kilometr, litr, santimetr?', options:['metr','kilometr','litr','santimetr'], a:2 },
      { level:2, q:'Dushanba + 3 kun = ?', options:['dushanba','chorshanba','payshanba','juma'], a:2 },
      { level:2, q:'7, 14, 21, ... ?', options:['26','27','28','35'], a:2 },
      { level:2, q:'Hamma mushuklar hayvon. Ba\'zi hayvonlar...?', options:['mushuk','qush','baliq','odat'], a:0 },
      { level:3, q:'2, 3, 5, 8, 12, ... ?', options:['15','16','17','18'], a:2 },
      { level:3, q:'Kitob : o\'qish = musiqa : ?', options:['yozish','eshitish','ko\'rish','aytish'], a:1 },
      { level:3, q:'1, 1, 2, 3, 5, 8, ... ?', options:['11','12','13','14'], a:2 },
      { level:3, q:'3, 5, 8, 12, 17, ... ?', options:['22','23','24','25'], a:1 },
      { level:3, q:'Qalam : yozish = pichoq : ?', options:['yozish','kesish','chopish','surish'], a:1 },
      { level:3, q:'100, 81, 64, 49, ... ?', options:['25','36','42','30'], a:1 },
      { level:3, q:'5 aka-uka, har birida 1 singil. Necha bola?', options:['6','10','11','15'], a:0 },
      { level:3, q:'1, 8, 27, 64, ... ?', options:['81','100','125','144'], a:2 },
      { level:3, q:'Shimol : janub = sharq : ?', options:['shimol','g\'arb','janub','sharq'], a:1 },
      { level:4, q:'2, 6, 12, 20, 30, ... ?', options:['36','40','42','44'], a:2 },
      { level:4, q:'A=1, B=2, C=3 bo\'lsa, CAB = ?', options:['123','312','213','321'], a:1 },
      { level:4, q:'1, 2, 6, 24, 120, ... ?', options:['240','480','600','720'], a:3 },
      { level:4, q:'3 olma + 2 olma - 1 olma = ?', options:['3','4','5','6'], a:1 },
      { level:4, q:'81, 27, 9, ... ?', options:['3','6','1','0'], a:0 },
      { level:4, q:'Soat 3:00 da millar orasi necha gradus?', options:['60','90','120','180'], a:1 },
      { level:4, q:'1, 4, 2, 8, 3, 12, ... ?', options:['4','16','6','14'], a:0 },
      { level:4, q:'Bugun juma. 10 kun oldin qaysi kun edi?', options:['dushanba','seshanba','chorshanba','payshanba'], a:1 },
      { level:4, q:'2 qo\'lda 10 barmoq. 10 qo\'lda necha?', options:['20','40','50','100'], a:2 }
    ],
    it: [
      { level:1, q:'Kompyuterning "miyasi" nima?', options:['Monitor','Protsessor','Klaviatura','Sichqoncha'], a:1 },
      { level:1, q:'HTML nima?', options:['Dastur tili','Veb sahifa tili','O\'yin','Brauzer'], a:1 },
      { level:1, q:'Sichqoncha nima uchun?', options:['Yozish','Boshqarish','Chop etish','Eshitish'], a:1 },
      { level:1, q:'Monitor nima?', options:['Ekran','Karnay','Protsessor','Xotira'], a:0 },
      { level:1, q:'Klaviatura nima uchun?', options:['Yozish','Ko\'rish','Eshitish','Saqlash'], a:0 },
      { level:1, q:'Kompyuter nima bilan ishlaydi?', options:['Suv','Elektr','Shamol','Quyosh'], a:1 },
      { level:1, q:'Internet nima?', options:['Kompyuter','Global tarmoq','Dastur','O\'yin'], a:1 },
      { level:1, q:'Telefon ham kompyutermi?', options:['Ha','Yo\'q','Ba\'zan','Bilmayman'], a:0 },
      { level:1, q:'Rasm fayli kengaytmasi?', options:['.jpg','.mp3','.exe','.txt'], a:0 },
      { level:2, q:'"Bug" nima?', options:['Dastur xatosi','Hayvon','O\'yin','Fayl'], a:0 },
      { level:2, q:'CSS nima uchun?', options:['Hisoblash','Dizayn berish','Saqlash','Yuborish'], a:1 },
      { level:2, q:'Brauzer nima?', options:['O\'yin','Veb sahifa ochuvchi dastur','Rasm','Virus'], a:1 },
      { level:2, q:'Wi-Fi nima?', options:['Simsiz internet','Sim','Klaviatura','Ekran'], a:0 },
      { level:2, q:'Fayl nima?', options:['Ma\'lumot bo\'lagi','Ekran','Tugma','Sim'], a:0 },
      { level:2, q:'MP3 nima?', options:['Rasm','Musiqa fayli','Video','Dastur'], a:1 },
      { level:2, q:'USB nima?', options:['Xotira qurilmasi','Ekran','Klaviatura','Monitor'], a:0 },
      { level:2, q:'Ekran o\'lchami nima bilan?', options:['Metr','Dyuym','Litr','Kilo'], a:1 },
      { level:2, q:'Antivirus nima uchun?', options:['Himoya','O\'yin','Rasm','Musiqa'], a:0 },
      { level:3, q:'Python qanday til?', options:['Dasturlash','Ingliz','Matematik','Brauzer'], a:0 },
      { level:3, q:'"Loop" nima?', options:['Xato','Takrorlash','Fayl','Sichqoncha'], a:1 },
      { level:3, q:'1 bayt necha bit?', options:['4','8','16','32'], a:1 },
      { level:3, q:'JavaScript qayerda ishlaydi?', options:['Brauzerda','Qog\'ozda','Printda','Radioda'], a:0 },
      { level:3, q:'Server nima?', options:['Kuchli kompyuter','O\'yin','Rasm','Klaviatura'], a:0 },
      { level:3, q:'"App" nima?', options:['Ilova','Sim','Ekran','Tugma'], a:0 },
      { level:3, q:'"Kod" nima?', options:['Rasm','Ko\'rsatma','Musiqa','Suv'], a:1 },
      { level:3, q:'"Download" nima?', options:['Yuklab olish','Yuborish','O\'chirish','Saqlash'], a:0 },
      { level:3, q:'"Login" nima?', options:['Chiqish','Kirish','O\'chirish','Yuklash'], a:1 },
      { level:4, q:'"Variable" nima?', options:['O\'zgaruvchi','Dastur','Ekran','Tugma'], a:0 },
      { level:4, q:'Algoritm nima?', options:['Xato','Qadamlar ketma-ketligi','O\'yin','Rasm'], a:1 },
      { level:4, q:'Binary 101 = o\'nlikda?', options:['3','4','5','6'], a:2 },
      { level:4, q:'1 KB necha bayt?', options:['100','1000','1024','10240'], a:2 },
      { level:4, q:'CPU qisqartmasi nima?', options:['Markaziy protsessor','Xotira','Ekran','Klaviatura'], a:0 },
      { level:4, q:'Binary 1111 = o\'nlikda?', options:['8','11','13','15'], a:3 },
      { level:4, q:'"Debug" nima?', options:['Xatoni tuzatish','Xato qilish','O\'chirish','Yuklash'], a:0 },
      { level:4, q:'RAM nima?', options:['Tezkor xotira','Doimiy xotira','Ekran','Sim'], a:0 },
      { level:4, q:'Binary 1000 = o\'nlikda?', options:['4','6','8','10'], a:2 }
    ],
    ingliz: [
      { level:1, q:'"Apple" tarjimasi?', options:['Nok','Olma','Uzum','Olcha'], a:1 },
      { level:1, q:'"Cat" tarjimasi?', options:['It','Mushuk','Quyon','Sigir'], a:1 },
      { level:1, q:'"Book" tarjimasi?', options:['Qalam','Kitob','Stol','Stul'], a:1 },
      { level:1, q:'"Dog" tarjimasi?', options:['It','Mushuk','Ot','Echki'], a:0 },
      { level:1, q:'"Sun" tarjimasi?', options:['Oy','Quyosh','Yulduz','Bulut'], a:1 },
      { level:1, q:'"Water" tarjimasi?', options:['Sut','Suv','Choy','Sharbat'], a:1 },
      { level:1, q:'"Red" tarjimasi?', options:['Qizil','Yashil','Ko\'k','Sariq'], a:0 },
      { level:1, q:'"One" tarjimasi?', options:['Ikki','Bir','Uch','To\'rt'], a:1 },
      { level:1, q:'"House" tarjimasi?', options:['Maktab','Uy','Bozor','Bog\''], a:1 },
      { level:2, q:'"Computer" tarjimasi?', options:['Televizor','Kompyuter','Telefon','Radio'], a:1 },
      { level:2, q:'"Run" tarjimasi?', options:['Yurmoq','Yugurmoq','Uxlamoq','O\'qimoq'], a:1 },
      { level:2, q:'"Milk" tarjimasi?', options:['Sut','Suv','Choy','Sharbat'], a:0 },
      { level:2, q:'"School" tarjimasi?', options:['Uy','Bozor','Maktab','Bog\''], a:2 },
      { level:2, q:'"Big" tarjimasi?', options:['Kichik','Katta','Uzun','Qisqa'], a:1 },
      { level:2, q:'"Eat" tarjimasi?', options:['Yemoq','Ichmoq','Uxlamoq','Yurmoq'], a:0 },
      { level:2, q:'"Friend" tarjimasi?', options:['Dushman','Do\'st','Aka','Uka'], a:1 },
      { level:2, q:'"Happy" tarjimasi?', options:['G\'amgin','Baxtli','Yolg\'iz','Charchagan'], a:1 },
      { level:2, q:'"Tree" tarjimasi?', options:['Gul','O\'t','Daraxt','Buta'], a:2 },
      { level:3, q:'"Knowledge" tarjimasi?', options:['Bilim','Kuch','Pul','Vaqt'], a:0 },
      { level:3, q:'"Quick" sinonimi?', options:['Slow','Fast','Big','Small'], a:1 },
      { level:3, q:'"She ___ a teacher."', options:['am','is','are','be'], a:1 },
      { level:3, q:'"Go" o\'tgan zamoni?', options:['goed','went','gone','going'], a:1 },
      { level:3, q:'"Beautiful" tarjimasi?', options:['Xunuk','Chiroyli','Katta','Kichik'], a:1 },
      { level:3, q:'"I ___ a student."', options:['am','is','are','be'], a:0 },
      { level:3, q:'"Child" ko\'pligi?', options:['childs','children','childes','child'], a:1 },
      { level:3, q:'"Slow" antonimi?', options:['Fast','Big','Small','Long'], a:0 },
      { level:3, q:'"Read" o\'tgan zamoni?', options:['read','readed','red','reading'], a:0 },
      { level:4, q:'"Achievement" tarjimasi?', options:['Yutuq','Xato','Savol','Javob'], a:0 },
      { level:4, q:'"They ___ playing."', options:['is','am','are','was'], a:2 },
      { level:4, q:'"Improve" tarjimasi?', options:['Yomonlash','Yaxshilash','To\'xtash','Boshlash'], a:1 },
      { level:4, q:'"He ___ gone."', options:['have','has','had','having'], a:1 },
      { level:4, q:'"Success" tarjimasi?', options:['Xato','Muvaffaqiyat','Savol','Javob'], a:1 },
      { level:4, q:'"Begin" sinonimi?', options:['Start','Stop','End','Finish'], a:0 },
      { level:4, q:'"She ___ English well."', options:['speak','speaks','speaking','spoke'], a:1 },
      { level:4, q:'"Ancient" antonimi?', options:['Old','Modern','Past','Aged'], a:1 },
      { level:4, q:'"Brave" tarjimasi?', options:['Qo\'rqoq','Jasur','Dono','Kuchli'], a:1 }
    ],
    fan: [
      { level:1, q:'Quyosh nima?', options:['Sayyora','Yulduz','Oy','Kometa'], a:1 },
      { level:1, q:'Suv formulasi?', options:['CO2','H2O','O2','NaCl'], a:1 },
      { level:1, q:'Nechta fasl bor?', options:['2','3','4','5'], a:2 },
      { level:1, q:'Oy nima?', options:['Yo\'ldosh','Sayyora','Yulduz','Quyosh'], a:0 },
      { level:1, q:'Barg qanday rang?', options:['Qizil','Yashil','Ko\'k','Sariq'], a:1 },
      { level:1, q:'Haftada necha kun?', options:['5','6','7','8'], a:2 },
      { level:1, q:'Qush nima qila oladi?', options:['Uchish','Suzish','Cho\'kish','Yashirinish'], a:0 },
      { level:1, q:'Muz qachon eriydi?', options:['Sovuqda','Issiqda','Qorongida','Shamolda'], a:1 },
      { level:1, q:'Eng katta hayvon?', options:['Fil','Ko\'k kit','Arslon','Jirafa'], a:1 },
      { level:2, q:'Yer nechinchi sayyora?', options:['1','2','3','4'], a:2 },
      { level:2, q:'O\'similik qanday oziqlanadi?', options:['Fotosintez','Nafas','Suv','Shamol'], a:0 },
      { level:2, q:'Muz qaysi holat?', options:['Suyuq','Qattiq','Gaz','Plazma'], a:1 },
      { level:2, q:'Quyosh tizimida necha sayyora?', options:['7','8','9','10'], a:1 },
      { level:2, q:'Odam qaysi tur?', options:['Sudraluvchi','Sutemizuvchi','Qush','Baliq'], a:1 },
      { level:2, q:'Yomg\'ir qayerdan yog\'adi?', options:['Bulutdan','Yerdan','Daryodan','Tog\'dan'], a:0 },
      { level:2, q:'Eng tez hayvon?', options:['Arslon','Ot','Gepard','Quyon'], a:2 },
      { level:2, q:'O\'similik nima orqali nafas oladi?', options:['Ildiz','Barg','Poya','Gul'], a:1 },
      { level:2, q:'Eng qisqa kun qachon?', options:['Yozda','Bahorda','Kuzda','Qishda'], a:3 },
      { level:3, q:'Odamda necha suyak bor?', options:['106','206','306','406'], a:1 },
      { level:3, q:'Eng katta sayyora?', options:['Yer','Mars','Yupiter','Saturn'], a:2 },
      { level:3, q:'Yorug\'lik eng tez qayerda?', options:['Suv','Havo','Vakuum','Shisha'], a:2 },
      { level:3, q:'Qon nima tashiydi?', options:['Kislorod','Suv','Havo','Tuproq'], a:0 },
      { level:3, q:'Eng baland tog\'?', options:['Elbrus','Everest','Alp','Ural'], a:1 },
      { level:3, q:'Nechta kontinent bor?', options:['5','6','7','8'], a:2 },
      { level:3, q:'Elektrni nima o\'tkazmaydi?', options:['Mis','Rezina','Temir','Oltin'], a:1 },
      { level:3, q:'Ildiz nima qiladi?', options:['Suv so\'radi','Yorug\'lik oladi','Gul ochadi','Nafas oladi'], a:0 },
      { level:3, q:'Dengiz suvi qanday?', options:['Shirin','Sho\'r','Achchiq','Nordon'], a:1 },
      { level:4, q:'DNK nima?', options:['Genetik kod','Dastur','Suv','Havo'], a:0 },
      { level:4, q:'Kislorod belgisi?', options:['O','C','N','H'], a:0 },
      { level:4, q:'Kamalakda necha rang?', options:['3','5','7','9'], a:2 },
      { level:4, q:'Eng kichik tiriklik birligi?', options:['Hujayra','Atom','Molekula','Tosh'], a:0 },
      { level:4, q:'Yurak nima qiladi?', options:['Qon haydaydi','Nafas oladi','Oziqlanadi','Uxlaydi'], a:0 },
      { level:4, q:'CO2 nima?', options:['Kislorod','Karbonat angidrid','Suv','Azot'], a:1 },
      { level:4, q:'Eng issiq sayyora?', options:['Merkuriy','Venera','Mars','Yupiter'], a:1 },
      { level:4, q:'Magnet nima tortadi?', options:['Yog\'och','Temir','Plastik','Qog\'oz'], a:1 },
      { level:4, q:'O\'similik qaysi gazni yutadi?', options:['Kislorod','CO2','Azot','Vodorod'], a:1 }
    ]
  }
};

// Berilgan savollar ro'yxati (takrorlanmaslik uchun)
const askedSavollar = [];

// Mavzu + level bo'yicha savol olish (TAKRORLANMAYDI)
function getSavol(mavzuId, level) {
  const pool = (QUESTION_BANK.savollar[mavzuId] || []).filter(s => s.level === level);
  if (!pool.length) return null;
  
  // Hali berilmagan savollar
  let fresh = pool.filter(s => askedSavollar.indexOf(s.q) === -1);
  
  // Agar hammasi berilgan bo'lsa - shu pool belgilarini tozalab, qayta boshlaymiz
  if (!fresh.length) {
    pool.forEach(s => {
      const i = askedSavollar.indexOf(s.q);
      if (i !== -1) askedSavollar.splice(i, 1);
    });
    fresh = pool;
  }
  
  const chosen = fresh[Math.floor(Math.random() * fresh.length)];
  askedSavollar.push(chosen.q);
  return chosen;
}
// Bosqich uchun ajratilgan savollar soni
function getSavollarCount(mavzuId, level) {
  return (QUESTION_BANK.savollar[mavzuId] || []).filter(s => s.level === level).length;
}
