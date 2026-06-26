import mysql from 'mysql2/promise';
import { DEFAULT_LOCATIONS, SYSTEM_STATUSES } from './seed';
import { hashPassword } from '../lib/password';

function getInitialAdminEmail(): string {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('INITIAL_ADMIN_EMAIL is required');
  return email;
}

function getInitialAdminPassword(): string {
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD must be set and at least 12 characters'
    );
  }
  return password;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    disableEval: true,
    charset: 'utf8mb4',
  });

  try {
    const [statusRows] = await connection.query(
      'SELECT COUNT(*) as count FROM `item_status`'
    );
    const statusCount = (statusRows as { count: number }[])[0]?.count ?? 0;
    if (statusCount === 0) {
      for (const status of SYSTEM_STATUSES) {
        await connection.query(
          'INSERT INTO `item_status` (name, is_system, slug) VALUES (?, ?, ?)',
          [status.name, status.isSystem, status.slug]
        );
      }
      console.log('Seeded default item statuses.');
    }

    const [locationRows] = await connection.query(
      'SELECT COUNT(*) as count FROM `locations`'
    );
    const locationCount = (locationRows as { count: number }[])[0]?.count ?? 0;
    if (locationCount === 0) {
      for (const location of DEFAULT_LOCATIONS) {
        await connection.query(
          'INSERT INTO `locations` (name, kind, building, room) VALUES (?, ?, ?, ?)',
          [location.name, location.kind, location.building, location.room]
        );
      }
      console.log('Seeded default locations.');
    }

    const [userRows] = await connection.query(
      'SELECT COUNT(*) as count FROM `users`'
    );
    const userCount = (userRows as { count: number }[])[0]?.count ?? 0;
    if (userCount === 0) {
      const initialAdminEmail = getInitialAdminEmail();
      const hashedPassword = await hashPassword(getInitialAdminPassword());
      await connection.query(
        'INSERT INTO `users` (email, hashed_password, auth_provider, is_active, role) VALUES (?, ?, ?, ?, ?)',
        [initialAdminEmail, hashedPassword, 'local', true, 'admin']
      );
      console.log(`Seeded default admin user: ${initialAdminEmail}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
