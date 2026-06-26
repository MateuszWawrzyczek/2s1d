import mysql from 'mysql2/promise';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-ąćęłńóśźż-]/g, '');
}

async function importData() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'pz_user',
    password: process.env.MYSQL_PASSWORD ?? 'pz_pass',
    database: process.env.MYSQL_DATABASE ?? 'pz_db',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  // Check for reference tables
  const [tables] = await conn.query("SHOW TABLES LIKE 'inv_urzadzenia'");
  if (Array.isArray(tables) && tables.length === 0) {
    console.log('⚠️  Reference tables not found. Skipping.');
    await conn.end();
    return;
  }

  // 1. Statuses
  console.log('🔄 Item statuses...');
  const statuses: [string, string, boolean][] = [
    ['Dostępny', 'dostepny', true],
    ['W użyciu', 'w-uzyciu', true],
    ['W naprawie', 'w-naprawie', true],
    ['Uszkodzony', 'uszkodzony', true],
    ['Wypożyczony', 'wypozyczony', true],
    ['Zarezerwowany', 'zarezerwowany', true],
    ['Zarchiwizowany', 'zarchiwizowany', true],
    ['Oczekuje zatwierdzenia', 'oczekuje-zatwierdzenia', true],
  ];
  for (const [name, slug, isSys] of statuses) {
    await conn.execute(
      `INSERT INTO item_status (name, slug, is_system) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [name, slug, isSys]
    );
  }

  // 2. Categories from inv_typy_urz
  console.log('🔄 Categories...');
  await conn.execute(
    `INSERT INTO categories (name, legacy_type_id)
     SELECT t.nazwa, t.id FROM inv_typy_urz t
     WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.legacy_type_id = t.id)`
  );

  // 3. Locations from inv_budynki + inv_pokoje
  console.log('🔄 Locations...');
  await conn.execute(
    `INSERT INTO locations (name, kind, building, room, notes, legacy_room_id)
     SELECT CONCAT(b.nazwa,' ',p.nazwa), 'internal', b.nazwa, p.nazwa, p.opis, p.id
     FROM inv_pokoje p JOIN inv_budynki b ON b.id=p.id_budynku
     WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.legacy_room_id=p.id)`
  );

  // 4. Lookup maps
  console.log('🔄 Lookups...');
  const [typeRows] = (await conn.query(
    'SELECT id, legacy_type_id FROM categories WHERE legacy_type_id IS NOT NULL'
  )) as any;
  const typeMap = new Map<number, number>();
  for (const r of typeRows) typeMap.set(r.legacy_type_id, r.id);

  const [locRows] = (await conn.query(
    'SELECT id, legacy_room_id FROM locations WHERE legacy_room_id IS NOT NULL'
  )) as any;
  const locMap = new Map<number, number>();
  for (const r of locRows) locMap.set(r.legacy_room_id, r.id);

  const [statusRows] = (await conn.query(
    'SELECT id, slug FROM item_status'
  )) as any;
  const statusBySlug = new Map<string, number>();
  for (const r of statusRows) statusBySlug.set(r.slug, r.id);

  const [prodRows] = (await conn.query(
    'SELECT id, nazwa FROM inv_producenci'
  )) as any;
  const prodMap = new Map<number, string>();
  for (const r of prodRows) prodMap.set(r.id, r.nazwa);

  // 5. Items from inv_urzadzenia (owner_id = NULL since no matching users)
  console.log('🔄 Items from inv_urzadzenia...');
  const [devices] = (await conn.query(`
    SELECT d.id, d.id_pokoju, d.id_modelu, d.serial, d.nr_inw, d.opis, d.wypozyczony,
           m.nazwa AS model_name, m.id_typu, m.id_producenta, m.opis AS model_opis
    FROM inv_urzadzenia d LEFT JOIN inv_modele m ON m.id=d.id_modelu ORDER BY d.id
  `)) as any;

  let imported = 0,
    skipped = 0,
    borrowed = 0;
  for (const d of devices) {
    const catId = typeMap.get(d.id_typu) ?? null;
    const locId = locMap.get(d.id_pokoju) ?? null;
    const manufacturer = prodMap.get(d.id_producenta) ?? null;
    const statusSlug = d.wypozyczony ? 'wypozyczony' : 'dostepny';
    const statId = statusBySlug.get(statusSlug) ?? null;
    if (d.wypozyczony) borrowed++;

    const name = d.model_name || d.serial || `Urządzenie #${d.id}`;
    const desc = [d.opis, d.model_opis].filter(Boolean).join('\n') || null;

    try {
      const [existing] = await conn.execute(
        'SELECT id FROM items WHERE legacy_item_id=?',
        [d.id]
      );
      if (Array.isArray(existing) && (existing as any[]).length > 0) {
        await conn.execute(
          `UPDATE items SET serial=?, inventory_number=?, description=?, name=?, manufacturer=?, model=?,
           category_id=?, status_id=?, location_id=?, owner_id=NULL WHERE legacy_item_id=?`,
          [
            d.serial || null,
            d.nr_inw || null,
            desc,
            name,
            manufacturer,
            d.model_name,
            catId,
            statId,
            locId,
            d.id,
          ]
        );
      } else {
        await conn.execute(
          `INSERT INTO items (name,manufacturer,model,serial,inventory_number,description,
            category_id,status_id,location_id,legacy_item_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            name,
            manufacturer,
            d.model_name,
            d.serial || null,
            d.nr_inw || null,
            desc,
            catId,
            statId,
            locId,
            d.id,
          ]
        );
      }
      imported++;
    } catch (e: any) {
      console.error(`  ⚠️ #${d.id}: ${e.message?.slice(0, 80)}`);
      skipped++;
    }
  }

  console.log(
    `✅ Done: ${imported} items (${skipped} errs), ${borrowed} borrowed, ${typeMap.size} types, ${locMap.size} rooms`
  );
  await conn.end();
}

importData().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
