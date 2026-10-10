-- =====================================================================
-- CodeKids - PostgreSQL schema (Neon)
-- Tartib: kengaytmalar -> enum'lar -> jadvallar -> indexlar -> trigger
-- Fayl qayta ishga tushirilsa ham xavfsiz (IF NOT EXISTS / DO bloklari).
-- =====================================================================

-- ---------- Kengaytmalar ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- qidiruv uchun trigram indexlar
CREATE EXTENSION IF NOT EXISTS citext;     -- registratsiyada katta/kichik harf farqsiz email

-- ---------- Enum turlar ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('questions', 'typing_text');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE game_type AS ENUM ('typing', 'labyrinth');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE room_status AS ENUM ('waiting', 'active', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- Foydalanuvchilar ----------
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL,
  nickname       VARCHAR(40) NOT NULL,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_nickname_len CHECK (char_length(nickname) >= 2)
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name         VARCHAR(120) NOT NULL,
  school            VARCHAR(200),
  subjects          TEXT[] NOT NULL DEFAULT '{}',
  experience_years  SMALLINT CHECK (experience_years BETWEEN 0 AND 70),
  age_group         VARCHAR(20),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Kontent ----------
CREATE TABLE IF NOT EXISTS contents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           content_type NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  topic          VARCHAR(100),
  level          SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  data           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published   BOOLEAN NOT NULL DEFAULT false,
  likes_count    INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  plays_count    INTEGER NOT NULL DEFAULT 0 CHECK (plays_count >= 0),
  deleted_at     TIMESTAMPTZ,              -- soft delete
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id  UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT likes_user_content_uq UNIQUE (user_id, content_id)
);

-- ---------- Typing o'yini ----------
-- Server har bir o'yin boshida session yaratadi. Natija faqat shu session
-- orqali yoziladi, bir session bir marta ishlatiladi (anti-replay).
CREATE TABLE IF NOT EXISTS typing_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id   UUID REFERENCES contents(id) ON DELETE SET NULL,
  game_mode    VARCHAR(20) NOT NULL CHECK (game_mode IN ('solo', 'race')),
  language     VARCHAR(5) NOT NULL,
  level        SMALLINT CHECK (level BETWEEN 1 AND 4),
  target_text  TEXT NOT NULL,                -- server qaysi matnni berganini eslab qoladi
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,         -- juda uzoq o'ynalgan session'ni rad etish uchun
  consumed_at  TIMESTAMPTZ                   -- natija yuborilgach to'ldiriladi
);

CREATE TABLE IF NOT EXISTS typing_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id   UUID NOT NULL UNIQUE REFERENCES typing_sessions(id) ON DELETE CASCADE,
  content_id   UUID REFERENCES contents(id) ON DELETE SET NULL,
  room_id      UUID,                         -- game_rooms ga FK, pastda qo'shiladi
  game_mode    VARCHAR(20) NOT NULL CHECK (game_mode IN ('solo', 'race')),
  language     VARCHAR(5) NOT NULL,
  level        SMALLINT CHECK (level BETWEEN 1 AND 4),
  wpm          NUMERIC(6, 2) NOT NULL CHECK (wpm >= 0),
  accuracy     NUMERIC(5, 2) NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  time_sec     INTEGER NOT NULL CHECK (time_sec >= 0),
  text_length  INTEGER NOT NULL CHECK (text_length >= 0),
  place        SMALLINT CHECK (place >= 1),
  flagged      BOOLEAN NOT NULL DEFAULT false,   -- WPM > 150 bo'lsa true
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- O'yin xonalari (typing + labyrinth birlashgan) ----------
CREATE TABLE IF NOT EXISTS game_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code             VARCHAR(8) NOT NULL UNIQUE,
  game_type        game_type NOT NULL,
  content_id       UUID REFERENCES contents(id) ON DELETE SET NULL,
  topic            VARCHAR(100),
  level            SMALLINT CHECK (level BETWEEN 1 AND 4),
  status           room_status NOT NULL DEFAULT 'waiting',
  max_players      SMALLINT NOT NULL DEFAULT 30 CHECK (max_players BETWEEN 2 AND 100),
  duration_minutes SMALLINT CHECK (duration_minutes BETWEEN 1 AND 120),
  -- O'yinga xos ma'lumot: labyrinth uchun {"labyrinth_seed": 123456, "rows": 15, "cols": 15},
  -- typing uchun esa qo'shimcha sozlamalar. Har bir o'yin o'z kalitlarini biladi.
  settings         JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT game_rooms_code_fmt CHECK (code ~ '^[A-Z0-9]{4,8}$')
);

-- typing_results.room_id uchun FK (game_rooms yaratilgandan keyin)
DO $$ BEGIN
  ALTER TABLE typing_results
    ADD CONSTRAINT typing_results_room_fk
    FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- O'yinchilar. Ro'yxatdan o'tgan foydalanuvchi user_id bilan,
-- mehmon esa faqat device_id bilan kiradi. Ikkalasidan aynan bittasi bo'lishi shart.
CREATE TABLE IF NOT EXISTS game_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id   VARCHAR(64),
  nickname    VARCHAR(40) NOT NULL,
  score       INTEGER NOT NULL DEFAULT 0,
  correct     INTEGER NOT NULL DEFAULT 0 CHECK (correct >= 0),
  lives       SMALLINT CHECK (lives >= 0),           -- labyrinth
  position_x  SMALLINT CHECK (position_x >= 0),      -- labyrinth
  position_y  SMALLINT CHECK (position_y >= 0),      -- labyrinth
  powerups    JSONB NOT NULL DEFAULT '[]'::jsonb,    -- labyrinth
  finished    BOOLEAN NOT NULL DEFAULT false,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT game_players_one_identity CHECK ((user_id IS NULL) <> (device_id IS NULL))
);

-- ---------- Sinflar (o'qituvchi uchun) ----------
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_students (
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

-- ---------- Refresh tokenlar (rotation + family) ----------
-- Bazada token'ning o'zi emas, faqat SHA-256 hash'i saqlanadi.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL,                       -- bir login zanjiri
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- INDEXLAR
-- =====================================================================

-- Kontent: lenta va filtr
CREATE INDEX IF NOT EXISTS contents_author_idx
  ON contents (author_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS contents_feed_idx
  ON contents (is_published, topic, level, created_at DESC)
  WHERE deleted_at IS NULL;

-- Kontent: qidiruv (pg_trgm, ILIKE va % operatorlari uchun)
CREATE INDEX IF NOT EXISTS contents_title_trgm_idx
  ON contents USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contents_description_trgm_idx
  ON contents USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS likes_content_idx ON likes (content_id);

-- Typing
CREATE INDEX IF NOT EXISTS typing_sessions_user_idx ON typing_sessions (user_id);

CREATE INDEX IF NOT EXISTS typing_results_user_idx
  ON typing_results (user_id, created_at DESC);

-- Leaderboard: faqat tekshirilgan (flagged emas) natijalar
CREATE INDEX IF NOT EXISTS typing_results_leaderboard_idx
  ON typing_results (game_mode, language, wpm DESC)
  WHERE flagged = false;

CREATE INDEX IF NOT EXISTS typing_results_content_idx ON typing_results (content_id);
CREATE INDEX IF NOT EXISTS typing_results_room_idx    ON typing_results (room_id);

-- O'yin xonalari
CREATE INDEX IF NOT EXISTS game_rooms_host_idx
  ON game_rooms (host_id);

CREATE INDEX IF NOT EXISTS game_rooms_status_expires_idx
  ON game_rooms (status, expires_at);

-- O'yinchilar: bitta xonada bir foydalanuvchi bir marta
CREATE UNIQUE INDEX IF NOT EXISTS game_players_room_user_uq
  ON game_players (room_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_players_room_device_uq
  ON game_players (room_id, device_id) WHERE device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS game_players_user_idx
  ON game_players (user_id) WHERE user_id IS NOT NULL;

-- Sinflar
CREATE INDEX IF NOT EXISTS classes_teacher_idx ON classes (teacher_id);
CREATE INDEX IF NOT EXISTS class_students_student_idx ON class_students (student_id);

-- Refresh tokenlar
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx  ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON refresh_tokens (expires_at);

-- =====================================================================
-- updated_at avtomatik yangilanishi
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'teacher_profiles', 'contents', 'classes']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t
    );
  END LOOP;
END $$;
-- Labirint: qayta ulanish uchun o'yinchi holati (tozalangan checkpoint'lar, kutilayotgan savol)
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS state JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Typing: sessiyani xonaga bog'lash (sinf analitikasi uchun)
ALTER TABLE typing_sessions ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES game_rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS typing_sessions_room_idx ON typing_sessions (room_id);

-- Xona boshqaruvi: chiqarilgan o'yinchi va typing o'rni
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS kicked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS rank SMALLINT;

-- Typing matnlari tili (uz/ru). Mavjud matnlar sarlavhasiga qarab to'ldiriladi.
ALTER TABLE contents ADD COLUMN IF NOT EXISTS language VARCHAR(5);
UPDATE contents SET language = CASE WHEN title LIKE '%(RU)%' THEN 'ru' ELSE 'uz' END
 WHERE type = 'typing_text' AND language IS NULL;
