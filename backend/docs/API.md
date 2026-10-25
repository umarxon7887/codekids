# CodeKids API shartnomasi

Barcha REST endpoint'lar `/api/v1` prefiksi bilan.

## Umumiy qoidalar

- **Xato formati** (hamma joyda bir xil):
```json
  { "error": { "code": "STRING_CODE", "message": "...", "details": [] } }
```
  `details` faqat validatsiya xatolarida bo'ladi.
- **Autentifikatsiya:** `Authorization: Bearer <accessToken>`. Access token 15 daqiqa yashaydi.
- **Refresh token:** httpOnly cookie, yo'li `/api/v1/auth`. Frontend `credentials: "include"` yuborishi shart.
- **Rate limit:** 15 daqiqada 300 so'rov (umumiy). Login/register uchun 15 daqiqada 10 ta muvaffaqiyatsiz urinish.

## Auth

| Metod | Yo'l | Kirish | Javob |
|---|---|---|---|
| POST | `/auth/register` | ochiq | `201 { accessToken, user }` + refresh cookie |
| POST | `/auth/login` | ochiq | `200 { accessToken, user }` + refresh cookie |
| POST | `/auth/refresh` | cookie | `200 { accessToken }` + yangi refresh cookie |
| POST | `/auth/logout` | cookie | `204` |
| GET | `/auth/me` | token | `200 { user }` |

**Register so'rovi:**
```json
{ "email": "a@b.com", "password": "kamida8", "role": "student | teacher", "nickname": "Ali",
  "full_name": "teacher uchun majburiy", "school": "...", "subjects": ["math"],
  "experience_years": 5, "age_group": "7-9" }
```

Xato kodlari: `VALIDATION_ERROR`, `CONFLICT` (email band), `RATE_LIMITED`, `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_REUSED`, `INVALID_CREDENTIALS`.

## Kontentlar

| Metod | Yo'l | Kirish | Izoh |
|---|---|---|---|
| GET | `/contents` | ochiq | `?topic=&level=1-4&type=&q=&limit=&offset=` |
| GET | `/contents/search` | ochiq | `?q=` (kamida 2 belgi) |
| POST | `/contents` | teacher | `{ type, title, topic?, level?, data }` |
| POST | `/contents/bulk-upload` | teacher | multipart: `file` (CSV), `title`, `topic?`, `level?` |
| PUT | `/contents/:id` | teacher, egasi | qisman yangilash |
| DELETE | `/contents/:id` | teacher, egasi | soft delete, `204` |
| POST | `/contents/:id/publish` | teacher, egasi | `{ content: { id, is_published } }` |
| POST | `/contents/:id/like` | token | `{ liked, likes_count }` |

**Kontent `data` shakli:**
- `questions`: `{ "questions": [{ "text": "...", "options": ["a","b"], "answer": 0 }] }` (1–100 ta, variant 2–4)
- `typing_text`: `{ "text": "20–2000 belgi" }`

**CSV ustunlari:** `question, option_a, option_b, option_c, option_d, correct` (`correct`: A/B/C/D). Xato qatorlari `details` da `row` bilan qaytadi.

## Typing (login talab qiladi)

| Metod | Yo'l | Izoh |
|---|---|---|
| POST | `/typing/sessions` | `{ content_id, language: "uz\|ru\|en", level?, room_code? }` → `{ session_id, started_at, expires_at, target_text }` |
| POST | `/typing/results` | `{ session_id, typed_text }` → `{ result: { wpm, accuracy, time_sec, text_length, flagged, room_id? } }` |

WPM va aniqlik serverda hisoblanadi. `wpm > 150` bo'lsa `flagged: true`. Sessiya bir marta ishlatiladi (`SESSION_USED`). 2 soniyadan tez natija `TOO_FAST`.

## Mehmon mashqi (login talab qilinmaydi, saqlanmaydi)

| Metod | Yo'l | Izoh |
|---|---|---|
| POST | `/guest/session` | `{ content_id? }` → `{ guest_token, target_text, expires_in: 900 }` |
| POST | `/guest/results` | `{ guest_token, typed_text }` → `{ result: { wpm, accuracy, time_sec, flagged, saved: false } }` |

Token bir marta ishlaydi (`TOKEN_USED`). Mehmon natijasi bazaga yozilmaydi.

## Xonalar (rooms)

| Metod | Yo'l | Kirish | Izoh |
|---|---|---|---|
| POST | `/rooms` | teacher | `{ game_type: "typing\|labyrinth", content_id, max_players?, duration_minutes?, mode?: "kids\|standard", labyrinth?: { size: 5–41 toq } }` |
| POST | `/rooms/join` | student | `{ code }` → `201` (yangi) yoki `200` (qayta kirish) |
| GET | `/rooms/:code` | ishtirokchi/host | host uchun `settings` ham ko'rinadi |
| GET | `/rooms/:code/players` | ishtirokchi/host | |

Xona kodi: 6 belgi, harf va raqam (O, I, 0, 1 yo'q). Xona 2 soat yashaydi.

## Teacher (faqat `role: teacher`)

| Metod | Yo'l | Izoh |
|---|---|---|
| POST | `/teacher/classes` | `{ name }` |
| GET | `/teacher/classes` | sinflar + `student_count` |
| GET | `/teacher/classes/:id` | sinf + o'quvchilar |
| POST | `/teacher/classes/:id/students` | `{ email }` (faqat student) → `{ added }` |
| DELETE | `/teacher/classes/:id/students/:studentId` | `204` |
| GET | `/teacher/classes/:id/analytics?room_code=` | `summary`, `students`, `weak_topics` |
| GET | `/teacher/dashboard` | kontent, sinf, o'quvchi, xona sonlari |

## Profil (login talab qiladi)

| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/profile` | `{ user, stats }`. Ustoz: `stats = { classes, students, rooms, contents }`. O'quvchi: `stats = { typing_games, best_wpm, avg_accuracy, typing_wins, lab_games, lab_correct, lab_best_level, lab_wins, classes: [{id,name,teacher}], recent: [...], it: { xp, done, streak, tools } }` |
| PUT | `/profile` | faqat yuborilgan maydonlar o'zgaradi: `nickname`; ustoz uchun yana `full_name`, `school`, `subjects`, `experience_years`, `age_group` (bo'sh satr → `null`). O'quvchi ustoz maydonini yuborsa `403 TEACHER_ONLY_FIELDS`. Javob: GET bilan bir xil |


## IT darslari (login talab qiladi)

Bo'lim (yo'ldagi qasr) → mavzular (qasr zalidagi eshiklar). Admin bo'limlari hammaga, ustoz bo'limlari faqat o'z sinfidagi o'quvchilarga ko'rinadi; faqat e'lon qilinganlar. O'quvchi uchun mavzular ketma-ket ochiladi, ustoz va admin hammasini ochadi.

| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/it/path` | `{ sections: [{ id, title, method, done, lessons: [{ id, kind, title, minutes, xp, exercises, status }] }], stats: { xp, streak, today, goal, current_lesson_id } }`. `status`: `done`, `current`, `open`, `locked` |
| GET | `/it/lessons/:id` | `{ lesson: { ..., section, tool, content }, stats }`. Qulf bo'lsa `403 LESSON_LOCKED`, ko'rinmasa `404 LESSON_NOT_FOUND` |
| POST | `/it/lessons/:id/complete` | `{ mistakes }` → `{ first, xp_gained, term, tool, next_lesson_id, next_section_id, section_done, stats }`. XP faqat birinchi marta |

`content` = `{ story, video?: { id, title }, helper: { title, text }, exercises: [...], term_text }`. Mashq turlari: `choice` (`kind`: predict/error/odd/analogy/general, `options`, `answer`), `order` (`items` to'g'ri tartibda), `match` (`pairs`).
`video.id` — faqat 11 belgili YouTube video ID; pleyer `youtube-nocookie.com/embed/<id>` dan quriladi, hikoyadan keyin chiqadi.
Namuna kontent: `node scripts/seed-it-sample.mjs` (o'chirish: `--remove`).

### Darslar muharriri (faqat `role: admin`)

Admin umumiy (`is_global`) bo'limlarni boshqaradi. Yangi bo'lim va mavzu qoralama bo'lib yaratiladi (`is_published: false`).

| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/it/manage` | `{ sections: [{ id, title, method, description, position, is_published, lessons: [{ id, title, kind, position, is_published, exercises, has_video, learners }] }], tools: [{ id, name, short, body, used }] }` |
| POST | `/it/manage/sections` | `{ title, method?, description? }` → `201 { section }` (ro'yxat oxiriga) |
| PUT | `/it/manage/sections/:id` | `{ title?, method?, description?, is_published? }` → `{ section }` |
| DELETE | `/it/manage/sections/:id` | o'quvchi progressi bo'lsa `409 HAS_PROGRESS { learners }`; `?force=1` bilan bo'lim, mavzulari va progress o'chadi |
| POST | `/it/manage/sections/:id/move` | `{ dir: 'up' \| 'down' }` → `{ moved }` |
| POST | `/it/manage/sections/:id/lessons` | `{ title, kind? }` → `201 { lesson }` (bo'sh qoralama; `test` uchun 20 XP) |
| GET | `/it/manage/lessons/:id` | `{ lesson: { ..., content, section_title, learners } }` (qoralama bo'lsa ham) |
| PUT | `/it/manage/lessons/:id` | `{ title?, kind?, term?, tool_id?, minutes?, xp?, content?, is_published? }` → `{ lesson }`. Qoralama chala bo'lishi mumkin. E'lon qilingan (yoki hozir e'lon qilinayotgan) mavzu chala bo'lsa `422 LESSON_NOT_READY`, `details: [{ path, message }]` (masalan `exercises.0.options.1`), hech narsa saqlanmaydi |
| DELETE | `/it/manage/lessons/:id` | progress bo'lsa `409 HAS_PROGRESS`; `?force=1` |
| POST | `/it/manage/lessons/:id/move` | `{ dir }` (bo'lim ichida) |
| POST | `/it/manage/tools` | `{ name, short?, body? }` → `201 { tool }` |
| PUT | `/it/manage/tools/:id` | `{ name?, short?, body? }` → `{ tool }` |
| DELETE | `/it/manage/tools/:id` | mavzuga biriktirilgan bo'lsa `409 TOOL_IN_USE { used }`; `?force=1` |

Admin akkaunti ro'yxatdan o'tish orqali yaratilmaydi (u yerda faqat `student`/`teacher`), faqat skript bilan:
`DATABASE_URL="..." node scripts/create-admin.mjs` — email, nikneym va parol (kamida 12 belgi, ekranda ko'rinmaydi) so'raladi. Email allaqachon admin bo'lsa, parolni yangilaydi va eski sessiyalarni yopadi.

---

## Socket.io

Ulanish: `io(URL, { auth: { token } })`. Mehmon: `auth: { guest: true, deviceId: "8–64 belgi" }` (faqat solo, o'yin eventlari yo'q).

**Umumiy:** har event ack callback bilan javob beradi: `{ ok: true, ... }` yoki `{ ok: false, error: { code, message } }`. Xato `app:error` eventi orqali ham keladi (client faqat ack'ni ishlatsa kifoya). Soniyasiga 15 event chegarasi.

### Typing xona (`room:*`)

| Event | So'rov | Ack | Boshqa eventlar |
|---|---|---|---|
| `room:join` | `{ code }` | `{ joined: true }` | `room:snapshot` |
| `room:start` | `{ code }` (faqat host) | `{ status: "active" }` | `room:snapshot` |
| `room:progress` | `{ code, correct }` | `{ correct, finished }` | `room:snapshot` (250 ms tick) |

`room:snapshot`: `{ code, status, startedAt, endsAt, targetLength, players: [{ nickname, correct, finished }] }`.

### Labirint (`labyrinth:*`)

| Event | So'rov | Ack | Boshqa eventlar |
|---|---|---|---|
| `labyrinth:join` | `{ code }` | `{ joined, playerId }` | `labyrinth:init` |
| `labyrinth:start` | `{ code }` (faqat host) | `{ status, endsAt }` | `labyrinth:update` |
| `labyrinth:move` | `{ code, direction: up\|down\|left\|right }` | `{ x, y, finished, question }` | `labyrinth:update` |
| `labyrinth:answer` | `{ code, choice }` (variant indeksi) | `{ correct, correctIndex, lives, score, finished, eliminated, x, y, lockedUntil }` | `labyrinth:update` |

**`labyrinth:init`:** `{ grid, size, start, exit, checkpoints, status, endsAt, serverNow, mode, you, players }`.
- `grid[y][x]`: `"1"` devor, `"0"` yo'l. Satrlar matn.
- `you`: `{ id, cleared, x, y, lives, score, finished, eliminated, rank, question, lockedUntil }`. Host uchun `null`.
- `you.question`: `{ index, text, options }` (javob yo'q, variantlar aralashtirilgan).
- `mode: "kids"` bo'lsa `lives: null`.

**`labyrinth:update`:** `{ status, endsAt, serverNow, players: [{ id, nickname, x, y, lives, score, finished, eliminated, rank }] }`. Har harakat va javobdan keyin, ack'dan keyin keladi.

**`labyrinth:finished`:** `{ players }` (`rank` bilan, `score` tartibida).

**Qoidalar:**
- Harakat: 200 ms cooldown (`TOO_FAST`), devor (`BLOCKED`), savol javobsiz (`QUESTION_PENDING`), qulf (`LOCKED`), tugagan (`PLAYER_FINISHED`), xona tugagan (`ROOM_NOT_ACTIVE`).
- Checkpoint'da savol chiqadi. To'g'ri javob checkpoint'ni tozalaydi.
- Noto'g'ri javob: `standard` da jon −1, `kids` da jon yo'q. Hammasida 5 soniya qulf va oxirgi tozalangan checkpoint'ga (yo'q bo'lsa start) qaytish.
- Jon 0 bo'lsa: `eliminated: true`, `finished: true`.
- Ball: to'g'ri javob +10. Finish bonusi o'rin bo'yicha: 1-o'rin +50, 2-o'rin +30, 3-o'rin +20, qolganlar +10.
- Vaqt tugasa xona avtomatik yopiladi (`labyrinth:finished`).

**Xato kodlari (socket):** `GUEST_NOT_ALLOWED`, `NOT_A_PARTICIPANT`, `FORBIDDEN`, `ROOM_NOT_ACTIVE`, `ROOM_NOT_STARTABLE`, `NO_PLAYERS`, `BLOCKED`, `TOO_FAST`, `LOCKED`, `QUESTION_PENDING`, `NO_PENDING_QUESTION`, `INVALID_CHOICE`, `PLAYER_FINISHED`, `ROOM_FINISHED`, `WRONG_GAME_TYPE`, `VALIDATION_ERROR`, `RATE_LIMITED`, `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`.

**Ma'lum cheklovlar:**
- Xona holati xotirada. Server qayta ishga tushsa, jonli o'yin to'xtaydi (bazadagi holat saqlanadi, lekin xona qayta yuklanganda taymer va savol holatiga qarab davom etadi).
- Bir vaqtda bitta server instance.
