import { AppError } from '../errors.js';
import { LEVELS, LESSONS, LESSON_BY_ID, COINS, PASS_ACCURACY, starsFor } from '../data/typingCourse.js';

const ATTEMPT_TTL_MS = 30 * 60 * 1000; // 30 daqiqada tugamagan urinish yaroqsiz
const MIN_STEP_SEC = 1;                // bundan tez yozilgan mashq qabul qilinmaydi
const MAX_WPM_FLAG = 150;              // shu tezlikdan oshsa natija shubhali: coin va progress yo'q
const TODAY = `(now() AT TIME ZONE 'Asia/Tashkent')::date`;

const round2 = (x) => Math.round(x * 100) / 100;

/** So'zlarni aralashtiradi (har urinishda boshqacha tartib). */
function shuffled(words) {
  const a = words.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Mashq matni: tugma va so'z mashqlari ikki marta (ikkinchisi aralashgan holda) beriladi,
 * shunda dars intensivroq bo'ladi va yod olib bo'lmaydi. Gap/matn mashqlari o'zgarmaydi.
 */
export function buildStepText(step) {
  if (step.kind === 'text') return step.text;
  const words = step.text.split(' ').filter(Boolean);
  return `${step.text} ${shuffled(words).join(' ')}`;
}

/** Ochiq dars (qisqa ma'lumot) — frontendga matnlarsiz. */
const brief = (l) => ({ id: l.id, kind: l.kind, title: l.title, keys: l.keys, steps: l.steps.length });

/**
 * Kurs xaritasi: darajalar, har dars holati (done/current/open/locked), yulduzlar, coinlar.
 * O'quvchi uchun darslar ketma-ket ochiladi; ustoz va admin hammasini ko'radi.
 */
export async function getCourse(run, user) {
  const [{ rows: prog }, { rows: u }] = await Promise.all([
    run('SELECT lesson_id, stars, best_wpm, best_accuracy FROM typing_lesson_progress WHERE user_id = $1', [user.id]),
    run('SELECT coins FROM users WHERE id = $1', [user.id]),
  ]);
  const byId = new Map(prog.map((p) => [p.lesson_id, p]));
  const free = user.role !== 'student';
  let current = null;
  let stars = 0;
  let done = 0;

  const levels = LEVELS.map((lv) => {
    const lessons = LESSONS.filter((l) => l.level === lv.n).map((l) => {
      const p = byId.get(l.id);
      let status;
      if (p) { status = 'done'; done += 1; stars += p.stars; }
      else if (!current) { status = 'current'; current = l.id; }
      else status = free ? 'open' : 'locked';
      return {
        ...brief(l),
        status,
        stars: p ? p.stars : 0,
        best_wpm: p ? Math.round(Number(p.best_wpm)) : null,
        best_accuracy: p ? Math.round(Number(p.best_accuracy)) : null,
      };
    });
    const st = lessons.every((x) => x.status === 'done') ? 'done'
      : lessons.some((x) => x.status === 'current') ? 'current'
        : lessons.every((x) => x.status === 'locked') ? 'locked' : 'open';
    return { n: lv.n, title: lv.title, desc: lv.desc, wpm: lv.wpm, status: st, lessons };
  });

  return {
    levels,
    stats: {
      coins: u[0]?.coins ?? 0,
      done,
      total: LESSONS.length,
      stars,
      max_stars: LESSONS.length * 3,
      level: current ? LESSON_BY_ID.get(current).level : LEVELS.length,
      current_lesson_id: current,
    },
    rules: { pass_accuracy: PASS_ACCURACY, coins: COINS },
  };
}

/** Dars holatini tekshiradi: yo'q bo'lsa 404, qulflangan bo'lsa 403. */
async function lessonStatus(run, user, lessonId) {
  const course = await getCourse(run, user);
  for (const lv of course.levels) {
    const l = lv.lessons.find((x) => x.id === lessonId);
    if (l) {
      if (l.status === 'locked') throw new AppError(403, 'LESSON_LOCKED', 'Avval oldingi darslarni tugating');
      return { lesson: l, course };
    }
  }
  throw new AppError(404, 'LESSON_NOT_FOUND', 'Dars topilmadi');
}

/** Darsni boshlash: urinish yaratiladi, mashq matnlari qaytariladi. */
export async function startAttempt(run, user, lessonId) {
  const { lesson: status } = await lessonStatus(run, user, lessonId);
  const l = LESSON_BY_ID.get(lessonId);
  const steps = l.steps.map((s) => ({ kind: s.kind, text: buildStepText(s) }));
  const expiresAt = new Date(Date.now() + ATTEMPT_TTL_MS);
  const { rows } = await run(
    `INSERT INTO typing_lesson_attempts (user_id, lesson_id, steps, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id, expires_at`,
    [user.id, lessonId, JSON.stringify(steps.map((s) => ({ text: s.text }))), expiresAt]
  );
  const lv = LEVELS.find((x) => x.n === l.level);
  return {
    attempt_id: rows[0].id,
    expires_at: rows[0].expires_at,
    lesson: {
      id: l.id, kind: l.kind, title: l.title, keys: l.keys, level: l.level, level_title: lv.title,
      wpm: l.wpm, stars: status.stars, best_wpm: status.best_wpm,
    },
    steps,
    rules: { pass_accuracy: PASS_ACCURACY, wpm: l.wpm, exam: l.kind === 'exam' },
  };
}

/** Urinishni qulflab o'qiydi va umumiy tekshiruvlardan o'tkazadi. */
async function lockAttempt(client, user, attemptId, stepIndex) {
  const { rows } = await client.query(
    `SELECT id, lesson_id, steps, expires_at, finished_at
       FROM typing_lesson_attempts WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [attemptId, user.id]
  );
  const a = rows[0];
  if (!a) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Dars urinishi topilmadi');
  if (a.finished_at) throw new AppError(409, 'ATTEMPT_FINISHED', 'Bu urinish allaqachon tugagan');
  if (new Date(a.expires_at).getTime() < Date.now()) throw new AppError(400, 'ATTEMPT_EXPIRED', 'Dars vaqti tugagan, qaytadan boshlang');
  if (stepIndex >= a.steps.length) throw new AppError(404, 'STEP_NOT_FOUND', 'Mashq topilmadi');
  if (stepIndex > 0 && !a.steps[stepIndex - 1].done) throw new AppError(409, 'STEP_ORDER', 'Avval oldingi mashqni tugating');
  return a;
}

/** Mashq boshlandi (birinchi tugma bosilganda). Takror chaqirilsa birinchi vaqt qoladi. */
export async function beginStep(tx, user, attemptId, stepIndex) {
  return tx(async (client) => {
    const a = await lockAttempt(client, user, attemptId, stepIndex);
    const step = a.steps[stepIndex];
    if (step.done) throw new AppError(409, 'STEP_DONE', 'Bu mashq allaqachon bajarilgan');
    if (!step.started_at) {
      a.steps[stepIndex] = { ...step, started_at: new Date().toISOString() };
      await client.query('UPDATE typing_lesson_attempts SET steps = $2 WHERE id = $1', [a.id, JSON.stringify(a.steps)]);
    }
    return { ok: true };
  });
}

/**
 * Mashq natijasi. Yozilgan matn mashq matniga to'liq teng bo'lishi kerak (frontend xato harfda
 * kursorni oldinga o'tkazmaydi). Tezlikni server o'zi hisoblaydi; xatolar sonini frontend yuboradi.
 * Oxirgi mashqdan keyin dars yakunlanadi: yulduz, coin va progress.
 */
export async function submitStep(tx, user, attemptId, stepIndex, { typed, errors }) {
  return tx(async (client) => {
    const a = await lockAttempt(client, user, attemptId, stepIndex);
    const step = a.steps[stepIndex];
    if (step.done) throw new AppError(409, 'STEP_DONE', 'Bu mashq allaqachon bajarilgan');
    if (!step.started_at) throw new AppError(409, 'STEP_NOT_STARTED', 'Mashq boshlanmagan');
    if (typed !== step.text) throw new AppError(400, 'STEP_INCOMPLETE', "Mashq matni oxirigacha yozilmagan");

    const sec = (Date.now() - new Date(step.started_at).getTime()) / 1000;
    if (sec < MIN_STEP_SEC) throw new AppError(400, 'TOO_FAST', 'Natija juda tez yuborildi');

    const len = step.text.length;
    const errs = Math.min(Math.max(0, errors), len * 5);
    a.steps[stepIndex] = { ...step, done: true, len, errors: errs, sec: round2(sec) };
    const stepResult = metrics([a.steps[stepIndex]]);

    const last = stepIndex === a.steps.length - 1;
    if (!last) {
      await client.query('UPDATE typing_lesson_attempts SET steps = $2 WHERE id = $1', [a.id, JSON.stringify(a.steps)]);
      return { step: stepResult, finished: false };
    }
    const result = await finish(client, user, a);
    return { step: stepResult, finished: true, result };
  });
}

/** Mashqlar yig'indisidan WPM (5 belgi = 1 so'z) va aniqlik. */
function metrics(steps) {
  const chars = steps.reduce((s, x) => s + x.len, 0);
  const errors = steps.reduce((s, x) => s + x.errors, 0);
  const sec = steps.reduce((s, x) => s + x.sec, 0);
  return {
    wpm: round2(chars / 5 / (Math.max(sec, 1) / 60)),
    accuracy: round2((chars / (chars + errors)) * 100),
    time_sec: Math.round(sec),
    errors,
  };
}

async function finish(client, user, a) {
  const l = LESSON_BY_ID.get(a.lesson_id);
  const m = metrics(a.steps);
  const flagged = m.wpm > MAX_WPM_FLAG;
  const stars = flagged ? 0 : starsFor(l, m.wpm, m.accuracy);

  const { rows: prevRows } = await client.query(
    'SELECT stars FROM typing_lesson_progress WHERE user_id = $1 AND lesson_id = $2 FOR UPDATE',
    [user.id, l.id]
  );
  const prevStars = prevRows[0]?.stars ?? 0;
  const coins = []; // [{reason, amount}]

  if (stars > 0) {
    if (prevStars === 0) coins.push({ reason: l.kind === 'exam' ? 'exam' : 'lesson', amount: l.kind === 'exam' ? COINS.exam : COINS.lesson });
    const newStars = Math.max(0, stars - prevStars);
    if (newStars) coins.push({ reason: 'star', amount: newStars * COINS.star });

    await client.query(
      `INSERT INTO typing_lesson_progress (user_id, lesson_id, stars, best_wpm, best_accuracy)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, lesson_id) DO UPDATE
         SET stars = GREATEST(typing_lesson_progress.stars, EXCLUDED.stars),
             best_wpm = GREATEST(typing_lesson_progress.best_wpm, EXCLUDED.best_wpm),
             best_accuracy = GREATEST(typing_lesson_progress.best_accuracy, EXCLUDED.best_accuracy),
             attempts = typing_lesson_progress.attempts + 1,
             updated_at = now()`,
      [user.id, l.id, stars, m.wpm, m.accuracy]
    );

    // Kunlik bonus: kunning birinchi o'tilgan darsi uchun (unique index ikkinchisini to'xtatadi)
    const { rows: daily } = await client.query(
      `INSERT INTO coin_events (user_id, amount, reason, ref, day)
       VALUES ($1, $2, 'daily', $3, ${TODAY})
       ON CONFLICT DO NOTHING RETURNING id`,
      [user.id, COINS.daily, l.id]
    );
    if (daily.length) coins.push({ reason: 'daily', amount: COINS.daily, logged: true });
  }

  for (const c of coins) {
    if (c.logged) continue;
    await client.query(
      'INSERT INTO coin_events (user_id, amount, reason, ref) VALUES ($1, $2, $3, $4)',
      [user.id, c.amount, c.reason, l.id]
    );
  }
  const earned = coins.reduce((s, c) => s + c.amount, 0);
  const { rows: u } = await client.query(
    'UPDATE users SET coins = coins + $2 WHERE id = $1 RETURNING coins',
    [user.id, earned]
  );

  await client.query(
    `UPDATE typing_lesson_attempts
        SET steps = $2, finished_at = now(), wpm = $3, accuracy = $4, stars = $5, coins = $6, flagged = $7
      WHERE id = $1`,
    [a.id, JSON.stringify(a.steps), m.wpm, m.accuracy, stars, earned, flagged]
  );

  // Keyingi dars: shu tranzaksiya ichida yangilangan progress bo'yicha
  const course = await getCourse((t, p) => client.query(t, p), user);
  const next = course.stats.current_lesson_id;
  return {
    lesson_id: l.id,
    kind: l.kind,
    ...m,
    flagged,
    passed: stars > 0,
    stars,
    prev_stars: prevStars,
    coins: coins.map(({ reason, amount }) => ({ reason, amount })),
    coins_earned: earned,
    coins_total: u[0].coins,
    next_lesson_id: next,
    level_unlocked: l.kind === 'exam' && stars > 0 && prevStars === 0 && l.level < LEVELS.length ? l.level + 1 : null,
    course_done: next === null,
    stats: course.stats,
  };
}

/** Profil uchun: coinlar, darslar, yulduzlar, daraja va oxirgi darslar. */
export async function getLessonSummary(run, userId) {
  const [{ rows: p }, { rows: recent }, { rows: u }] = await Promise.all([
    run(
      `SELECT count(*)::int AS done, coalesce(sum(stars), 0)::int AS stars,
              round(max(best_wpm))::int AS best_wpm
         FROM typing_lesson_progress WHERE user_id = $1`,
      [userId]
    ),
    run(
      `SELECT lesson_id, round(wpm)::int AS wpm, round(accuracy)::int AS accuracy, stars, coins, finished_at AS at
         FROM typing_lesson_attempts
        WHERE user_id = $1 AND finished_at IS NOT NULL AND flagged = false
        ORDER BY finished_at DESC LIMIT 5`,
      [userId]
    ),
    run('SELECT coins FROM users WHERE id = $1', [userId]),
  ]);
  const { rows: acc } = await run(
    `SELECT round(avg(accuracy))::int AS avg_accuracy FROM (
       SELECT accuracy FROM typing_lesson_attempts
        WHERE user_id = $1 AND finished_at IS NOT NULL AND flagged = false
        ORDER BY finished_at DESC LIMIT 20) t`,
    [userId]
  );
  const { rows: passed } = await run('SELECT lesson_id FROM typing_lesson_progress WHERE user_id = $1', [userId]);
  const doneIds = new Set(passed.map((r) => r.lesson_id));
  const cur = LESSONS.find((l) => !doneIds.has(l.id));
  return {
    coins: u[0]?.coins ?? 0,
    done: p[0].done,
    total: LESSONS.length,
    stars: p[0].stars,
    max_stars: LESSONS.length * 3,
    level: cur ? cur.level : LEVELS.length,
    levels: LEVELS.length,
    course_done: !cur,
    best_wpm: p[0].best_wpm,
    avg_accuracy: acc[0].avg_accuracy,
    recent: recent.map((r) => {
      const l = LESSON_BY_ID.get(r.lesson_id);
      return { ...r, title: l ? l.title : r.lesson_id, kind: l?.kind ?? 'lesson', level: l?.level ?? null };
    }),
  };
}
