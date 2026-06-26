import {
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
  boolean,
  uniqueIndex,
  index,
  json,
  datetime,
  date,
  text,
  float,
  timestamp,
  check,
  primaryKey,
} from 'drizzle-orm/mysql-core';
import { foreignKey } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const categories = mysqlTable(
  'categories',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: int('parent_id'),
    legacyTypeId: int('legacy_type_id'),
  },
  (table) => ({
    parentFk: foreignKey({
      name: 'categories_parent_fk',
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  })
);

export const itemStatus = mysqlTable(
  'item_status',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    slug: varchar('slug', { length: 100 }),
    description: varchar('description', { length: 500 }),
  },
  (table) => ({
    nameUnique: uniqueIndex('unique_item_status_name').on(table.name),
  })
);

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }),
  authProvider: mysqlEnum('auth_provider', ['local', 'google'])
    .notNull()
    .default('local'),
  isActive: boolean('is_active').notNull().default(true),
  role: mysqlEnum('role', ['admin', 'user']).notNull().default('user'),
});

export const groups = mysqlTable('groups', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  defaultPermission: mysqlEnum('default_permission', ['manage', 'edit'])
    .notNull()
    .default('edit'),
});

export const groupMembers = mysqlTable(
  'group_members',
  {
    groupId: int('group_id').notNull(),
    userId: int('user_id').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
    groupFk: foreignKey({
      name: 'group_members_group_fk',
      columns: [table.groupId],
      foreignColumns: [groups.id],
    }).onDelete('cascade'),
    userFk: foreignKey({
      name: 'group_members_user_fk',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
  })
);

export const locations = mysqlTable('locations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  kind: mysqlEnum('kind', ['internal', 'external'])
    .notNull()
    .default('internal'),
  building: varchar('building', { length: 80 }),
  room: varchar('room', { length: 80 }),
  cabinet: varchar('cabinet', { length: 80 }),
  shelf: varchar('shelf', { length: 80 }),
  mapX: float('map_x'),
  mapY: float('map_y'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  legacyRoomId: int('legacy_room_id'),
});

export const items = mysqlTable(
  'items',
  {
    id: int('id').autoincrement().primaryKey(),
    systemId: varchar('system_id', { length: 32 }).unique(),
    name: varchar('name', { length: 100 }).notNull(),
    manufacturer: varchar('manufacturer', { length: 100 }),
    model: varchar('model', { length: 100 }),
    serial: varchar('serial', { length: 100 }),
    inventoryNumber: varchar('inventory_number', { length: 100 }),
    description: text('description'),
    purchaseDate: date('purchase_date'),
    addedAt: datetime('added_at'),
    categoryId: int('category_id'),
    statusId: int('status_id'),
    locationId: int('location_id'),
    ownerId: int('owner_id'),
    ownerGroupId: int('owner_group_id'),
    legacyItemId: int('legacy_item_id'),
  },
  (table) => ({
    systemIdIdx: index('items_system_id_idx').on(table.systemId),
    serialIdx: index('items_serial_idx').on(table.serial),
    inventoryNumberIdx: index('items_inv_num_idx').on(table.inventoryNumber),
    legacyIdIdx: index('items_legacy_id_idx').on(table.legacyItemId),
    categoryFk: foreignKey({
      name: 'items_category_fk',
      columns: [table.categoryId],
      foreignColumns: [categories.id],
    }).onDelete('set null'),
    statusFk: foreignKey({
      name: 'items_status_fk',
      columns: [table.statusId],
      foreignColumns: [itemStatus.id],
    }).onDelete('set null'),
    locationFk: foreignKey({
      name: 'items_location_fk',
      columns: [table.locationId],
      foreignColumns: [locations.id],
    }).onDelete('set null'),
    ownerFk: foreignKey({
      name: 'items_owner_fk',
      columns: [table.ownerId],
      foreignColumns: [users.id],
    }).onDelete('set null'),
    ownerGroupFk: foreignKey({
      name: 'items_owner_group_fk',
      columns: [table.ownerGroupId],
      foreignColumns: [groups.id],
    }).onDelete('set null'),
  })
);

export const itemPhotos = mysqlTable(
  'item_photos',
  {
    id: int('id').autoincrement().primaryKey(),
    itemId: int('item_id').notNull(),
    uploadedById: int('uploaded_by_id').notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 120 }).notNull(),
    storagePath: varchar('storage_path', { length: 500 }).notNull(),
    addedAt: timestamp('added_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    itemFk: foreignKey({
      name: 'item_photos_item_fk',
      columns: [table.itemId],
      foreignColumns: [items.id],
    }).onDelete('cascade'),
    uploaderFk: foreignKey({
      name: 'item_photos_uploader_fk',
      columns: [table.uploadedById],
      foreignColumns: [users.id],
    }),
  })
);

export const borrowings = mysqlTable(
  'borrowings',
  {
    id: int('id').autoincrement().primaryKey(),
    itemId: int('item_id').notNull(),
    borrowerId: int('borrower_id'),
    externalBorrower: varchar('external_borrower', { length: 160 }),
    mode: mysqlEnum('mode', [
      'classic',
      'trusted',
      'asynchronous',
      'external',
    ]).notNull(),
    status: mysqlEnum('status', [
      'pending',
      'reserved',
      'borrowed',
      'returned',
      'rejected',
    ])
      .notNull()
      .default('pending'),
    plannedReturnAt: datetime('planned_return_at'),
    approvedAt: datetime('approved_at'),
    handedOverAt: datetime('handed_over_at'),
    returnedAt: datetime('returned_at'),
    returnComment: text('return_comment'),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    itemFk: foreignKey({
      name: 'borrowings_item_fk',
      columns: [table.itemId],
      foreignColumns: [items.id],
    }),
    borrowerFk: foreignKey({
      name: 'borrowings_borrower_fk',
      columns: [table.borrowerId],
      foreignColumns: [users.id],
    }),
  })
);

export const delegations = mysqlTable(
  'delegations',
  {
    id: int('id').autoincrement().primaryKey(),
    itemId: int('item_id').notNull(),
    userId: int('user_id'),
    groupId: int('group_id'),
    permission: mysqlEnum('permission', ['manage', 'edit']).notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex('delegations_item_user_unique').on(
      table.itemId,
      table.userId
    ),
    groupUnique: uniqueIndex('delegations_item_group_unique').on(
      table.itemId,
      table.groupId
    ),
    targetCheck: check(
      'delegations_exactly_one_target',
      sql`(${table.userId} IS NULL) <> (${table.groupId} IS NULL)`
    ),
    itemFk: foreignKey({
      name: 'delegations_item_fk',
      columns: [table.itemId],
      foreignColumns: [items.id],
    }).onDelete('cascade'),
    userFk: foreignKey({
      name: 'delegations_user_fk',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    groupFk: foreignKey({
      name: 'delegations_group_fk',
      columns: [table.groupId],
      foreignColumns: [groups.id],
    }).onDelete('cascade'),
  })
);

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').autoincrement().primaryKey(),
  timestamp: timestamp('timestamp')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  userId: int('user_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  itemId: int('item_id').notNull(),
  oldValue: json('old_value'),
  newValue: json('new_value'),
});

export const notificationPreferences = mysqlTable('notification_preferences', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().unique(),
  emailEnabled: boolean('email_enabled').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(false),
  returnDueNoticeHours: int('return_due_notice_hours').notNull().default(24),
});

export const notificationEvents = mysqlTable(
  'notification_events',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull(),
    borrowingId: int('borrowing_id'),
    eventType: mysqlEnum('event_type', [
      'return_due',
      'borrowing_approved',
    ]).notNull(),
    channel: mysqlEnum('channel', ['in_app', 'email', 'push']).notNull(),
    payload: varchar('payload', { length: 1000 }).notNull(),
    scheduledAt: datetime('scheduled_at').notNull(),
    sentAt: datetime('sent_at'),
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userFk: foreignKey({
      name: 'notification_events_user_fk',
      columns: [table.userId],
      foreignColumns: [users.id],
    }),
    borrowingFk: foreignKey({
      name: 'notification_events_borrowing_fk',
      columns: [table.borrowingId],
      foreignColumns: [borrowings.id],
    }),
    deliveryUnique: uniqueIndex('notification_events_delivery_unique').on(
      table.userId,
      table.borrowingId,
      table.eventType,
      table.channel
    ),
  })
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Status = typeof itemStatus.$inferSelect;
export type NewStatus = typeof itemStatus.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemPhoto = typeof itemPhotos.$inferSelect;
export type NewItemPhoto = typeof itemPhotos.$inferInsert;
export type Borrowing = typeof borrowings.$inferSelect;
export type NewBorrowing = typeof borrowings.$inferInsert;
export type Delegation = typeof delegations.$inferSelect;
export type NewDelegation = typeof delegations.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type NewNotificationEvent = typeof notificationEvents.$inferInsert;
