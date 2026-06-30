import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import Papa from 'papaparse';
import { readSheet, type SheetData } from 'read-excel-file/node';
import { categories, itemStatus, items, locations, users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { badRequest, forbidden } from '../lib/errors';
import { createAuditLog } from '../lib/audit';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const IMPORT_FIELDS = new Set([
  'name',
  'manufacturer',
  'description',
  'purchase_date',
  'category_id',
  'status_id',
  'location_id',
  'owner_id',
]);

function formatCellValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === null || value === undefined) return '';
  return String(value);
}

function sheetToRecords(data: SheetData): Record<string, string>[] {
  if (data.length < 2) {
    badRequest('XLSX musi zawierać nagłówek i co najmniej jeden wiersz danych');
  }

  const headers = data[0].map((value) => formatCellValue(value).trim());
  if (
    headers.some((header) => header.length === 0) ||
    new Set(headers).size !== headers.length
  ) {
    badRequest('Nagłówki XLSX muszą być niepuste i unikalne');
  }

  return data
    .slice(1)
    .map((cells) =>
      Object.fromEntries(
        headers.map((header, index) => [header, formatCellValue(cells[index])])
      )
    );
}

function parseOptionalPositiveInt(
  value: unknown,
  fieldName: string,
  rowNumber: number
): number | null {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    badRequest(
      `Wiersz ${rowNumber}: ${fieldName} musi być dodatnią liczbą całkowitą`
    );
  }
  return parsed;
}

async function ensureReferenceExists(
  db: MySql2Database<Record<string, never>>,
  table:
    | typeof users
    | typeof categories
    | typeof itemStatus
    | typeof locations,
  id: number | null,
  fieldName: string,
  rowNumber: number
): Promise<void> {
  if (id === null) return;
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (rows.length === 0) {
    badRequest(`Wiersz ${rowNumber}: ${fieldName}=${id} nie istnieje`);
  }
}

router.post('/upload', async (c) => {
  if (c.get('userRole') !== 'admin') {
    forbidden('Tylko administrator może importować dane');
  }

  const db = c.get('db');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) badRequest('Nie przesłano pliku');
  if (file.size === 0 || file.size > MAX_IMPORT_BYTES) {
    badRequest('Plik importu musi mieć od 1 bajta do 5 MB');
  }

  const mappingRaw = formData.get('column_mapping');
  let columnMapping: Record<string, string> = {};

  try {
    const parsed: unknown = mappingRaw ? JSON.parse(String(mappingRaw)) : {};
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      badRequest('Mapowanie kolumn musi być obiektem JSON');
    }
    columnMapping = parsed as Record<string, string>;
  } catch {
    badRequest('Mapowanie kolumn musi być poprawnym JSON-em');
  }

  if (Object.keys(columnMapping).some((field) => !IMPORT_FIELDS.has(field))) {
    badRequest('Mapowanie kolumn zawiera nieobsługiwane pole');
  }

  if (
    Object.values(columnMapping).some(
      (column) =>
        typeof column !== 'string' || column.length === 0 || column.length > 255
    )
  ) {
    badRequest('Mapowanie kolumn musi wskazywać niepuste nazwy kolumn');
  }

  let rows: Record<string, string>[] = [];

  try {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx')) {
      const data = await readSheet(Buffer.from(await file.arrayBuffer()));
      rows = sheetToRecords(data);
    } else if (lowerName.endsWith('.csv') || file.type === 'text/csv') {
      const result = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
      });
      if (result.errors.length > 0) {
        badRequest(`Niepoprawny CSV w wierszu ${result.errors[0].row ?? 1}`);
      }
      rows = result.data;
    } else {
      badRequest('Obsługiwane są tylko pliki XLSX i CSV');
    }
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    badRequest('Plik importu nie jest poprawnym dokumentem XLSX lub CSV');
  }

  if (rows.length === 0) {
    badRequest('Plik importu musi zawierać co najmniej jeden wiersz danych');
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    badRequest(
      `Plik importu nie może zawierać więcej niż ${MAX_IMPORT_ROWS} wierszy`
    );
  }

  const errors: { row_number: number; error_message: string }[] = [];
  let successful = 0;
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row: Record<string, unknown> = {};

    for (const [field, columnName] of Object.entries(columnMapping)) {
      row[field] = rawRow[columnName as keyof typeof rawRow];
    }

    const name = String(row.name ?? '').trim();
    const rowNumber = i + 2;

    if (!name) {
      errors.push({
        row_number: rowNumber,
        error_message: `Wiersz ${rowNumber}: nazwa jest wymagana`,
      });
      continue;
    }

    try {
      const categoryId = parseOptionalPositiveInt(
        row.category_id,
        'category_id',
        rowNumber
      );
      const statusId = parseOptionalPositiveInt(
        row.status_id,
        'status_id',
        rowNumber
      );
      const locationId = parseOptionalPositiveInt(
        row.location_id,
        'location_id',
        rowNumber
      );
      const ownerId = parseOptionalPositiveInt(
        row.owner_id,
        'owner_id',
        rowNumber
      );

      if (!ownerId) {
        errors.push({
          row_number: rowNumber,
          error_message: `Wiersz ${rowNumber}: owner_id jest wymagane`,
        });
        continue;
      }
      await ensureReferenceExists(db, users, ownerId, 'owner_id', rowNumber);
      await ensureReferenceExists(
        db,
        categories,
        categoryId,
        'category_id',
        rowNumber
      );
      await ensureReferenceExists(
        db,
        itemStatus,
        statusId,
        'status_id',
        rowNumber
      );
      await ensureReferenceExists(
        db,
        locations,
        locationId,
        'location_id',
        rowNumber
      );

      const vals: Record<string, unknown> = {
        name,
        manufacturer: row.manufacturer || null,
        description: row.description || null,
        addedAt: sql`NOW()`,
        categoryId,
        statusId,
        locationId,
        ownerId,
      };

      if (row.purchase_date) {
        vals.purchaseDate = row.purchase_date;
      }

      const result = await db
        .insert(items)
        .values(vals as typeof items.$inferInsert);
      const insertedId = result[0].insertId;

      await db
        .update(items)
        .set({ systemId: `INV-${String(insertedId).padStart(6, '0')}` })
        .where(eq(items.id, insertedId));

      await createAuditLog(db, {
        userId: c.get('userId'),
        itemId: insertedId,
        action: 'ITEM_IMPORTED',
        newValue: {
          name,
          source: file.name.toLowerCase().endsWith('.xlsx')
            ? 'xlsx_import'
            : 'csv_import',
        },
      });

      successful++;
    } catch (error) {
      if (error instanceof HTTPException) {
        errors.push({
          row_number: rowNumber,
          error_message: error.message,
        });
        continue;
      }
      errors.push({
        row_number: rowNumber,
        error_message: 'Nie można zaimportować tego wiersza',
      });
    }
  }

  return c.json({
    total_rows_processed: total,
    successful_rows: successful,
    errors,
  });
});

export { router as excelImportRouter };
