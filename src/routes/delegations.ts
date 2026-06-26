import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, inArray, and } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';

import { delegations, users, groups, items } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest, forbidden } from '../lib/errors';
import { createAuditLog } from '../lib/audit';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const createSchema = z
  .object({
    user_id: z.number().int().positive().optional(),
    group_id: z.number().int().positive().optional(),
    permission: z.enum(['edit', 'manage']),
  })
  .refine(
    (value) => (value.user_id === undefined) !== (value.group_id === undefined),
    {
      message: 'Podaj dokładnie jednego użytkownika albo jedną grupę.',
    }
  );

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

// Helper to verify caller can manage delegations for this item
async function assertCanManageDelegations(
  db: MySql2Database<Record<string, never>>,
  itemId: number,
  userId: number,
  userRole: 'admin' | 'user'
) {
  if (userRole === 'admin') return;
  const item = await db
    .select({ ownerId: items.ownerId })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  if (item.length === 0) notFound('Item not found');
  if (item[0].ownerId !== userId)
    forbidden('Tylko właściciel może zarządzać delegacjami');
}

router.get('/:itemId/delegations', async (c) => {
  const db = c.get('db');
  const itemId = Number(c.req.param('itemId'));
  const rows = await db
    .select()
    .from(delegations)
    .where(eq(delegations.itemId, itemId))
    .orderBy(desc(delegations.id));

  const userIds = [
    ...new Set(
      rows.map((r) => r.userId).filter((v): v is number => v !== null)
    ),
  ];
  const groupIds = [
    ...new Set(
      rows.map((r) => r.groupId).filter((v): v is number => v !== null)
    ),
  ];

  const [userMap, groupMap] = await Promise.all([
    resolveUserEmails(db, userIds),
    resolveGroupNames(db, groupIds),
  ]);

  return c.json(
    rows.map((r) => ({
      id: r.id,
      item_id: r.itemId,
      user_id: r.userId,
      group_id: r.groupId,
      permission: r.permission,
      user_email: r.userId ? (userMap.get(r.userId) ?? null) : null,
      group_name: r.groupId ? (groupMap.get(r.groupId) ?? null) : null,
    }))
  );
});

router.post(
  '/:itemId/delegations',
  zValidator('json', createSchema),
  async (c) => {
    const db = c.get('db');
    const itemId = Number(c.req.param('itemId'));
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const userRole = c.get('userRole');

    // Only owner or admin can add delegations
    await assertCanManageDelegations(db, itemId, userId, userRole);

    // Prevent duplicates
    const existing = await db
      .select()
      .from(delegations)
      .where(
        and(
          eq(delegations.itemId, itemId),
          body.user_id
            ? eq(delegations.userId, body.user_id)
            : eq(delegations.groupId, body.group_id!)
        )
      )
      .limit(1);

    if (existing.length > 0)
      badRequest('Ta osoba lub grupa jest już przypisana do tego przedmiotu.');

    const result = await db.insert(delegations).values({
      itemId,
      userId: body.user_id ?? null,
      groupId: body.group_id ?? null,
      permission: body.permission,
    });
    const created = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, result[0].insertId))
      .limit(1);

    const [userEmail, groupName] = await Promise.all([
      body.user_id
        ? db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, body.user_id))
            .limit(1)
            .then((r) => r[0]?.email || null)
        : Promise.resolve(null),
      body.group_id
        ? db
            .select({ name: groups.name })
            .from(groups)
            .where(eq(groups.id, body.group_id))
            .limit(1)
            .then((r) => r[0]?.name || null)
        : Promise.resolve(null),
    ]);

    await createAuditLog(db, {
      userId: c.get('userId'),
      itemId,
      action: 'DELEGATE_ADDED',
      newValue: {
        delegateId: created[0].id,
        userId: created[0].userId,
        userEmail,
        groupId: created[0].groupId,
        groupName,
        permission: created[0].permission,
      },
    });

    return c.json(
      {
        id: created[0].id,
        item_id: created[0].itemId,
        user_id: created[0].userId,
        group_id: created[0].groupId,
        permission: created[0].permission,
        user_email: userEmail,
        group_name: groupName,
      },
      201
    );
  }
);

router.put(
  '/:itemId/delegations/:id',
  zValidator('json', createSchema),
  async (c) => {
    const db = c.get('db');
    const itemId = Number(c.req.param('itemId'));
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const userRole = c.get('userRole');

    // Only owner or admin can modify delegations
    await assertCanManageDelegations(db, itemId, userId, userRole);

    // Verify delegation exists and belongs to this item
    const existing = await db
      .select()
      .from(delegations)
      .where(and(eq(delegations.id, id), eq(delegations.itemId, itemId)))
      .limit(1);
    if (existing.length === 0) notFound('Delegation not found');

    await db
      .update(delegations)
      .set({
        userId: body.user_id ?? null,
        groupId: body.group_id ?? null,
        permission: body.permission,
      })
      .where(eq(delegations.id, id));

    const updated = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, id))
      .limit(1);

    const [userEmail, groupName] = await Promise.all([
      updated[0].userId
        ? db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, updated[0].userId))
            .limit(1)
            .then((r) => r[0]?.email || null)
        : Promise.resolve(null),
      updated[0].groupId
        ? db
            .select({ name: groups.name })
            .from(groups)
            .where(eq(groups.id, updated[0].groupId))
            .limit(1)
            .then((r) => r[0]?.name || null)
        : Promise.resolve(null),
    ]);

    return c.json({
      id: updated[0].id,
      item_id: updated[0].itemId,
      user_id: updated[0].userId,
      group_id: updated[0].groupId,
      permission: updated[0].permission,
      user_email: userEmail,
      group_name: groupName,
    });
  }
);

router.delete('/:itemId/delegations/:id', async (c) => {
  const db = c.get('db');
  const itemId = Number(c.req.param('itemId'));
  const id = Number(c.req.param('id'));

  const userId = c.get('userId');
  const userRole = c.get('userRole');
  // Only owner or admin can delete delegations
  await assertCanManageDelegations(db, itemId, userId, userRole);

  const existing = await db
    .select()
    .from(delegations)
    .where(and(eq(delegations.id, id), eq(delegations.itemId, itemId)))
    .limit(1);

  if (existing.length === 0) {
    notFound('Delegation not found');
  }

  let userEmail: string | null = null;
  let groupName: string | null = null;

  if (existing[0].userId) {
    const u = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, existing[0].userId))
      .limit(1);

    if (u.length > 0) userEmail = u[0].email;
  }

  if (existing[0].groupId) {
    const g = await db
      .select({ name: groups.name })
      .from(groups)
      .where(eq(groups.id, existing[0].groupId))
      .limit(1);

    if (g.length > 0) groupName = g[0].name;
  }

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: existing[0].itemId,
    action: 'DELEGATE_REMOVED',
    oldValue: {
      delegateId: existing[0].id,
      userId: existing[0].userId,
      userEmail,
      groupId: existing[0].groupId,
      groupName,
      permission: existing[0].permission,
    },
    newValue: null,
  });

  // Verify delegation exists and belongs to this item

  await db.delete(delegations).where(eq(delegations.id, id));
  return c.body(null, 204);
});

export { router as delegationsRouter };
