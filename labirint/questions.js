// ============================================
// SAVOLLAR BAZASI (umumiy blank)
// a = to'g'ri javob indeksi (0,1,2,3)
// level = qiyinlik (1-4, bosqichga mos)
// ============================================
const QUESTION_BANK = {
  mavzular: [
    { id: 'matematik', name: '➕ Matematika' },
    { id: 'mantiq',    name: '🧠 Mantiq' },
    { id: 'it',        name: '💻 IT' },
    { id: 'ingliz',    name: '🔤 Ingliz tili' },
    { id: 'fan',       name: '🌍 Tabiat' }
  ],

  savollar: {
    matematik: [
      { level:1, q:'5 + 3 = ?', options:['7','8','9','6'], a:1 },
      { level:1, q:'10 - 4 = ?', options:['5','6','7','8'], a:1 },
      { level:1, q:'2 + 2 × 2 = ?', options:['8','6','4','10'], a:1 },
      { level:2, q:'7 × 3 = ?', options:['18','21','24','27'], a:1 },
      { level:2, q:'36 ÷ 6 = ?', options:['5','6','7','8'], a:1 },
      { level:2, q:'15 + 27 = ?', options:['41','42','43','44'], a:1 },
      { level:3, q:'15 × 4 = ?', options:['45','50','60','65'], a:2 },
      { level:3, q:'144 ÷ 12 = ?', options:['10','11','12','14'], a:2 },
      { level:3, q:'9 × 9 - 1 = ?', options:['79','80','81','82'], a:1 },
      { level:4, q:'200 ning 25% i = ?', options:['25','40','50','75'], a:2 },
      { level:4, q:'17 × 6 = ?', options:['96','102','108','112'], a:1 },
      { level:4, q:'(8 + 4) × 3 = ?', options:['24','30','36','48'], a:2 }
    ],
    mantiq: [
      { level:1, q:'2, 4, 6, 8, ... ?', options:['9','10','11','12'], a:1 },
      { level:1, q:'1, 3, 5, 7, ... ?', options:['8','9','10','11'], a:1 },
      { level:1, q:'Ortiqcha: olma, nok, sabzi, olcha?', options:['olma','nok','sabzi','olcha'], a:2 },
      { level:2, q:'3, 6, 9, 12, ... ?', options:['13','14','15','16'], a:2 },
      { level:2, q:'Bugun seshanba, ertaga nima?', options:['dushanba','chorshanba','payshanba','juma'], a:1 },
      { level:2, q:'1, 4, 9, 16, ... ?', options:['20','24','25','36'], a:2 },
      { level:3, q:'2, 3, 5, 8, 12, ... ?', options:['15','16','17','18'], a:2 },
      { level:3, q:'Kitob:o\'qish = musiqa:?', options:['yozish','eshitish','ko\'rish','aytish'], a:1 },
      { level:3, q:'1, 1, 2, 3, 5, 8, ... ?', options:['11','12','13','14'], a:2 },
      { level:4, q:'2, 6, 12, 20, 30, ... ?', options:['36','40','42','44'], a:2 },
      { level:4, q:'A=1, B=2, C=3 bo\'lsa, CAB = ?', options:['123','312','213','321'], a:1 },
      { level:4, q:'5 ta aka-uka, har birida 1 singil. Necha bola?', options:['6','10','11','15'], a:0 }
    ],
    it: [
      { level:1, q:'Kompyuterning "miyasi" nima?', options:['Monitor','Protsessor','Klaviatura','Sichqoncha'], a:1 },
      { level:1, q:'HTML nima?', options:['Dastur tili','Veb sahifa tili','O\'yin','Brauzer'], a:1 },
      { level:1, q:'Sichqoncha nima uchun?', options:['Yozish','Boshqarish','Chop etish','Eshitish'], a:1 },
      { level:2, q:'"Bug" nima?', options:['Dastur xatosi','Hayvon','O\'yin','Fayl'], a:0 },
      { level:2, q:'CSS nima uchun?', options:['Hisoblash','Dizayn berish','Saqlash','Yuborish'], a:1 },
      { level:2, q:'Internet nima?', options:['Kompyuter','Global tarmoq','Dastur','O\'yin'], a:1 },
      { level:3, q:'Python qanday til?', options:['Dasturlash','Ingliz','Matematik','Brauzer'], a:0 },
      { level:3, q:'"Loop" nima?', options:['Xato','Takrorlash','Fayl','Sichqoncha'], a:1 },
      { level:3, q:'1 bayt necha bit?', options:['4','8','16','32'], a:1 },
      { level:4, q:'"Variable" nima?', options:['O\'zgaruvchi','Dastur','Ekran','Tugma'], a:0 },
      { level:4, q:'Algoritm nima?', options:['Xato','Qadamlar ketma-ketligi','O\'yin','Rasm'], a:1 },
      { level:4, q:'Binary 101 = o\'nlikda?', options:['3','4','5','6'], a:2 }
    ],
    ingliz: [
      { level:1, q:'"Apple" tarjimasi?', options:['Nok','Olma','Uzum','Olcha'], a:1 },
      { level:1, q:'"Cat" tarjimasi?', options:['It','Mushuk','Quyon','Sigir'], a:1 },
      { level:1, q:'"Book" tarjimasi?', options:['Qalam','Kitob','Stol','Stul'], a:1 },
      { level:2, q:'"Computer" tarjimasi?', options:['Televizor','Kompyuter','Telefon','Radio'], a:1 },
      { level:2, q:'"Run" tarjimasi?', options:['Yurmoq','Yugurmoq','Uxlamoq','O\'qimoq'], a:1 },
      { level:2, q:'"Water" tarjimasi?', options:['Sut','Suv','Choy','Sharbat'], a:1 },
      { level:3, q:'"Knowledge" tarjimasi?', options:['Bilim','Kuch','Pul','Vaqt'], a:0 },
      { level:3, q:'"Quick" sinonimi?', options:['Slow','Fast','Big','Small'], a:1 },
      { level:3, q:'"She ___ a teacher."', options:['am','is','are','be'], a:1 },
      { level:4, q:'"Achievement" tarjimasi?', options:['Yutuq','Xato','Savol','Javob'], a:0 },
      { level:4, q:'"They ___ playing."', options:['is','am','are','was'], a:2 },
      { level:4, q:'"Improve" tarjimasi?', options:['Yomonlash','Yaxshilash','To\'xtash','Boshlash'], a:1 }
    ],
    fan: [
      { level:1, q:'Quyosh nima?', options:['Sayyora','Yulduz','Oy','Kometa'], a:1 },
      { level:1, q:'Suv formulasi?', options:['CO2','H2O','O2','NaCl'], a:1 },
      { level:1, q:'Nechta fasl bor?', options:['2','3','4','5'], a:2 },
      { level:2, q:'Yer nechinchi sayyora?', options:['1','2','3','4'], a:2 },
      { level:2, q:'O\'similik qanday oziqlanadi?', options:['Fotosintez','Nafas','Suv','Shamol'], a:0 },
      { level:2, q:'Muz qaysi holat?', options:['Suyuq','Qattiq','Gaz','Plazma'], a:1 },
      { level:3, q:'Odamda necha suyak bor?', options:['106','206','306','406'], a:1 },
      { level:3, q:'Eng katta sayyora?', options:['Yer','Mars','Yupiter','Saturn'], a:2 },
      { level:3, q:'Yorug\'lik eng tez qayerda?', options:['Suv','Havo','Vakuum','Shisha'], a:2 },
      { level:4, q:'DNK nima?', options:['Genetik kod','Dastur','Suv','Havo'], a:0 },
      { level:4, q:'Kislorod belgisi?', options:['O','C','N','H'], a:0 },
      { level:4, q:'Kamalakda necha rang?', options:['3','5','7','9'], a:2 }
    ]
  }
};

// Mavzu + level bo'yicha tasodifiy savol olish
function getSavol(mavzuId, level) {
  const pool = (QUESTION_BANK.savollar[mavzuId] || []).filter(s => s.level === level);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
