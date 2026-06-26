import { Hono } from 'hono';
import { createObjectStorage } from './storage';

/**
 * Hono sub-app mounted at `/storage`. Serves raw object bytes when the
 * configured storage adapter returns a relative `/storage/...` URL.
 */
export const storageProxyApp = new Hono<{ Bindings: Env }>();

storageProxyApp.get('/:bucket/:filename', async (c) => {
  const bucket = c.req.param('bucket');
  const filename = c.req.param('filename');
  const key = `${bucket}/${filename}`;
  const storage = createObjectStorage(c.env);
  const bytes = await storage.getBytes(key);
  if (!bytes) return c.json({ detail: 'Not found' }, 404);
  return new Response(bytes.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': bytes.contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

// Allow deeper keys: /storage/items/123/abc.jpg
storageProxyApp.get('/:bucket/:itemId/:filename', async (c) => {
  const bucket = c.req.param('bucket');
  const itemId = c.req.param('itemId');
  const filename = c.req.param('filename');
  const key = `${bucket}/${itemId}/${filename}`;
  const storage = createObjectStorage(c.env);
  const bytes = await storage.getBytes(key);
  if (!bytes) return c.json({ detail: 'Not found' }, 404);
  return new Response(bytes.body as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': bytes.contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});
