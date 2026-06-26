import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { auditLogs, users, items } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { forbidden } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

router.get('/', async (c) => {
  const db = c.get('db');
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can view audit logs');
  const rows = await db
    .select({
      id: auditLogs.id,
      timestamp: auditLogs.timestamp,
      userId: auditLogs.userId,
      action: auditLogs.action,
      itemId: auditLogs.itemId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      userEmail: users.email,
      itemName: items.name,
      itemSerial: items.serial,
      itemSystemId: items.systemId,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(items, eq(auditLogs.itemId, items.id))
    .orderBy(desc(auditLogs.timestamp));
  return c.json(rows);
});

router.get('/item/:itemId', async (c) => {
  const db = c.get('db');
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can view audit logs');
  const itemId = Number(c.req.param('itemId'));
  const rows = await db
    .select({
      id: auditLogs.id,
      timestamp: auditLogs.timestamp,
      userId: auditLogs.userId,
      action: auditLogs.action,
      itemId: auditLogs.itemId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      userEmail: users.email,
      itemName: items.name,
      itemSerial: items.serial,
      itemSystemId: items.systemId,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(items, eq(auditLogs.itemId, items.id))
    .where(eq(auditLogs.itemId, itemId))
    .orderBy(desc(auditLogs.timestamp));

  return c.json(rows);
});

export { router as auditLogsRouter };
