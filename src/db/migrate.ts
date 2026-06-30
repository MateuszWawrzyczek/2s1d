import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'mysql2/promise';

const MIGRATIONS_TABLE = '__drizzle_migrations';

interface MigrationRecord {
  idx: number;
  version: string;
  created_at: string;
}

const SYSTEM_STATUSES = [
  { name: 'Dostępny', is_system: true, slug: 'dostepny' },
  { name: 'W użyciu', is_system: true, slug: 'w-uzyciu' },
  { name: 'W naprawie', is_system: true, slug: 'w-naprawie' },
  { name: 'Uszkodzony', is_system: true, slug: 'uszkodzony' },
  { name: 'Wypożyczony', is_system: true, slug: 'wypozyczony' },
  { name: 'Zarezerwowany', is_system: true, slug: 'zarezerwowany' },
  { name: 'Zarchiwizowany', is_system: true, slug: 'zarchiwizowany' },
  {
    name: 'Oczekuje zatwierdzenia',
    is_system: true,
    slug: 'oczekuje-zatwierdzenia',
  },
];

const DEFAULT_LOCATIONS = [
  {
    name: 'Magazyn główny',
    kind: 'internal',
    building: 'Budynek A',
    room: '001',
  },
  {
    name: 'Sala 101',
    kind: 'internal',
    building: 'Budynek A',
    room: '101',
  },
  {
    name: 'Laboratorium',
    kind: 'internal',
    building: 'Budynek B',
    room: '203',
  },
  {
    name: 'Biuro',
    kind: 'internal',
    building: 'Budynek A',
    room: '305',
  },
];

/**
 * Run Drizzle SQL migrations and seed default data.
 *
 * Reads `.sql` files from `migrationsDir`, tracks applied migrations in a
 * `__drizzle_migrations` table, and inserts default statuses / locations
 * if the tables are empty.
 */
export async function runMigrations(
  pool: Pool,
  migrationsDir: string
): Promise<void> {
  // 1. Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      \`idx\` int NOT NULL,
      \`version\` varchar(255) NOT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`idx\`),
      UNIQUE KEY \`version\` (\`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 2. Read migration files
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) return;

  // 3. Get already-applied migrations
  const [applied] = await pool.query(
    `SELECT idx, version FROM \`${MIGRATIONS_TABLE}\` ORDER BY idx`
  );
  const appliedSet = new Set(
    (applied as MigrationRecord[]).map((r) => r.version)
  );

  // 4. Apply pending migrations
  for (let i = 0; i < files.length; i++) {
    const version = files[i].replace(/\.sql$/, '');
    if (appliedSet.has(version)) continue;

    const sql = await readFile(join(migrationsDir, files[i]), 'utf-8');
    // Split on statement-breakpoint (drizzle-kit convention) or semicolons
    const statements = sql
      .split(/--> statement-breakpoint|;\s*(?=\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query(
        `INSERT INTO \`${MIGRATIONS_TABLE}\` (idx, version) VALUES (?, ?)`,
        [i, version]
      );
      await conn.commit();

      console.log(`[migrate] applied ${files[i]}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // 5. Seed default data (idempotent)
  await seedDefaults(pool);
}

async function seedDefaults(pool: Pool): Promise<void> {
  // Seed system statuses if table is empty
  const [statusRows] = await pool.query(
    'SELECT COUNT(*) as cnt FROM `item_status`'
  );
  const statusCount = (statusRows as { cnt: number }[])[0].cnt;
  if (statusCount === 0) {
    for (const s of SYSTEM_STATUSES) {
      await pool.query(
        'INSERT INTO `item_status` (name, is_system, slug) VALUES (?, ?, ?)',
        [s.name, s.is_system, s.slug]
      );
    }

    console.log('[seed] inserted default item statuses');
  }

  // Seed default locations if table is empty
  const [locRows] = await pool.query('SELECT COUNT(*) as cnt FROM `locations`');
  const locCount = (locRows as { cnt: number }[])[0].cnt;
  if (locCount === 0) {
    for (const loc of DEFAULT_LOCATIONS) {
      await pool.query(
        'INSERT INTO `locations` (name, kind, building, room) VALUES (?, ?, ?, ?)',
        [loc.name, loc.kind, loc.building, loc.room]
      );
    }

    console.log('[seed] inserted default locations');
  }
}
