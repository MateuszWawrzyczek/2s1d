import { createMiddleware } from 'hono/factory';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { unauthorized } from '../lib/errors';

type Variables = {
  db: MySql2Database<Record<string, never>>;
  userId: number;
  userRole: 'admin' | 'user';
  isAuthenticated: boolean;
};

interface TokenPayload {
  userId: number;
  role: 'admin' | 'user';
  exp: number;
}

function base64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signToken(
  payload: TokenPayload,
  secret: string
): Promise<string> {
  if (!secret) throw new Error('JWT_SECRET is not set');
  const encoder = new TextEncoder();
  const header = base64url(
    encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );
  const body = base64url(encoder.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${header}.${body}`)
  );

  return `${header}.${body}.${base64url(new Uint8Array(signature))}`;
}

async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload | null> {
  try {
    if (!secret) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = `${parts[0]}.${parts[1]}`;
    const sig = base64urlDecode(parts[2]);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sig.buffer as ArrayBuffer,
      encoder.encode(data)
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[1]))
    ) as TokenPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function createAuthToken(
  userId: number,
  role: 'admin' | 'user',
  secret: string
): Promise<string> {
  return signToken(
    {
      userId,
      role,
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    secret
  );
}

export const authMiddleware = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    unauthorized('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ message: 'JWT_SECRET not configured' }));
    unauthorized('Auth not configured');
  }

  const payload = await verifyToken(token, secret);
  if (!payload) {
    unauthorized('Invalid or expired token');
  }

  const db = c.get('db');
  const userRows = await db
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || !user.isActive) {
    unauthorized('Konto wymaga zatwierdzenia przez administratora');
  }
  c.set('userId', user.id);
  c.set('userRole', user.role as 'admin' | 'user');
  c.set('isAuthenticated', true);

  await next();
});

export type AuthVariables = Variables;
