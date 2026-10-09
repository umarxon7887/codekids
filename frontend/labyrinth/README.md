# CodeKids Labirint — client + mock server (API shartnomasi bo'yicha)

    npm install
    npm run test            # mock o'yin qoidalari (socket'siz)
    npm run mock            # http://localhost:3000   (MODE=kids, SIZE=15, MANUAL_START=1, CODE=... muhit o'zgaruvchilari)

Demo: `http://localhost:3000/?u=oquvchi1` (boshqa o'quvchi: `?u=oquvchi2`). Mock'da email "teacher" bilan boshlansa host bo'ladi
(`MANUAL_START=1` bilan o'yinni host `net.start()` orqali boshlaydi, aks holda 4 soniyadan keyin o'zi boshlanadi).

## Oqim
1. `ApiClient.login()` -> access token xotirada, refresh token — httpOnly cookie (`credentials: "include"`).
2. `ApiClient.joinRoom(code)` — REST (201 yangi / 200 qayta kirish).
3. `startLabyrinth({ ..., getToken: () => api.getToken(), onAuthError: () => api.refresh() })` — socket `auth: { token }`;
   token har ulanishda (reconnect ham) tekshiriladi va muddati o'tayotgan bo'lsa yangilanadi.

## Moslashtirilgan joylar
- Harakat: `labyrinth:move { code, direction }` (client faqat yo'nalish yuboradi, server maqsad katakni hisoblaydi).
- Har eventda `code`. Javob: `labyrinth:answer { code, choice }`. Host: `labyrinth:start { code }`.
- `RATE_LIMITED` / `TOO_FAST` kelsa client harakat oralig'ini o'zi 25 ms ga oshiradi (400 ms gacha).
- Token xatosi (`TOKEN_EXPIRED/INVALID`, `AUTH_REQUIRED`): 2 martagacha yangilab qayta ulanadi, keyin `ui.showAuthRequired()`.
- `app:error` tinglanmaydi (xatolar ack'dan o'qiladi).
