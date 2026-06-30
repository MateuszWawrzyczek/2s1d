import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, like, or, and, desc, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { borrowings, itemPhotos, items, type Item } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest, forbidden } from '../lib/errors';
import { canUpdateItemField, getItemPermissionLevel } from '../lib/permissions';
import { createAuditLog } from '../lib/audit';
import { createObjectStorage } from '../lib/storage';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional().default(''),
  model: z.string().max(100).optional(),
  serial: z.string().max(100).optional(),
  inventoryNumber: z.string().max(100).optional(),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  systemId: z.string().max(32).optional(),
  categoryId: z.number().int().positive().optional(),
  statusId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional().nullable(),
  ownerGroupId: z.number().int().positive().optional().nullable(),
});

const updateSchema = createSchema.partial();

function toResponse(item: Item) {
  return {
    id: item.id,
    systemId: item.systemId,
    name: item.name,
    manufacturer: item.manufacturer,
    model: item.model,
    serial: item.serial,
    inventoryNumber: item.inventoryNumber,
    description: item.description,
    purchaseDate: item.purchaseDate,
    addedAt: item.addedAt,
    categoryId: item.categoryId,
    statusId: item.statusId,
    locationId: item.locationId,
    ownerId: item.ownerId,
    ownerGroupId: item.ownerGroupId,
    legacyItemId: item.legacyItemId,
  };
}

router.get('/', async (c) => {
  const db = c.get('db');
  const search = c.req.query('search');
  const statusId = c.req.query('statusId');
  const locationId = c.req.query('locationId');
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(items.name, `%${search}%`),
        like(items.manufacturer, `%${search}%`),
        like(items.model, `%${search}%`),
        like(items.serial, `%${search}%`),
        like(items.inventoryNumber, `%${search}%`),
        like(items.systemId, `%${search}%`)
      )
    );
  }
  if (statusId) conditions.push(eq(items.statusId, Number(statusId)));
  if (locationId) conditions.push(eq(items.locationId, Number(locationId)));
  const rows = await db
    .select()
    .from(items)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(items.id));
  return c.json(rows.map(toResponse));
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const rows = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (rows.length === 0) notFound('Przedmiot nie istnieje');
  return c.json(toResponse(rows[0]));
});

router.post('/', zValidator('json', createSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  if (!body.name.trim()) badRequest('Nazwa przedmiotu jest wymagana.');

  // Mutual exclusivity of ownerId and ownerGroupId
  if (body.ownerId != null && body.ownerGroupId != null) {
    badRequest(
      'Można przypisać tylko osobę lub grupę jako opiekuna, nie oba jednocześnie.'
    );
  }

  // At least one of ownerId or ownerGroupId must be provided (non-null)
  if (body.ownerId == null && body.ownerGroupId == null) {
    badRequest('Przedmiot musi mieć przypisanego opiekuna (osobę lub grupę).');
  }

  const insertValues: Record<string, unknown> = {
    name: body.name,
    manufacturer: body.manufacturer || null,
    model: body.model ?? null,
    serial: body.serial ?? null,
    inventoryNumber: body.inventoryNumber ?? null,
    description: body.description ?? null,
    addedAt: sql`NOW()`,
    categoryId: body.categoryId ?? null,
    statusId: body.statusId ?? null,
    locationId: body.locationId ?? null,
    ownerId: body.ownerId ?? null,
    ownerGroupId: body.ownerGroupId ?? null,
  };
  if (body.systemId) insertValues.systemId = body.systemId;
  if (body.purchaseDate) insertValues.purchaseDate = body.purchaseDate;

  const result = await db
    .insert(items)
    .values(insertValues as typeof items.$inferInsert);
  const insertedId = result[0].insertId;

  if (!body.systemId) {
    const generatedSystemId = `INV-${String(insertedId).padStart(6, '0')}`;
    await db
      .update(items)
      .set({ systemId: generatedSystemId })
      .where(eq(items.id, insertedId));
  }

  const created = await db
    .select()
    .from(items)
    .where(eq(items.id, insertedId))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: insertedId,
    action: 'ITEM_CREATED',
    newValue: created[0],
  });

  return c.json(toResponse(created[0]), 201);
});

router.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(items)
    .where(eq(items.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Przedmiot nie istnieje');

  const item = existing[0];
  const permission = await getItemPermissionLevel(
    db,
    id,
    c.get('userId'),
    c.get('userRole'),
    item.ownerId,
    item.ownerGroupId
  );
  if (!permission) forbidden('Brak uprawnień do edycji tego przedmiotu');

  const body = c.req.valid('json');

  // Mutual exclusivity
  if (body.ownerId != null && body.ownerGroupId != null) {
    badRequest(
      'Można przypisać tylko osobę lub grupę jako opiekuna, nie oba jednocześnie.'
    );
  }

  const updateData: Record<string, unknown> = {};
  for (const key of Object.keys(body) as (keyof typeof body)[]) {
    const value = body[key];
    if (canUpdateItemField(permission, key) && value !== undefined) {
      updateData[key] = value;
    }
  }

  const newOwnerId = Object.hasOwn(updateData, 'ownerId')
    ? updateData.ownerId
    : item.ownerId;
  const newOwnerGroupId = Object.hasOwn(updateData, 'ownerGroupId')
    ? updateData.ownerGroupId
    : item.ownerGroupId;
  if (newOwnerId == null && newOwnerGroupId == null) {
    badRequest('Przedmiot musi mieć przypisanego opiekuna (osobę lub grupę).');
  }
  if (newOwnerId != null && newOwnerGroupId != null) {
    badRequest(
      'Można przypisać tylko osobę lub grupę jako opiekuna, nie oba jednocześnie.'
    );
  }

  if (Object.keys(updateData).length === 0)
    badRequest('Brak pól do aktualizacji');

  await db.update(items).set(updateData).where(eq(items.id, id));
  const updated = await db
    .select()
    .from(items)
    .where(eq(items.id, id))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: id,
    action: 'ITEM_UPDATED',
    oldValue: item,
    newValue: updated[0],
  });
  return c.json(toResponse(updated[0]));
});

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  if (c.get('userRole') !== 'admin')
    forbidden('Tylko administrator może usuwać przedmioty');
  const existing = await db
    .select()
    .from(items)
    .where(eq(items.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Przedmiot nie istnieje');
  const borrowing = await db
    .select({ id: borrowings.id })
    .from(borrowings)
    .where(eq(borrowings.itemId, id))
    .limit(1);
  if (borrowing.length > 0) {
    badRequest('Nie można usunąć przedmiotu z historią wypożyczeń.');
  }

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: id,
    action: 'ITEM_DELETED',
    oldValue: existing[0],
  });

  const photos = await db
    .select({ storagePath: itemPhotos.storagePath })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id));
  await db.delete(items).where(eq(items.id, id));
  if (photos.length > 0) {
    try {
      const storage = createObjectStorage(c.env);
      await Promise.all(
        photos.map((photo) => storage.delete(photo.storagePath))
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: 'orphaned photos after item deletion',
          itemId: id,
          error: String(error),
        })
      );
    }
  }
  return c.body(null, 204);
});

export { router as itemsRouter };
