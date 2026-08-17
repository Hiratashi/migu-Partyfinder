import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();
  for (const filename of files) {
    const exists = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
    if (exists.rowCount) continue;
    const sql = await fs.readFile(path.join(dir, filename), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1) ON CONFLICT DO NOTHING', [filename]);
      await client.query('COMMIT');
      console.log(`Applied ${filename}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
} finally {
  await client.end();
}
