import { Hono } from 'hono';
import { eq, desc, inArray, or } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { delegations, items, users, groups, groupMembers } from '../db/schema';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();

router.use('/*', authMiddleware);

async function resolveUserEmails(
  db: MySql2Database<Record<string, never>>,
  ids: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));
  for (const r of rows) map.set(r.id, r.email);
  return map;
}

async function resolveGroupNames(
  db: MySql2Database<Record<string, never>>,
  ids: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(inArray(groups.id, ids));
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

router.get('/', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const userRole = c.get('userRole');

  let rows;
  if (userRole === 'admin') {
    // Admin sees all delegations
    rows = await db
      .select({
        id: delegations.id,
        itemId: delegations.itemId,
        userId: delegations.userId,
        groupId: delegations.groupId,
        permission: delegations.permission,
        itemName: items.name,
      })
      .from(delegations)
      .leftJoin(items, eq(delegations.itemId, items.id))
      .orderBy(desc(delegations.id));
  } else {
    // Regular user sees delegations for items they own, OR delegations granted to them
    const userGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    const userGroupIds = userGroups.map((g) => g.groupId);

    const conditions = [
      eq(items.ownerId, userId),
      eq(delegations.userId, userId),
    ];
    if (userGroupIds.length > 0) {
      conditions.push(inArray(delegations.groupId, userGroupIds));
    }

    rows = await db
      .select({
        id: delegations.id,
        itemId: delegations.itemId,
        userId: delegations.userId,
        groupId: delegations.groupId,
        permission: delegations.permission,
        itemName: items.name,
      })
      .from(delegations)
      .innerJoin(items, eq(delegations.itemId, items.id))
      .where(or(...conditions))
      .orderBy(desc(delegations.id));
  }

  const uIds = [
    ...new Set(
      rows.map((r) => r.userId).filter((v): v is number => v !== null)
    ),
  ];
  const gIds = [
    ...new Set(
      rows.map((r) => r.groupId).filter((v): v is number => v !== null)
    ),
  ];

  const [userMap, groupMap] = await Promise.all([
    resolveUserEmails(db, uIds),
    resolveGroupNames(db, gIds),
  ]);

  return c.json(
    rows.map((r) => ({
      id: r.id,
      item_id: r.itemId,
      item_name: r.itemName,
      user_id: r.userId,
      group_id: r.groupId,
      permission: r.permission,
      user_email: r.userId ? (userMap.get(r.userId) ?? null) : null,
      group_name: r.groupId ? (groupMap.get(r.groupId) ?? null) : null,
    }))
  );
});

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const userId = c.get('userId');
  const userRole = c.get('userRole');

  // Verify deletion permission
  if (userRole !== 'admin') {
    const delegation = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, id))
      .limit(1);
    if (delegation.length === 0) return c.body(null, 404);

    const item = await db
      .select()
      .from(items)
      .where(eq(items.id, delegation[0].itemId))
      .limit(1);
    if (item.length === 0 || item[0].ownerId !== userId) {
      return c.json({ detail: 'Forbidden' }, 403);
    }
  }

  await db.delete(delegations).where(eq(delegations.id, id));
  return c.body(null, 204);
});

export { router as globalDelegationsRouter };
