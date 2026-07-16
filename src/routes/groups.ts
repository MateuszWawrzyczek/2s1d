import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, ne, like } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { groups, groupMembers, type Group } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest, forbidden } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  defaultPermission: z.enum(['manage', 'edit']).default('edit'),
});
const addMemberSchema = z.object({ userId: z.number().int().positive() });
const searchSchema = z.object({ q: z.string().min(1).max(255) });

function toResponse(group: Group, memberIds?: number[]) {
  return {
    id: group.id,
    name: group.name,
    defaultPermission: group.defaultPermission,
    memberIds: memberIds ?? [],
  };
}

router.get('/', async (c) => {
  const db = c.get('db');
  const rows = await db.select().from(groups);
  const result = await Promise.all(
    rows.map(async (g) => {
      const m = await db
        .select()
        .from(groupMembers)
        .where(eq(groupMembers.groupId, g.id));
      return toResponse(
        g,
        m.map((x) => x.userId)
      );
    })
  );
  return c.json(result);
});

router.get('/search', zValidator('query', searchSchema), async (c) => {
  const db = c.get('db');
  const { q } = c.req.valid('query');
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      defaultPermission: groups.defaultPermission,
    })
    .from(groups)
    .where(like(groups.name, `%${q}%`))
    .limit(20);
  return c.json(rows);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  if (rows.length === 0) notFound('Group not found');
  const m = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, id));
  return c.json(
    toResponse(
      rows[0],
      m.map((x) => x.userId)
    )
  );
});

router.post('/', zValidator('json', createSchema), async (c) => {
  if (c.get('userRole') !== 'admin') forbidden('Only admins can create groups');
  const db = c.get('db');
  const body = c.req.valid('json');
  const exist = await db
    .select()
    .from(groups)
    .where(eq(groups.name, body.name))
    .limit(1);
  if (exist.length > 0) badRequest('Group with this name already exists');
  const result = await db.insert(groups).values(body);
  const created = await db
    .select()
    .from(groups)
    .where(eq(groups.id, result[0].insertId))
    .limit(1);
  return c.json(toResponse(created[0]), 201);
});

router.put('/:id', zValidator('json', createSchema), async (c) => {
  if (c.get('userRole') !== 'admin') forbidden('Only admins can update groups');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const exist = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  if (exist.length === 0) notFound('Group not found');
  const dup = await db
    .select()
    .from(groups)
    .where(and(eq(groups.name, body.name), ne(groups.id, id)))
    .limit(1);
  if (dup.length > 0) badRequest('Group with this name already exists');
  await db.update(groups).set(body).where(eq(groups.id, id));
  const updated = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  return c.json(toResponse(updated[0]));
});

router.delete('/:id', async (c) => {
  if (c.get('userRole') !== 'admin') forbidden('Only admins can delete groups');
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const exist = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  if (exist.length === 0) notFound('Group not found');
  await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
  return c.body(null, 204);
});

router.post('/:id/members', zValidator('json', addMemberSchema), async (c) => {
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can manage group members');
  const db = c.get('db');
  const gid = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const exist = await db
    .select()
    .from(groups)
    .where(eq(groups.id, gid))
    .limit(1);
  if (exist.length === 0) notFound('Group not found');
  const already = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, gid), eq(groupMembers.userId, body.userId))
    )
    .limit(1);
  if (already.length > 0) badRequest('User is already a member');
  await db.insert(groupMembers).values({ groupId: gid, userId: body.userId });
  const m = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, gid));
  return c.json(
    toResponse(
      exist[0],
      m.map((x) => x.userId)
    ),
    201
  );
});

router.delete('/:id/members/:userId', async (c) => {
  if (c.get('userRole') !== 'admin')
    forbidden('Only admins can manage group members');
  const db = c.get('db');
  const gid = Number(c.req.param('id'));
  const uid = Number(c.req.param('userId'));
  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, gid), eq(groupMembers.userId, uid)));
  return c.body(null, 204);
});

export { router as groupsRouter };
