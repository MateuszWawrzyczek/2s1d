import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { serve } from '@hono/node-server';
import type { HttpBindings } from '@hono/node-server';
import { createDb } from './db/client';
import { app } from './index';
import { createReturnDueNotifications } from './lib/notifications';
import { storageProxyApp } from './lib/storageProxy';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist/client');
const storageRoot = path.resolve(
  process.env.PHOTOS_STORAGE_DIR ?? '/data/photos'
);
const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 8787);
const hostname = process.env.HOST ?? '0.0.0.0';

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid MYSQL_PORT: ${value}`);
  }
  return parsed;
}

function createHyperdriveFromEnv(): Hyperdrive {
  return {
    host: requiredEnv('MYSQL_HOST'),
    port: parsePort(process.env.MYSQL_PORT, 3306),
    user: requiredEnv('MYSQL_USER'),
    password: requiredEnv('MYSQL_PASSWORD'),
    database: requiredEnv('MYSQL_DATABASE'),
  } as Hyperdrive;
}

function createInMemoryRateLimit(): RateLimit {
  const limit = Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10);
  const periodSeconds = Number(
    process.env.AUTH_RATE_LIMIT_PERIOD_SECONDS ?? 60
  );
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit({ key }: { key: string }) {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + periodSeconds * 1000 });
        return { success: true };
      }
      existing.count += 1;
      return { success: existing.count <= limit };
    },
  } as RateLimit;
}

function createEnv(): Env {
  if (
    process.env.DEV_BYPASS_AUTH === 'true' &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'DEV_BYPASS_AUTH=true is not allowed when NODE_ENV=production'
    );
  }
  if (requiredEnv('JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return {
    HYPERDRIVE: createHyperdriveFromEnv(),
    PHOTOS_LOCAL_DIR: storageRoot,
    AUTH_RATE_LIMITER: createInMemoryRateLimit(),
    DB_POOL: 'true',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL ?? '',
    DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH ?? 'false',
    JWT_SECRET: process.env.JWT_SECRET,
    TRUST_PROXY: process.env.TRUST_PROXY ?? 'false',
  } as Env;
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function startNotificationScheduler(env: Env): void {
  if (process.env.NOTIFICATIONS_SCHEDULER_ENABLED === 'false') return;

  const intervalMinutes = parsePositiveIntegerEnv(
    'NOTIFICATIONS_INTERVAL_MINUTES',
    60
  );
  let running = false;

  const run = async () => {
    if (running) {
      console.warn(
        JSON.stringify({
          message:
            'return due notifications skipped because previous run is still active',
        })
      );
      return;
    }
    running = true;
    const { db, connection } = await createDb(env.HYPERDRIVE);
    try {
      const created = await createReturnDueNotifications(db);
      console.log(
        JSON.stringify({
          message: 'return due notifications processed',
          created,
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: 'return due notifications failed',
          error: error instanceof Error ? error.message : String(error),
        })
      );
    } finally {
      await connection.end();
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), intervalMinutes * 60_000);
  timer.unref();
}

async function staticResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const decodedPath = decodeURIComponent(url.pathname);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = path.resolve(distDir, normalized.slice(1));
  const indexPath = path.join(distDir, 'index.html');
  const targetPath = requestedPath.startsWith(`${distDir}${path.sep}`)
    ? requestedPath
    : indexPath;

  try {
    const fileStat = await stat(targetPath);
    if (fileStat.isFile()) {
      return new Response(await readFile(targetPath), {
        headers: {
          'Content-Type':
            mimeTypes[path.extname(targetPath)] ?? 'application/octet-stream',
          'Cache-Control': targetPath.endsWith('index.html')
            ? 'no-cache'
            : 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch {
    // Fall through to SPA entrypoint.
  }

  return new Response(await readFile(indexPath), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

const env = createEnv();
startNotificationScheduler(env);
app.route('/storage', storageProxyApp);

serve(
  {
    fetch: (request, nodeEnv) => {
      const url = new URL(request.url);
      const headers = new Headers(request.headers);
      const remoteAddress = (nodeEnv as HttpBindings | undefined)?.incoming
        ?.socket.remoteAddress;
      if (remoteAddress) headers.set('X-Real-IP', remoteAddress);
      const normalizedRequest = new Request(request, { headers });
      if (
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/storage/')
      ) {
        return app.fetch(normalizedRequest, env);
      }
      return staticResponse(normalizedRequest);
    },
    hostname,
    port,
    createServer,
  },
  (info) => {
    console.log(
      JSON.stringify({
        message: 'server started',
        hostname: info.address,
        port: info.port,
      })
    );
  }
);
