import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import type { Connection, Pool } from 'mysql2/promise';

type DatabaseConfig = Pick<
  Hyperdrive,
  'host' | 'user' | 'password' | 'database' | 'port'
>;
type ManagedConnection = Pick<Connection, 'end'>;

let sharedPool: Pool | undefined;
let sharedPoolKey: string | undefined;

function connectionOptions(config: DatabaseConfig) {
  return {
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
    disableEval: true,
    charset: 'utf8mb4',
  };
}

function poolKey(config: DatabaseConfig): string {
  return `${config.user}@${config.host}:${config.port}/${config.database}`;
}

export async function createDb(
  config: DatabaseConfig,
  options: { pooled?: boolean } = {}
) {
  if (options.pooled) {
    const key = poolKey(config);
    if (!sharedPool || sharedPoolKey !== key) {
      if (sharedPool) await sharedPool.end();
      sharedPool = mysql.createPool({
        ...connectionOptions(config),
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
        queueLimit: Number(process.env.DB_QUEUE_LIMIT ?? 0),
      });
      sharedPoolKey = key;
    }
    return {
      db: drizzle(sharedPool),
      connection: { end: async () => undefined } satisfies ManagedConnection,
    };
  }

  const connection = await mysql.createConnection({
    ...connectionOptions(config),
  });
  return { db: drizzle(connection), connection };
}
