import mysql from 'mysql2/promise';

const timeoutMs = Number(process.env.MYSQL_WAIT_TIMEOUT_MS ?? 60_000);
const startedAt = Date.now();

function dbConfig() {
  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'pz_user',
    password: process.env.MYSQL_PASSWORD ?? 'pz_pass',
    database: process.env.MYSQL_DATABASE ?? 'pz_db',
  };
}

while (true) {
  try {
    const connection = await mysql.createConnection(dbConfig());
    await connection.ping();
    await connection.end();
    process.exit(0);
  } catch (error) {
    if (Date.now() - startedAt >= timeoutMs) {
      console.error(
        `MySQL not ready: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}
