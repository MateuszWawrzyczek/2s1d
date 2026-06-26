import { auditLogs } from '../db/schema';
import type { MySql2Database } from 'drizzle-orm/mysql2';

export async function createAuditLog(
  db: MySql2Database<Record<string, never>>,
  params: {
    userId: number;
    itemId: number;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
) {
  await db.insert(auditLogs).values({
    userId: params.userId,
    itemId: params.itemId,
    action: params.action,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
  });
}
