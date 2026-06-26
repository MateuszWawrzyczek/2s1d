import { createDb } from '../db/client';
import { createReturnDueNotifications } from '../lib/notifications';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function mysqlPort(): number {
  const value = Number(process.env.MYSQL_PORT ?? 3306);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`Invalid MYSQL_PORT: ${process.env.MYSQL_PORT}`);
  }
  return value;
}

const { db, connection } = await createDb({
  host: requiredEnv('MYSQL_HOST'),
  port: mysqlPort(),
  user: requiredEnv('MYSQL_USER'),
  password: requiredEnv('MYSQL_PASSWORD'),
  database: requiredEnv('MYSQL_DATABASE'),
});

try {
  const created = await createReturnDueNotifications(db);
  console.log(
    JSON.stringify({ message: 'return due notifications processed', created })
  );
} finally {
  await connection.end();
}
