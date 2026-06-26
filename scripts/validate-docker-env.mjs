const required = [
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'JWT_SECRET',
  'INITIAL_ADMIN_EMAIL',
  'INITIAL_ADMIN_PASSWORD',
];
const weakValues = new Set([
  'root',
  'password',
  'pz_pass',
  'change-me-root-password',
  'change-me-user-password',
  'change-me-initial-admin-password',
  'generate-at-least-32-random-characters',
  'docker-development-secret-change-me',
]);

const errors = [];

for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is required`);
    continue;
  }
  if (weakValues.has(value)) {
    errors.push(`${name} must not use a placeholder or default value`);
  }
}

for (const name of ['MYSQL_ROOT_PASSWORD']) {
  const value = process.env[name]?.trim();
  if (value && weakValues.has(value)) {
    errors.push(`${name} must not use a placeholder or default value`);
  }
}

if ((process.env.JWT_SECRET?.trim().length ?? 0) < 32) {
  errors.push('JWT_SECRET must be at least 32 characters');
}

if ((process.env.INITIAL_ADMIN_PASSWORD?.length ?? 0) < 12) {
  errors.push('INITIAL_ADMIN_PASSWORD must be at least 12 characters');
}

if (process.env.DEV_BYPASS_AUTH === 'true') {
  errors.push('DEV_BYPASS_AUTH=true is not allowed for Docker production');
}

if (
  process.env.TRUST_PROXY &&
  !['true', 'false'].includes(process.env.TRUST_PROXY)
) {
  errors.push('TRUST_PROXY must be "true" or "false"');
}

if (process.env.NOTIFICATIONS_INTERVAL_MINUTES) {
  const interval = Number(process.env.NOTIFICATIONS_INTERVAL_MINUTES);
  if (!Number.isInteger(interval) || interval <= 0) {
    errors.push('NOTIFICATIONS_INTERVAL_MINUTES must be a positive integer');
  }
}

for (const name of ['DB_CONNECTION_LIMIT', 'DB_QUEUE_LIMIT']) {
  if (!process.env[name]) continue;
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${name} must be a non-negative integer`);
  }
}

if (
  process.env.GOOGLE_CLIENT_ID &&
  !process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
) {
  errors.push('GOOGLE_CLIENT_ID must be a Google OAuth web client ID');
}

if (
  process.env.INITIAL_ADMIN_EMAIL &&
  !/^[^@\s]+@agh\.edu\.pl$/i.test(process.env.INITIAL_ADMIN_EMAIL)
) {
  errors.push('INITIAL_ADMIN_EMAIL must be an @agh.edu.pl address');
}

if (errors.length > 0) {
  errors.forEach((error) => console.error(`Docker config: ${error}`));
  process.exitCode = 1;
} else {
  console.log('Docker config validated.');
}
