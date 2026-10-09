import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '..', 'schema.sql');

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL topilmadi. .env faylini tekshiring.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await client.connect();
  // Bir nechta SQL buyruq bitta matn sifatida yuboriladi (parametrsiz query)
  await client.query(sql);

  const { rows } = await client.query(`
    SELECT table_name
      FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name
  `);

  console.log(`Schema muvaffaqiyatli yuklandi. Jadvallar (${rows.length}):`);
  for (const r of rows) console.log(`  - ${r.table_name}`);
} catch (err) {
  console.error('Migratsiya xatosi:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}