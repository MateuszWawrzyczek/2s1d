import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, ne } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { categories, type Category } from '../db/schema';
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
  parent_id: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
});

type CategoryInput = z.infer<typeof createSchema>;

const router = new Hono<{ Variables: Variables }>();
router.use('/*', authMiddleware);

function toResponse(cat: Category) {
  return {
    id: cat.id,
    name: cat.name,
    parent_id: cat.parentId ?? null,
  };
}

async function ensureParentExists(
  db: MySql2Database<Record<string, never>>,
  parentId: number
) {
  const parent = await db
    .select()
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1);
  if (parent.length === 0) notFound('Kategoria-rodzic nie istnieje');
}

async function checkNameUnique(
  db: MySql2Database<Record<string, never>>,
  name: string,
  parentId: number | null,
  excludeId?: number
) {
  const conditions = [eq(categories.name, name)];
  if (parentId === null) conditions.push(isNull(categories.parentId));
  else conditions.push(eq(categories.parentId, parentId));
  if (excludeId !== undefined) conditions.push(ne(categories.id, excludeId));
  const existing = await db
    .select()
    .from(categories)
    .where(and(...conditions))
    .limit(1);
  if (existing.length > 0)
    badRequest(
      'Kategoria o tej nazwie, pod tym samym rodzicem już istnieje :('
    );
}

async function getDescendantIds(
  db: MySql2Database<Record<string, never>>,
  categoryId: number
): Promise<Set<number>> {
  const ids = new Set<number>([categoryId]);
  const children = await db
    .select()
    .from(categories)
    .where(eq(categories.parentId, categoryId));
  for (const child of children) {
    const childIds = await getDescendantIds(db, child.id);
    for (const id of childIds) ids.add(id);
  }
  return ids;
}

async function deleteCategoryTree(
  db: MySql2Database<Record<string, never>>,
  categoryId: number
): Promise<void> {
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId));

  for (const child of children) {
    await deleteCategoryTree(db, child.id);
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
}

async function checkNoCycle(
  db: MySql2Database<Record<string, never>>,
  categoryId: number,
  newParentId: number
) {
  if (categoryId === newParentId)
    badRequest('Kategoria nie może być jednocześnie swoim własnym rodzicem!');
  const descendants = await getDescendantIds(db, categoryId);
  if (descendants.has(newParentId))
    badRequest('Zmiana rodzica spowodowałaby cykl w drzewie kategorii');
}

router.get('/', async (c) => {
  const db = c.get('db');
  const rows = await db.select().from(categories);
  return c.json(rows.map(toResponse));
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (rows.length === 0) notFound('Kategoria nie istnieje');
  return c.json(toResponse(rows[0]));
});

router.post('/', zValidator('json', createSchema), async (c) => {
  // if (c.get('userRole') !== 'admin')
  //   forbidden('Only admins can create categories');
  const db = c.get('db');
  const body = c.req.valid('json') as CategoryInput;
  const parentId = body.parent_id ?? null;
  if (parentId != null) await ensureParentExists(db, parentId);
  await checkNameUnique(db, body.name, parentId);

  const result = await db
    .insert(categories)
    .values({ name: body.name, parentId });
  const created = await db
    .select()
    .from(categories)
    .where(eq(categories.id, result[0].insertId))
    .limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.patch('/:id', zValidator('json', createSchema), async (c) => {
  // if (c.get('userRole') !== 'admin')
  //   forbidden('Only admins can update categories');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json') as CategoryInput;

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Kategoria nie istnieje');
  const parentId = Object.hasOwn(body, 'parent_id')
    ? (body.parent_id ?? null)
    : existing[0].parentId;
  await checkNameUnique(db, body.name, parentId, id);

  if (parentId != null) {
    await ensureParentExists(db, parentId);
    await checkNoCycle(db, id, parentId);
  }

  await db
    .update(categories)
    .set({ name: body.name, parentId })
    .where(eq(categories.id, id));
  const updated = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return c.json(toResponse(updated[0]));
});

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));

  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (existing.length === 0)
    notFound('Kategoria nie istnieje');

  await deleteCategoryTree(db, id);

  return c.body(null, 204);
});

export { router as categoriesRouter };
