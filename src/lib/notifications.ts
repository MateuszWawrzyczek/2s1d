import { and, eq, isNotNull, lte } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import {
  borrowings,
  items,
  notificationEvents,
  notificationPreferences,
} from '../db/schema';

type Database = MySql2Database<Record<string, never>>;

export async function createBorrowingApprovedNotification(
  db: Database,
  borrowing: typeof borrowings.$inferSelect
): Promise<void> {
  if (!borrowing.borrowerId) return;
  const item = await db
    .select({ name: items.name })
    .from(items)
    .where(eq(items.id, borrowing.itemId))
    .limit(1);
  await db
    .insert(notificationEvents)
    .values({
      userId: borrowing.borrowerId,
      borrowingId: borrowing.id,
      eventType: 'borrowing_approved',
      channel: 'in_app',
      payload: `Wypożyczenie przedmiotu "${item[0]?.name ?? borrowing.itemId}" zostało zatwierdzone.`,
      scheduledAt: new Date(),
      sentAt: new Date(),
    })
    .onDuplicateKeyUpdate({ set: { sentAt: new Date() } });
}

export async function createReturnDueNotifications(
  db: Database,
  now = new Date()
): Promise<number> {
  const horizon = new Date(now.getTime() + 720 * 60 * 60 * 1000);
  const rows = await db
    .select({
      borrowingId: borrowings.id,
      borrowerId: borrowings.borrowerId,
      plannedReturnAt: borrowings.plannedReturnAt,
      itemName: items.name,
      noticeHours: notificationPreferences.returnDueNoticeHours,
    })
    .from(borrowings)
    .innerJoin(items, eq(items.id, borrowings.itemId))
    .leftJoin(
      notificationPreferences,
      eq(notificationPreferences.userId, borrowings.borrowerId)
    )
    .where(
      and(
        eq(borrowings.status, 'borrowed'),
        isNotNull(borrowings.borrowerId),
        isNotNull(borrowings.plannedReturnAt),
        lte(borrowings.plannedReturnAt, horizon)
      )
    );

  let created = 0;
  for (const row of rows) {
    if (!row.borrowerId || !row.plannedReturnAt) continue;
    const noticeHours = row.noticeHours ?? 24;
    const hoursRemaining =
      (row.plannedReturnAt.getTime() - now.getTime()) / 3_600_000;
    if (hoursRemaining > noticeHours) continue;

    const result = await db
      .insert(notificationEvents)
      .values({
        userId: row.borrowerId,
        borrowingId: row.borrowingId,
        eventType: 'return_due',
        channel: 'in_app',
        payload: `Termin zwrotu przedmiotu "${row.itemName}" upływa ${row.plannedReturnAt.toLocaleString('pl-PL')}.`,
        scheduledAt: now,
        sentAt: now,
      })
      .onDuplicateKeyUpdate({ set: { borrowingId: row.borrowingId } });
    if (result[0].insertId > 0) created += 1;
  }
  return created;
}
