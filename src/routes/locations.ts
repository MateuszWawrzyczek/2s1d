import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, ne } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { locations, type Location } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(['internal', 'external']).default('internal'),
  building: z.string().max(80).optional(),
  room: z.string().max(80).optional(),
  cabinet: z.string().max(80).optional(),
  shelf: z.string().max(80).optional(),
  mapX: z.number().optional(),
  mapY: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

function toResponse(loc: Location) {
  return {
    id: loc.id,
    name: loc.name,
    kind: loc.kind,
    building: loc.building,
    room: loc.room,
    cabinet: loc.cabinet,
    shelf: loc.shelf,
    mapX: loc.mapX,
    mapY: loc.mapY,
    notes: loc.notes,
    isActive: loc.isActive,
  };
}

router.get('/', async (c) => {
  const db = c.get('db');
  return c.json((await db.select().from(locations)).map(toResponse));
});
router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (rows.length === 0) notFound('Location not found');
  return c.json(toResponse(rows[0]));
});

router.post('/', zValidator('json', createSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  const existing = await db
    .select()
    .from(locations)
    .where(eq(locations.name, body.name))
    .limit(1);
  if (existing.length > 0) badRequest('Location with this name already exists');
  const result = await db.insert(locations).values({
    name: body.name,
    kind: body.kind,
    building: body.building ?? null,
    room: body.room ?? null,
    cabinet: body.cabinet ?? null,
    shelf: body.shelf ?? null,
    mapX: body.mapX ?? null,
    mapY: body.mapY ?? null,
    notes: body.notes ?? null,
    isActive: body.isActive,
  });
  const created = await db
    .select()
    .from(locations)
    .where(eq(locations.id, result[0].insertId))
    .limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.patch('/:id', zValidator('json', createSchema.partial()), async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const existing = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Location not found');
  if (body.name) {
    const dup = await db
      .select()
      .from(locations)
      .where(and(eq(locations.name, body.name), ne(locations.id, id)))
      .limit(1);
    if (dup.length > 0) badRequest('Location with this name already exists');
  }
  const d: Record<string, unknown> = {};
  if (body.name !== undefined) d.name = body.name;
  if (body.kind !== undefined) d.kind = body.kind;
  if (body.building !== undefined) d.building = body.building ?? null;
  if (body.room !== undefined) d.room = body.room ?? null;
  if (body.cabinet !== undefined) d.cabinet = body.cabinet ?? null;
  if (body.shelf !== undefined) d.shelf = body.shelf ?? null;
  if (body.mapX !== undefined) d.mapX = body.mapX ?? null;
  if (body.mapY !== undefined) d.mapY = body.mapY ?? null;
  if (body.notes !== undefined) d.notes = body.notes ?? null;
  if (body.isActive !== undefined) d.isActive = body.isActive;
  await db.update(locations).set(d).where(eq(locations.id, id));
  const updated = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return c.json(toResponse(updated[0]));
});

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Location not found');
  await db.delete(locations).where(eq(locations.id, id));
  return c.body(null, 204);
});

export { router as locationsRouter };
