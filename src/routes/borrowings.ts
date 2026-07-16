import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, inArray, ne, sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { borrowings, itemStatus, items, users } from '../db/schema';
import type { Borrowing } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest, forbidden } from '../lib/errors';
import { createAuditLog } from '../lib/audit';
import { createBorrowingApprovedNotification } from '../lib/notifications';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};

const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const createSchema = z
  .object({
    itemId: z.number().int().positive(),
    borrowerId: z.number().int().positive().optional(),
    externalBorrower: z.string().max(160).optional(),
    mode: z.enum(['classic', 'trusted', 'asynchronous', 'external']),
    plannedReturnAt: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === 'external' && !value.externalBorrower?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['externalBorrower'],
        message: 'Podaj odbiorcę zewnętrznego',
      });
    }
  });

function toResponse(b: Borrowing) {
  return {
    id: b.id,
    itemId: b.itemId,
    borrowerId: b.borrowerId,
    externalBorrower: b.externalBorrower,
    mode: b.mode,
    status: b.status,
    plannedReturnAt: b.plannedReturnAt,
    approvedAt: b.approvedAt,
    handedOverAt: b.handedOverAt,
    returnedAt: b.returnedAt,
    returnComment: b.returnComment,
    createdAt: b.createdAt,
  };
}

function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function getStatusIdBySlug(
  db: MySql2Database<Record<string, never>>,
  slug: string
): Promise<number | null> {
  const rows = await db
    .select({ id: itemStatus.id })
    .from(itemStatus)
    .where(eq(itemStatus.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function updateItemStatusBySlug(
  db: MySql2Database<Record<string, never>>,
  itemId: number,
  slug: string
): Promise<void> {
  const statusId = await getStatusIdBySlug(db, slug);
  if (statusId === null) return;
  await db.update(items).set({ statusId }).where(eq(items.id, itemId));
}

async function refreshItemStatusFromBorrowings(
  db: MySql2Database<Record<string, never>>,
  itemId: number
): Promise<void> {
  const active = await db
    .select({ status: borrowings.status })
    .from(borrowings)
    .where(
      and(
        eq(borrowings.itemId, itemId),
        inArray(borrowings.status, ['pending', 'reserved', 'borrowed'])
      )
    );

  const slug = active.some((row) => row.status === 'borrowed')
    ? 'wypozyczony'
    : active.some((row) => row.status === 'reserved')
      ? 'zarezerwowany'
      : active.some((row) => row.status === 'pending')
        ? 'oczekuje-zatwierdzenia'
        : 'dostepny';

  await updateItemStatusBySlug(db, itemId, slug);
}

router.get('/', async (c) => {
  const db = c.get('db');
  const status = c.req.query('status');
  const userId = c.req.query('userId');
  const itemId = c.req.query('itemId');
  const conditions = [];
  if (status)
    conditions.push(eq(borrowings.status, status as Borrowing['status']));
  if (userId) conditions.push(eq(borrowings.borrowerId, Number(userId)));
  if (itemId) conditions.push(eq(borrowings.itemId, Number(itemId)));
  if (c.get('userRole') !== 'admin') {
    const currentUserId = c.get('userId');
    conditions.push(sql`(
      ${borrowings.borrowerId} = ${currentUserId}
      OR ${borrowings.itemId} IN (
        SELECT id FROM items WHERE owner_id = ${currentUserId}
      )
    )`);
  }
  const rows = await db
    .select()
    .from(borrowings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(borrowings.createdAt));
  return c.json(rows.map(toResponse));
});

router.get('/overdue', async (c) => {
  const db = c.get('db');
  const includeAll = c.req.query('includeAll') === 'true';
  const baseCondition = and(
    eq(borrowings.status, 'borrowed'),
    sql`${borrowings.plannedReturnAt} < NOW()`
  );
  const userId = c.get('userId');
  const isAdmin = c.get('userRole') === 'admin';
  if (!isAdmin && includeAll) {
    forbidden('Tylko administrator może wyświetlić wszystkie przetrzymania');
  }
  let rows;
  if (isAdmin) {
    rows = await db
      .select()
      .from(borrowings)
      .where(baseCondition)
      .orderBy(borrowings.plannedReturnAt);
  } else {
    // owner - tylko przedmioty, których jest właścicielem
    const ownedItems = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.ownerId, userId));
    const ownedItemIds = ownedItems.map((i) => i.id);
    if (ownedItemIds.length === 0) return c.json([]);
    rows = await db
      .select()
      .from(borrowings)
      .where(
        and(
          baseCondition,
          sql`${borrowings.itemId} IN (${sql.join(
            ownedItemIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      )
      .orderBy(borrowings.plannedReturnAt);
  }
  const result = rows.map((b) => ({
    borrowingId: b.id,
    itemId: b.itemId,
    itemName: '',
    ownerId: null,
    borrowerId: b.borrowerId,
    borrowerEmail: null as string | null,
    externalBorrower: b.externalBorrower,
    plannedReturnAt: b.plannedReturnAt,
    daysOverdue: b.plannedReturnAt
      ? Math.floor(
          (Date.now() - new Date(b.plannedReturnAt).getTime()) / 86400000
        )
      : 0,
  }));
  // Resolve item name
  for (const r of result) {
    const item = await db
      .select({ name: items.name })
      .from(items)
      .where(eq(items.id, r.itemId))
      .limit(1);
    r.itemName = item[0]?.name ?? 'Nieznany przedmiot';
    if (r.borrowerId) {
      const user = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, r.borrowerId))
        .limit(1);
      r.borrowerEmail = user[0]?.email ?? null;
    }
  }
  return c.json(result);
});

router.get('/overdue.csv', async (c) => {
  const db = c.get('db');
  const isAdmin = c.get('userRole') === 'admin';
  const userId = c.get('userId');
  const baseCondition = and(
    eq(borrowings.status, 'borrowed'),
    sql`${borrowings.plannedReturnAt} < NOW()`
  );

  let rows: (typeof borrowings.$inferSelect)[];
  if (isAdmin) {
    rows = await db
      .select()
      .from(borrowings)
      .where(baseCondition)
      .orderBy(borrowings.plannedReturnAt);
  } else {
    const ownedItems = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.ownerId, userId));
    const ownedItemIds = ownedItems.map((i) => i.id);
    if (ownedItemIds.length === 0) {
      c.header('Content-Type', 'text/csv');
      c.header('Content-Disposition', 'attachment; filename=overdue.csv');
      return c.text('ID,Przedmiot,Odbiorca,Planowany zwrot,Dni po terminie\n');
    }
    rows = await db
      .select()
      .from(borrowings)
      .where(
        and(
          baseCondition,
          sql`${borrowings.itemId} IN (${sql.join(
            ownedItemIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      )
      .orderBy(borrowings.plannedReturnAt);
  }

  let csv = '\uFEFFID;Przedmiot;Odbiorca;Planowany zwrot;Dni po terminie\n';
  for (const b of rows) {
    const item = await db
      .select({ name: items.name })
      .from(items)
      .where(eq(items.id, b.itemId))
      .limit(1);
    const itemName = item[0]?.name ?? 'Nieznany przedmiot';
    let borrower = b.externalBorrower ?? '';
    if (b.borrowerId) {
      const user = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, b.borrowerId))
        .limit(1);
      borrower = user[0]?.email ?? String(b.borrowerId);
    }
    const daysOverdue = b.plannedReturnAt
      ? Math.floor(
          (Date.now() - new Date(b.plannedReturnAt).getTime()) / 86400000
        )
      : 0;
    const plannedReturn = b.plannedReturnAt
      ? new Date(b.plannedReturnAt).toLocaleString('pl-PL')
      : '—';
    csv += `${b.id};${csvCell(itemName)};${csvCell(borrower)};${csvCell(plannedReturn)};${daysOverdue}\n`;
  }

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename=overdue.csv');
  return c.text(csv);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const rows = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  if (rows.length === 0) notFound('Wypożyczenie nie istnieje');
  return c.json(toResponse(rows[0]));
});

router.post('/', zValidator('json', createSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  const itemRows = await db
    .select()
    .from(items)
    .where(eq(items.id, body.itemId))
    .limit(1);
  if (itemRows.length === 0) notFound('Przedmiot nie istnieje');

  if (body.mode === 'external') {
    const isAdmin = c.get('userRole') === 'admin';
    const isOwner = itemRows[0].ownerId === c.get('userId');
    if (!isAdmin && !isOwner) {
      forbidden(
        'Tylko administrator albo opiekun przedmiotu może utworzyć wypożyczenie zewnętrzne'
      );
    }
  }
  if (
    body.mode !== 'external' &&
    body.borrowerId !== undefined &&
    body.borrowerId !== c.get('userId') &&
    c.get('userRole') !== 'admin'
  ) {
    forbidden(
      'Tylko administrator może utworzyć wypożyczenie dla innego użytkownika'
    );
  }
  if (!body.plannedReturnAt) {
    badRequest('Podaj datę planowanego zwrotu');
  }
  const plannedReturnAt = new Date(body.plannedReturnAt);
  if (plannedReturnAt.getTime() <= Date.now())
    badRequest('Planowany zwrot musi być w przyszłości');
  const unavailableStatuses =
    body.mode === 'external'
      ? (['pending', 'reserved', 'borrowed'] as const)
      : (['reserved', 'borrowed'] as const);
  const unavailable = await db
    .select({ id: borrowings.id })
    .from(borrowings)
    .where(
      and(
        eq(borrowings.itemId, body.itemId),
        inArray(borrowings.status, unavailableStatuses)
      )
    )
    .limit(1);
  if (unavailable.length > 0)
    badRequest('Przedmiot jest już zarezerwowany albo wypożyczony');

  if (body.mode !== 'external') {
    const borrowerId = body.borrowerId ?? c.get('userId');
    const duplicate = await db
      .select({ id: borrowings.id })
      .from(borrowings)
      .where(
        and(
          eq(borrowings.itemId, body.itemId),
          eq(borrowings.borrowerId, borrowerId),
          eq(borrowings.status, 'pending')
        )
      )
      .limit(1);
    if (duplicate.length > 0)
      badRequest('Masz już aktywny wniosek dla tego przedmiotu');
  }
  const values: Record<string, unknown> = {
    itemId: body.itemId,
    borrowerId:
      body.mode === 'external' ? null : (body.borrowerId ?? c.get('userId')),
    externalBorrower:
      body.mode === 'external' ? body.externalBorrower!.trim() : null,
    mode: body.mode,
    status: body.mode === 'external' ? 'borrowed' : 'pending',
    approvedAt: body.mode === 'external' ? sql`NOW()` : null,
    handedOverAt: body.mode === 'external' ? sql`NOW()` : null,
  };
  values.plannedReturnAt = plannedReturnAt;
  const result = await db
    .insert(borrowings)
    .values(values as typeof borrowings.$inferInsert);
  await refreshItemStatusFromBorrowings(db, body.itemId);
  const created = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, result[0].insertId))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: created[0].itemId,
    action: body.mode === 'external' ? 'ITEM_BORROWED' : 'BORROWING_REQUESTED',
    newValue: {
      borrowingId: created[0].id,
      borrowerId: created[0].borrowerId,
      externalBorrower: created[0].externalBorrower,
      mode: created[0].mode,
      status: created[0].status,
      plannedReturnAt: created[0].plannedReturnAt,
    },
  });

  return c.json(toResponse(created[0]), 201);
});

router.patch('/:id/approve', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const userId = c.get('userId');
  const item = await db
    .select({ ownerId: items.ownerId })
    .from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id))
    .limit(1);

  if (c.get('userRole') !== 'admin' && item[0]?.ownerId !== userId) {
    forbidden(
      'Tylko administrator albo opiekun przedmiotu może zatwierdzić wniosek'
    );
  }

  const existing = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Wypożyczenie nie istnieje');
  if (existing[0].status !== 'pending')
    badRequest('Wniosek nie oczekuje na zatwierdzenie');
  const conflicting = await db
    .select({ id: borrowings.id })
    .from(borrowings)
    .where(
      and(
        eq(borrowings.itemId, existing[0].itemId),
        ne(borrowings.id, id),
        inArray(borrowings.status, ['reserved', 'borrowed'])
      )
    )
    .limit(1);
  if (conflicting.length > 0)
    badRequest('Przedmiot jest już zarezerwowany albo wypożyczony');
  await db
    .update(borrowings)
    .set({ status: 'reserved', approvedAt: sql`NOW()` })
    .where(eq(borrowings.id, id));
  await refreshItemStatusFromBorrowings(db, existing[0].itemId);
  const updated = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: updated[0].itemId,
    action: 'BORROWING_APPROVED',
    oldValue: {
      status: existing[0].status,
    },
    newValue: {
      status: updated[0].status,
      approvedAt: updated[0].approvedAt,
    },
  });
  await createBorrowingApprovedNotification(db, updated[0]);

  return c.json(toResponse(updated[0]));
});

router.patch('/:id/reject', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const userId = c.get('userId');
  const item = await db
    .select({ ownerId: items.ownerId })
    .from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id))
    .limit(1);

  if (c.get('userRole') !== 'admin' && item[0]?.ownerId !== userId) {
    forbidden(
      'Tylko administrator albo opiekun przedmiotu może odrzucić wniosek'
    );
  }
  const existing = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Wypożyczenie nie istnieje');
  if (existing[0].status !== 'pending')
    badRequest('Wniosek nie oczekuje na zatwierdzenie');
  await db
    .update(borrowings)
    .set({ status: 'rejected' })
    .where(eq(borrowings.id, id));
  await refreshItemStatusFromBorrowings(db, existing[0].itemId);
  const updated = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  return c.json(toResponse(updated[0]));
});

router.patch('/:id/handover', async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Wypożyczenie nie istnieje');
  if (existing[0].status !== 'reserved')
    badRequest('Wypożyczenie nie jest zarezerwowane');
  const conflicting = await db
    .select({ id: borrowings.id })
    .from(borrowings)
    .where(
      and(
        eq(borrowings.itemId, existing[0].itemId),
        ne(borrowings.id, id),
        eq(borrowings.status, 'borrowed')
      )
    )
    .limit(1);
  if (conflicting.length > 0) badRequest('Przedmiot jest już wypożyczony');

  const userId = c.get('userId');
  const item = await db
    .select({ ownerId: items.ownerId })
    .from(items)
    .innerJoin(borrowings, eq(borrowings.itemId, items.id))
    .where(eq(borrowings.id, id))
    .limit(1);

  const isAdmin = c.get('userRole') === 'admin';
  const isOwner = item[0]?.ownerId === userId;
  const isBorrower = existing[0].borrowerId === userId;
  const isAsynchronous = existing[0].mode === 'asynchronous';

  if (!isAdmin && !isOwner && !(isAsynchronous && isBorrower)) {
    forbidden(
      'Tylko administrator, opiekun albo odbiorca w trybie asynchronicznym może potwierdzić wydanie'
    );
  }

  await db
    .update(borrowings)
    .set({ status: 'borrowed', handedOverAt: sql`NOW()` })
    .where(eq(borrowings.id, id));
  await refreshItemStatusFromBorrowings(db, existing[0].itemId);
  const updated = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: updated[0].itemId,
    action: 'ITEM_BORROWED',
    oldValue: {
      status: existing[0].status,
    },
    newValue: {
      status: updated[0].status,
      handedOverAt: updated[0].handedOverAt,
    },
  });

  return c.json(toResponse(updated[0]));
});

const returnSchema = z.object({
  comment: z.string().optional(),
  returnComment: z.string().optional(),
});
router.patch('/:id/return', zValidator('json', returnSchema), async (c) => {
  const db = c.get('db');
  const id = Number(c.req.param('id'));
  const existing = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);
  if (existing.length === 0) notFound('Wypożyczenie nie istnieje');
  if (existing[0].status !== 'borrowed')
    badRequest('Można zwrócić tylko wypożyczony przedmiot');

  const userId = c.get('userId');
  const isAdmin = c.get('userRole') === 'admin';
  const isBorrower = existing[0].borrowerId === userId;
  const isClassic = existing[0].mode === 'classic';

  const item = await db
    .select({ ownerId: items.ownerId })
    .from(items)
    .where(eq(items.id, existing[0].itemId))
    .limit(1);
  const isOwner = item[0]?.ownerId === userId;

  if (isClassic && !isAdmin && !isOwner) {
    forbidden(
      'W trybie klasycznym tylko administrator albo opiekun może potwierdzić zwrot'
    );
  }
  if (!isClassic && !isAdmin && !isOwner && !isBorrower) {
    forbidden(
      'Tylko administrator, opiekun albo wypożyczający może zwrócić przedmiot'
    );
  }

  await db
    .update(borrowings)
    .set({
      status: 'returned',
      returnedAt: sql`NOW()`,
      returnComment:
        c.req.valid('json').returnComment ??
        c.req.valid('json').comment ??
        null,
    })
    .where(eq(borrowings.id, id));
  await refreshItemStatusFromBorrowings(db, existing[0].itemId);
  const updated = await db
    .select()
    .from(borrowings)
    .where(eq(borrowings.id, id))
    .limit(1);

  await createAuditLog(db, {
    userId: c.get('userId'),
    itemId: updated[0].itemId,
    action: 'BORROWING_RETURNED',
    oldValue: {
      status: existing[0].status,
    },
    newValue: {
      status: updated[0].status,
      returnedAt: updated[0].returnedAt,
      returnComment: updated[0].returnComment,
    },
  });

  return c.json(toResponse(updated[0]));
});

export { router as borrowingsRouter };
