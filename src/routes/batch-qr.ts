import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { items } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

// POST /api/v1/batch-qr/print — frontend sends { item_ids }
const batchSchema = z.object({
  item_ids: z.array(z.number().int().positive()).min(1).max(100),
});

router.post('/print', zValidator('json', batchSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  const rows = await db
    .select({ id: items.id, systemId: items.systemId, name: items.name })
    .from(items)
    .where(inArray(items.id, body.item_ids));
  if (rows.length === 0) notFound('Nie znaleziono wybranych przedmiotów');

  return c.json({ items: rows });
});

export { router as batchQrRouter };
