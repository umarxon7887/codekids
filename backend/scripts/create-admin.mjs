/**
 * Admin akkauntini yaratadi yoki mavjud admin parolini yangilaydi.
 * Ro'yxatdan o'tish sahifasi orqali admin bo'lib bo'lmaydi, faqat shu skript bilan.
 *
 * Ishlatish (backend papkasida):
 *   DATABASE_URL="..." node scripts/create-admin.mjs
 * Email, nikneym va parol terminalda so'raladi, parol ekranda ko'rinmaydi.
 */
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { z } from 'zod';

const BCRYPT_ROUNDS = 12; // routes/auth.js dagi bilan bir xil
const MIN_PASSWORD = 12;  // admin uchun oddiy foydalanuvchidan (8) uzunroq

const URL_ = process.env.DATABASE_URL;
if (!URL_) {
  console.error('DATABASE_URL kerak. Masalan: DATABASE_URL="..." node scripts/create-admin.mjs');
  process.exit(1);
}

// Bitta readline: savollar ketma-ket so'raladi; parol yozilayotganda ekranga hech narsa chiqmaydi
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
rl.setPrompt('');
let muted = false;
rl._writeToOutput = (s) => { if (!muted) rl.output.write(s); };
const lines = rl[Symbol.asyncIterator]();
async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden;
  const { value = '' } = await lines.next();
  if (hidden) { muted = false; process.stdout.write('\n'); }
  return value.trim();
}
const fail = (msg) => { console.error(msg); rl.close(); process.exit(1); };

const host = (() => { try { return new URL(URL_).hostname; } catch { return '?'; } })();
console.log(`Baza: ${host}`);
if ((await ask("Shu bazada davom etamizmi? (ha/yo'q): ")).toLowerCase() !== 'ha') fail("To'xtatildi.");

const email = z.string().trim().toLowerCase().email().max(254).safeParse(await ask('Admin email: '));
if (!email.success) fail("Email noto'g'ri.");

async function askPassword() {
  const p1 = await ask(`Parol (kamida ${MIN_PASSWORD} belgi): `, { hidden: true });
  if (p1.length < MIN_PASSWORD || p1.length > 72) fail(`Parol ${MIN_PASSWORD}–72 belgi bo'lishi kerak.`);
  const p2 = await ask('Parolni qayta kiriting: ', { hidden: true });
  if (p1 !== p2) fail('Parollar bir xil emas.');
  return bcrypt.hash(p1, BCRYPT_ROUNDS);
}

const client = new pg.Client({ connectionString: URL_ });
await client.connect();
try {
  const { rows } = await client.query('SELECT id, role FROM users WHERE email = $1', [email.data]);
  const existing = rows[0];
  if (existing && existing.role !== 'admin') {
    fail(`Bu email bilan "${existing.role}" akkaunti bor. Admin uchun alohida email ishlating.`);
  }
  if (existing) {
    if ((await ask("Bu admin allaqachon bor. Parolini yangilaymizmi? (ha/yo'q): ")).toLowerCase() !== 'ha') fail("To'xtatildi.");
    const hash = await askPassword();
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [existing.id, hash]);
    // Eski parol bilan ochilgan barcha sessiyalar yopiladi
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [existing.id]);
    await client.query('COMMIT');
    console.log(`Admin paroli yangilandi: ${email.data}. Boshqa qurilmalardagi sessiyalar yopildi.`);
  } else {
    const nick = z.string().trim().min(2).max(40).safeParse((await ask('Nikneym (masalan, Admin): ')) || 'Admin');
    if (!nick.success) fail("Nikneym 2–40 belgi bo'lishi kerak.");
    const hash = await askPassword();
    await client.query(
      "INSERT INTO users (email, password_hash, role, nickname) VALUES ($1, $2, 'admin', $3)",
      [email.data, hash, nick.data]
    );
    console.log(`Admin yaratildi: ${email.data}. Saytga shu email va parol bilan kiring.`);
  }
} catch (e) {
  try { await client.query('ROLLBACK'); } catch { /* tranzaksiya ochilmagan bo'lishi mumkin */ }
  fail(`Xato: ${e.message}`);
} finally {
  await client.end();
  rl.close();
}
