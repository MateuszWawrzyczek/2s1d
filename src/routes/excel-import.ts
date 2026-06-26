import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import Papa from 'papaparse';
import readXlsxFile, { type SheetData } from 'read-excel-file/web-worker';
import { items } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { badRequest, forbidden } from '../lib/errors';
import { createAuditLog } from '../lib/audit';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
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
  if (data.length < 2)
    badRequest('XLSX must contain a header and at least one data row');
  const headers = data[0].map((value) => formatCellValue(value).trim());
  if (
    headers.some((header) => header.length === 0) ||
    new Set(headers).size !== headers.length
  ) {
    badRequest('XLSX headers must be non-empty and unique');
  }
  return data
    .slice(1)
    .map((cells) =>
      Object.fromEntries(
        headers.map((header, index) => [header, formatCellValue(cells[index])])
      )
    );
}

// POST /api/v1/excel/upload — frontend sends multipart FormData with "file"
router.post('/upload', async (c) => {
  if (c.get('userRole') !== 'admin') {
    forbidden('Only admins can import data');
  }
  const db = c.get('db');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) badRequest('No file uploaded');
  if (file.size === 0 || file.size > MAX_IMPORT_BYTES)
    badRequest('Import file must be between 1 byte and 5 MB');

  const mappingRaw = formData.get('column_mapping');

  let columnMapping: Record<string, string> = {};
  try {
    const parsed: unknown = mappingRaw ? JSON.parse(String(mappingRaw)) : {};
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      badRequest('column_mapping must be an object');
    columnMapping = parsed as Record<string, string>;
  } catch {
    badRequest('column_mapping must be valid JSON');
  }
  if (Object.keys(columnMapping).some((field) => !IMPORT_FIELDS.has(field)))
    badRequest('column_mapping contains an unsupported field');
  if (
    Object.values(columnMapping).some(
      (column) =>
        typeof column !== 'string' || column.length === 0 || column.length > 255
    )
  ) {
    badRequest('column_mapping values must be non-empty column names');
  }

  let rows: Record<string, string>[] = [];

  try {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx')) {
      const sheets = await readXlsxFile(await file.arrayBuffer());
      if (!sheets[0]) badRequest('Import file does not contain a worksheet');
      rows = sheetToRecords(sheets[0].data);
    } else if (lowerName.endsWith('.csv') || file.type === 'text/csv') {
      const result = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
      });
      if (result.errors.length > 0) {
        badRequest(`Invalid CSV at row ${result.errors[0].row ?? 1}`);
      }
      rows = result.data;
    } else {
      badRequest('Only XLSX and CSV files are supported');
    }
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    badRequest('Import file is not a valid XLSX or CSV document');
  }
  if (rows.length === 0)
    badRequest('Import file must contain at least one data row');
  if (rows.length > MAX_IMPORT_ROWS)
    badRequest(`Import file cannot contain more than ${MAX_IMPORT_ROWS} rows`);

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

    if (!name) {
      errors.push({
        row_number: i + 1,
        error_message: `Row ${i + 1}: name is required`,
      });
      continue;
    }

    try {
      const categoryId = row.category_id ? Number(row.category_id) : null;

      const statusId = row.status_id ? Number(row.status_id) : null;

      const locationId = row.location_id ? Number(row.location_id) : null;

      const ownerId = row.owner_id ? Number(row.owner_id) : null;
      if (!ownerId || !Number.isInteger(ownerId) || ownerId <= 0) {
        errors.push({
          row_number: i + 1,
          error_message: `Row ${i + 1}: owner_id is required`,
        });
        continue;
      }

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
          source: file.name.endsWith('.xlsx') ? 'xlsx_import' : 'csv_import',
        },
      });

      successful++;
    } catch {
      errors.push({
        row_number: i + 1,
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
