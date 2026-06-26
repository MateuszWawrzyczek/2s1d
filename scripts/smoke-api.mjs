const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8787';
const expectedDevBypass = process.env.SMOKE_EXPECT_DEV_BYPASS === 'true';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@agh.edu.pl';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error('SMOKE_ADMIN_PASSWORD is required');
}

async function expectResponse(path, status, expectedBody) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  if (
    response.status !== status ||
    JSON.stringify(body) !== JSON.stringify(expectedBody)
  ) {
    throw new Error(
      `${path}: expected ${status} ${JSON.stringify(expectedBody)}, received ${response.status} ${JSON.stringify(body)}`
    );
  }
  return response;
}

async function loginAsDefaultAdmin() {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });
  const body = await response.json();
  if (
    response.status !== 200 ||
    typeof body.access_token !== 'string' ||
    body.token_type !== 'bearer' ||
    body.user?.email !== adminEmail ||
    body.user?.role !== 'admin' ||
    body.user?.is_active !== true
  ) {
    throw new Error(
      `/api/v1/auth/login: default admin login failed with ${response.status} ${JSON.stringify(body)}`
    );
  }
}

const health = await expectResponse('/api/health', 200, {
  status: 'ok',
  database: 'ok',
});
await expectResponse('/api/v1/items/', 401, {
  detail: 'Missing or invalid authorization header',
});
await expectResponse('/api/v1/auth/config', 200, {
  devBypassAuth: expectedDevBypass,
  googleClientId: '',
});
await loginAsDefaultAdmin();

if (health.headers.get('x-content-type-options') !== 'nosniff') {
  throw new Error('Security headers are missing');
}

console.log('API smoke checks passed.');
