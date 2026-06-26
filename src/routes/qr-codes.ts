import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { items } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

// GET /api/v1/qr-codes/scan/:qrData — frontend expects this exact path
router.get('/scan/:qrData', async (c) => {
  const db = c.get('db');
  const qrData = decodeURIComponent(c.req.param('qrData'));
  let parsed: { id?: number; systemId?: string };
  try {
    parsed = JSON.parse(qrData);
  } catch {
    if (qrData.startsWith('ITEM-')) {
      parsed = { id: parseInt(qrData.replace('ITEM-', ''), 10) };
    } else {
      parsed = { systemId: qrData };
    }
  }

  const itemId = parsed.id;
  const rows = itemId
    ? await db.select().from(items).where(eq(items.id, itemId)).limit(1)
    : await db
        .select()
        .from(items)
        .where(eq(items.systemId, parsed.systemId ?? ''))
        .limit(1);

  if (rows.length === 0) notFound('Item not found');
  const item = rows[0];
  return c.json({
    id: item.id,
    system_id: item.systemId,
    name: item.name,
    description: item.description,
    qr_data: qrData,
  });
});

export { router as qrCodesRouter };
