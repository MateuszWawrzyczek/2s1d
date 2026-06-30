import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { itemPhotos, items, users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { notFound, badRequest } from '../lib/errors';
import { createAuditLog } from '../lib/audit';
import { createObjectStorage } from '../lib/storage';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'none' | 'admin' | 'user';
  isAuthenticated: boolean;
};
const router = new Hono<{ Variables: Variables; Bindings: Env }>();
router.use('/*', authMiddleware);

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

interface PhotoResponseRow {
  id: number;
  itemId: number;
  uploadedById: number;
  uploadedByName: string | null;
  originalFilename: string;
  contentType: string;
  storagePath: string;
  addedAt: Date;
}

function toResponse(p: PhotoResponseRow) {
  return {
    id: p.id,
    itemId: p.itemId,
    uploadedById: p.uploadedById,
    uploadedByName: p.uploadedByName,
    originalFilename: p.originalFilename,
    contentType: p.contentType,
    storagePath: p.storagePath,
    addedAt: p.addedAt,
  };
}

async function ensureItemExists(
  db: MySql2Database<Record<string, never>>,
  itemId: number
) {
  const item = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  if (item.length === 0) notFound('Przedmiot nie istnieje');
  return item[0];
}

// Nested under items: /api/v1/items/:itemId/photos
router.get('/:itemId/photos', async (c) => {
  const db = c.get('db');
  const itemId = Number(c.req.param('itemId'));
  if (!Number.isInteger(itemId) || itemId <= 0)
    badRequest('Identyfikator przedmiotu musi być dodatnią liczbą całkowitą');
  await ensureItemExists(db, itemId);
  const rows = await db
    .select({
      id: itemPhotos.id,
      itemId: itemPhotos.itemId,
      uploadedById: itemPhotos.uploadedById,
      originalFilename: itemPhotos.originalFilename,
      contentType: itemPhotos.contentType,
      storagePath: itemPhotos.storagePath,
      addedAt: itemPhotos.addedAt,
      uploadedByName: users.email,
    })
    .from(itemPhotos)
    .leftJoin(users, eq(itemPhotos.uploadedById, users.id))
    .where(eq(itemPhotos.itemId, itemId))
    .orderBy(desc(itemPhotos.addedAt));
  return c.json(rows.map(toResponse));
});

router.post('/:itemId/photos', async (c) => {
  const db = c.get('db');
  const storage = createObjectStorage(c.env);
  const itemId = Number(c.req.param('itemId'));
  const userId = c.get('userId');
  if (!Number.isInteger(itemId) || itemId <= 0)
    badRequest('Identyfikator przedmiotu musi być dodatnią liczbą całkowitą');
  await ensureItemExists(db, itemId);
  const formData = await c.req.formData();
  const candidate = formData.get('file');
  if (!(candidate instanceof File)) badRequest('Nie przesłano pliku');
  const file = candidate;
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES)
    badRequest('Zdjęcie musi mieć od 1 bajta do 10 MB');
  if (!ALLOWED_PHOTO_TYPES.has(file.type))
    badRequest('Dozwolone są tylko zdjęcia JPEG, PNG, WebP i GIF');

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extensionByType[file.type];
  const storagePath = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
  await storage.put(storagePath, file.stream(), {
    contentType: file.type || 'application/octet-stream',
  });

  let result;
  try {
    result = await db.insert(itemPhotos).values({
      itemId,
      uploadedById: userId,
      originalFilename: file.name.slice(0, 255),
      contentType: file.type,
      storagePath,
    });
  } catch (error) {
    await storage.delete(storagePath);
    throw error;
  }
  const created = await db
    .select({
      id: itemPhotos.id,
      itemId: itemPhotos.itemId,
      uploadedById: itemPhotos.uploadedById,
      originalFilename: itemPhotos.originalFilename,
      contentType: itemPhotos.contentType,
      storagePath: itemPhotos.storagePath,
      addedAt: itemPhotos.addedAt,
      uploadedByName: users.email,
    })
    .from(itemPhotos)
    .leftJoin(users, eq(itemPhotos.uploadedById, users.id))
    .where(eq(itemPhotos.id, result[0].insertId))
    .limit(1);

  await createAuditLog(db, {
    userId,
    itemId,
    action: 'PHOTO_ADDED',
    newValue: {
      photoId: created[0].id,
      filename: created[0].originalFilename,
      contentType: created[0].contentType,
      uploadedBy: created[0].uploadedByName,
      addedAt: created[0].addedAt,
    },
  });

  return c.json(toResponse(created[0]), 201);
});

router.get('/:itemId/photos/:photoId', async (c) => {
  const db = c.get('db');
  const storage = createObjectStorage(c.env);
  const itemId = Number(c.req.param('itemId'));
  const photoId = Number(c.req.param('photoId'));
  if (
    !Number.isInteger(itemId) ||
    itemId <= 0 ||
    !Number.isInteger(photoId) ||
    photoId <= 0
  )
    badRequest('Nieprawidłowy identyfikator zdjęcia');
  const rows = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.id, photoId))
    .limit(1);
  if (rows.length === 0 || rows[0].itemId !== itemId)
    notFound('Zdjęcie nie istnieje');
  await ensureItemExists(db, itemId);
  const photo = rows[0];
  const object = await storage.getStream(photo.storagePath);
  if (!object) notFound('Plik zdjęcia nie istnieje w magazynie');
  return new Response(object, {
    headers: {
      'Content-Type': photo.contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(photo.originalFilename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

export { router as itemPhotosRouter };
