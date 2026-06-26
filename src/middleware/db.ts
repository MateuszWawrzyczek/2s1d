import { createMiddleware } from 'hono/factory';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { Connection } from 'mysql2/promise';
import { createDb } from '../db/client';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  rawDb: Pick<Connection, 'end'>;
};

export const dbMiddleware = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const { db, connection } = await createDb(c.env.HYPERDRIVE, {
    pooled: (c.env as Env & { DB_POOL?: string }).DB_POOL === 'true',
  });
  c.set('db', db);
  c.set('rawDb', connection);
  try {
    await next();
  } finally {
    await connection.end();
  }
});
