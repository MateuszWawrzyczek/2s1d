import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, ne } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { itemStatus, type Status } from '../db/schema';
import { slugify } from '../db/seed';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};

const createSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((v) => v.trim()),
});

const updateSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((v) => v.trim()),
});

const router = new Hono<{ Variables: Variables }>();
router.use('/*', authMiddleware);

function toResponse(status: Status) {
  return {
    id: status.id,
    name: status.name,
    is_system: status.isSystem,
  };
}

async function checkNameUnique(
  db: MySql2Database<Record<string, never>>,
  name: string,
  excludeId?: number
) {
  const conditions = [eq(itemStatus.name, name)];
  if (excludeId !== undefined) conditions.push(ne(itemStatus.id, excludeId));
  const existing = await db
    .select()
    .from(itemStatus)
    .where(and(...conditions))
    .limit(1);
  if (existing.length > 0) badRequest('Status with this name already exists');
}

router.get('/', async (c) => {
  const db = c.get('db');
  const rows = await db.select().from(itemStatus);
  return c.json(rows.map(toResponse));
});

router.post('/', zValidator('json', createSchema), async (c) => {
  // if (c.get('userRole') !== 'admin')
  //   forbidden('Only admins can create statuses');
  const db = c.get('db');
  const body = c.req.valid('json');
  await checkNameUnique(db, body.name);

  const result = await db.insert(itemStatus).values({
    name: body.name,
    isSystem: false,
    slug: slugify(body.name),
  });

  const created = await db
    .select()
    .from(itemStatus)
    .where(eq(itemStatus.id, result[0].insertId))
    .limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.put('/:id', zValidator('json', updateSchema), async (c) => {
  // if (c.get('userRole') !== 'admin')
  //   forbidden('Only admins can update statuses');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(itemStatus)
    .where(eq(itemStatus.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Status not found');
  if (existing[0].isSystem) forbidden('Cannot modify system status');

  const body = c.req.valid('json');
  await checkNameUnique(db, body.name, id);
  await db
    .update(itemStatus)
    .set({ name: body.name, slug: slugify(body.name) })
    .where(eq(itemStatus.id, id));
  const updated = await db
    .select()
    .from(itemStatus)
    .where(eq(itemStatus.id, id))
    .limit(1);
  return c.json(toResponse(updated[0]));
});

router.delete('/:id', async (c) => {
  // if (c.get('userRole') !== 'admin')
  //   forbidden('Only admins can delete statuses');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(itemStatus)
    .where(eq(itemStatus.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Status not found');
  if (existing[0].isSystem) forbidden('Cannot delete system status');
  await db.delete(itemStatus).where(eq(itemStatus.id, id));
  return c.body(null, 204);
});

export { router as statusesRouter };
