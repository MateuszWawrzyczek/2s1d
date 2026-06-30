import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, like } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden, badRequest } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const updateRoleSchema = z.object({ role: z.enum(['admin', 'user']) });
const searchSchema = z.object({ q: z.string().min(1).max(255) });

router.get('/me', async (c) => {
  const db = c.get('db');
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .limit(1);
  if (rows.length === 0) notFound('User not found');
  return c.json(rows[0]);
});

router.get('/', async (c) => {
  if (c.get('userRole') !== 'admin') forbidden('Only admins can list users');
  const db = c.get('db');
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users);
  return c.json(rows);
});

router.get('/search', zValidator('query', searchSchema), async (c) => {
  const db = c.get('db');
  const { q } = c.req.valid('query');
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(like(users.email, `%${q}%`), eq(users.isActive, true)))
    .limit(20);
  return c.json(rows);
});

router.patch('/:id/deactivate', async (c) => {
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can deactivate users');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  if (id === c.get('userId')) badRequest('Cannot deactivate your own account');
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (existing.length === 0) notFound('User not found');
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
  const updated = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return c.json(updated[0]);
});

router.patch('/:id/activate', async (c) => {
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can activate users');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (existing.length === 0) notFound('User not found');
  await db.update(users).set({ isActive: true }).where(eq(users.id, id));
  const updated = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return c.json(updated[0]);
});

router.patch('/:id/role', zValidator('json', updateRoleSchema), async (c) => {
  if (c.get('userRole') !== 'admin') forbidden('Only admins can change roles');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  if (id === c.get('userId')) badRequest('Cannot change your own role');
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (existing.length === 0) notFound('User not found');
  await db
    .update(users)
    .set({ role: c.req.valid('json').role })
    .where(eq(users.id, id));
  const updated = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return c.json(updated[0]);
});

export { router as usersRouter };
