import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { items, auditLogs, itemStatus, locations } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden } from '../lib/errors';
import { getItemPermissionLevel } from '../lib/permissions';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

// GET /api/v1/quick-actions/:itemId
router.get('/:itemId', async (c) => {
  const db = c.get('db');
  const itemId = Number(c.req.param('itemId'));
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      ownerId: items.ownerId,
      ownerGroupId: items.ownerGroupId,
      statusName: itemStatus.name,
      locationName: locations.name,
    })
    .from(items)
    .leftJoin(itemStatus, eq(items.statusId, itemStatus.id))
    .leftJoin(locations, eq(items.locationId, locations.id))
    .where(eq(items.id, itemId))
    .limit(1);

  if (rows.length === 0) notFound('Item not found');
  const item = rows[0];
  const permission = await getItemPermissionLevel(
    db,
    itemId,
    c.get('userId'),
    c.get('userRole'),
    item.ownerId,
    item.ownerGroupId
  );
  return c.json({
    id: item.id,
    name: item.name,
    location: item.locationName || 'Brak lokalizacji',
    owner_id: item.ownerId,
    status: item.statusName || 'Nieznany',
    canEdit: !!permission,
  });
});

// PATCH /api/v1/quick-actions/:itemId/mark-damaged
router.patch('/:itemId/mark-damaged', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const itemId = Number(c.req.param('itemId'));
  const rows = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  if (rows.length === 0) notFound('Item not found');

  const permission = await getItemPermissionLevel(
    db,
    itemId,
    userId,
    c.get('userRole'),
    rows[0].ownerId,
    rows[0].ownerGroupId
  );
  if (!permission) forbidden('Brak uprawnień do zmiany statusu');

  const statusRows = await db
    .select()
    .from(itemStatus)
    .where(eq(itemStatus.slug, 'uszkodzony'))
    .limit(1);
  if (statusRows.length === 0)
    notFound("Nie znaleziono statusu 'uszkodzony' w bazie");
  const damagedStatusId = statusRows[0].id;

  await db
    .update(items)
    .set({ statusId: damagedStatusId })
    .where(eq(items.id, itemId));
  await db.insert(auditLogs).values({
    userId,
    action: 'mark_damaged',
    itemId,
    oldValue: { statusId: rows[0].statusId },
    newValue: { statusId: damagedStatusId },
  });

  const updated = await db
    .select({
      locationName: locations.name,
      statusName: itemStatus.name,
    })
    .from(items)
    .leftJoin(itemStatus, eq(items.statusId, itemStatus.id))
    .leftJoin(locations, eq(items.locationId, locations.id))
    .where(eq(items.id, itemId))
    .limit(1);

  return c.json({
    id: itemId,
    name: rows[0].name,
    location: updated[0]?.locationName || 'Brak lokalizacji',
    owner_id: rows[0].ownerId,
    status: updated[0]?.statusName || 'uszkodzony',
    canEdit: true,
  });
});

export { router as quickActionRouter };
