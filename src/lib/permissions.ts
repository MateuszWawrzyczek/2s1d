import { eq, or, and, inArray } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { delegations, groupMembers, groups } from '../db/schema';

export type PermissionLevel = 'admin' | 'owner' | 'manage' | 'edit' | null;

const FULL_ITEM_UPDATE_FIELDS = new Set([
  'name',
  'manufacturer',
  'model',
  'serial',
  'inventoryNumber',
  'description',
  'purchaseDate',
  'systemId',
  'categoryId',
  'statusId',
  'locationId',
  'ownerId',
  'ownerGroupId',
]);
const EDIT_ITEM_UPDATE_FIELDS = new Set(['statusId', 'description']);

export function canUpdateItemField(
  permission: Exclude<PermissionLevel, null>,
  field: string
): boolean {
  return permission === 'edit'
    ? EDIT_ITEM_UPDATE_FIELDS.has(field)
    : FULL_ITEM_UPDATE_FIELDS.has(field);
}

export async function getItemPermissionLevel(
  db: MySql2Database<Record<string, never>>,
  itemId: number,
  userId: number,
  userRole: 'none' | 'admin' | 'user',
  ownerId: number | null,
  ownerGroupId?: number | null
): Promise<PermissionLevel> {
  if (userRole === 'admin') return 'admin';
  if (ownerId !== null && ownerId === userId) return 'owner';

  // Check delegations
  const userGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = userGroups.map((g) => g.groupId);

  if (ownerGroupId != null && groupIds.includes(ownerGroupId)) {
    const ownerGroup = await db
      .select({ defaultPermission: groups.defaultPermission })
      .from(groups)
      .where(eq(groups.id, ownerGroupId))
      .limit(1);
    if (ownerGroup[0]?.defaultPermission === 'manage') return 'manage';
    if (ownerGroup[0]?.defaultPermission === 'edit') return 'edit';
  }

  const conditions = [eq(delegations.userId, userId)];
  if (groupIds.length > 0) {
    conditions.push(inArray(delegations.groupId, groupIds));
  }

  const perms = await db
    .select({ permission: delegations.permission })
    .from(delegations)
    .where(and(eq(delegations.itemId, itemId), or(...conditions)));

  if (perms.some((p) => p.permission === 'manage')) return 'manage';
  if (perms.some((p) => p.permission === 'edit')) return 'edit';

  return null;
}
