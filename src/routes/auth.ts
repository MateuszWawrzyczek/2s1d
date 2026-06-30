import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { users } from '../db/schema';
import { createAuthToken } from '../middleware/auth';
import { badRequest, tooManyRequests, unauthorized } from '../lib/errors';
import {
  hashPassword,
  verifyLegacyPassword,
  verifyPassword,
} from '../lib/password';
import { authMiddleware } from '../middleware/auth';

type Variables = { db: MySql2Database<Record<string, never>> };

const router = new Hono<{ Variables: Variables; Bindings: Env }>();

async function enforceAuthRateLimit(
  env: Env,
  ipAddress: string
): Promise<void> {
  const outcome = await env.AUTH_RATE_LIMITER.limit({ key: ipAddress });
  if (!outcome.success) tooManyRequests('Too many authentication attempts');
}

function getClientIp(c: {
  req: { header: (name: string) => string | undefined };
  env: Env;
}): string {
  const trustProxy =
    (c.env as Env & { TRUST_PROXY?: string }).TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwardedFor = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();
    if (forwardedFor) return forwardedFor;
    const cfConnectingIp = c.req.header('CF-Connecting-IP')?.trim();
    if (cfConnectingIp) return cfConnectingIp;
  }
  return c.req.header('X-Real-IP') ?? 'local';
}

// ─── Register (local password) ─────────────────────────────────────────────

const registerSchema = z.object({
  email: z
    .string()
    .email('Podaj prawidłowy adres e-mail.')
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
    .max(128, 'Hasło może mieć maksymalnie 128 znaków.'),
});

router.post(
  '/register',
  zValidator('json', registerSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          detail:
            result.error.issues[0]?.message ?? 'Niepoprawne dane formularza.',
        },
        400
      );
    }
  }),
  async (c) => {
    await enforceAuthRateLimit(c.env, getClientIp(c));
    const db = c.get('db');
    const body = c.req.valid('json');

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existing.length > 0)
      badRequest('Użytkownik z tym adresem e-mail już istnieje');

    const hashedPassword = await hashPassword(body.password);

    await db.insert(users).values({
      email: body.email,
      hashedPassword,
      role: 'user',
      isActive: false,
      authProvider: 'local',
    });

    return c.json(
      { message: 'Konto wymaga zatwierdzenia przez administratora' },
      201
    );
  }
);

const loginSchema = z.object({
  email: z
    .string()
    .email('Podaj prawidłowy adres e-mail.')
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post(
  '/login',
  zValidator('json', loginSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          detail:
            result.error.issues[0]?.message ?? 'Niepoprawne dane formularza.',
        },
        400
      );
    }
  }),
  async (c) => {
    await enforceAuthRateLimit(c.env, getClientIp(c));
    const db = c.get('db');
    const { email, password } = c.req.valid('json');
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = userRows[0];

    if (!user?.hashedPassword) unauthorized('Nieprawidłowy e-mail lub hasło');
    let passwordValid = await verifyPassword(password, user.hashedPassword);
    if (
      !passwordValid &&
      (await verifyLegacyPassword(password, user.hashedPassword))
    ) {
      passwordValid = true;
      await db
        .update(users)
        .set({ hashedPassword: await hashPassword(password) })
        .where(eq(users.id, user.id));
    }
    if (!passwordValid) {
      unauthorized('Nieprawidłowy e-mail lub hasło');
    }
    if (!user.isActive)
      unauthorized('Konto wymaga zatwierdzenia przez administratora');

    return c.json(await authResponse(user, c.env.JWT_SECRET));
  }
);

// ─── Google Workspace SSO ───────────────────────────────────────────────────
//
// Flow:
// 1. Frontend loads Google Identity Services, user clicks "Sign in with Google".
// 2. Google returns an ID token for the signed-in Google Workspace account.
// 3. Frontend POSTs { credential } (the ID token) to /google-login.
// 4. Backend verifies the ID token with Google's tokeninfo endpoint,
//    enforces the AGH Workspace domain, and creates/updates the user.
// 5. Backend returns a pz-worker JWT.

// Environment variable: DEV_BYPASS_AUTH
// When set to anything truthy ("true", "1"), the Google token verification
// is SKIPPED and the backend trusts the email sent by the frontend.
// This is for development/demo only — NEVER set in production.

interface GoogleIdToken {
  iss: string; // "https://accounts.google.com" or "accounts.google.com"
  sub: string; // Google user ID
  email: string;
  email_verified: boolean | string;
  name?: string;
  picture?: string;
  hd?: string; // hosted domain (Google Workspace)
  aud: string;
}

const allowedGoogleWorkspaceDomains = ['agh.edu.pl', 'student.agh.edu.pl'];
const allowedGoogleWorkspaceDomainMessage =
  'Dozwolone są tylko konta Google Workspace w domenie @agh.edu.pl albo @student.agh.edu.pl';

const googleLoginSchema = z.object({
  credential: z.string().min(1), // Google ID token (or dev bypass email)
});

function isGoogleEmailVerified(
  value: GoogleIdToken['email_verified']
): boolean {
  return value === true || value === 'true';
}

function getEmailDomain(email: string): string | undefined {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return undefined;
  return email.slice(atIndex + 1).toLowerCase();
}

function isAllowedGoogleWorkspaceDomain(domain: string | undefined): boolean {
  return Boolean(
    domain && allowedGoogleWorkspaceDomains.includes(domain.toLowerCase())
  );
}

function enforceAllowedEmailDomain(email: string): void {
  if (!isAllowedGoogleWorkspaceDomain(getEmailDomain(email))) {
    unauthorized(allowedGoogleWorkspaceDomainMessage);
  }
}

function enforceGoogleWorkspaceDomain(payload: GoogleIdToken): void {
  if (!isAllowedGoogleWorkspaceDomain(payload.hd)) {
    unauthorized(allowedGoogleWorkspaceDomainMessage);
  }
}

router.post(
  '/google-login',
  zValidator('json', googleLoginSchema),
  async (c) => {
    await enforceAuthRateLimit(c.env, getClientIp(c));
    const db = c.get('db');
    const { credential } = c.req.valid('json');

    let googleId: string;
    let email: string;

    // ── Dev bypass ────────────────────────────────────────────────────────
    const devBypass =
      c.env.DEV_BYPASS_AUTH === 'true' || c.env.DEV_BYPASS_AUTH === '1';
    if (devBypass) {
      // credential is treated as a plain email address for dev convenience
      email = credential.trim().toLowerCase();
      // Validate it looks like an email
      if (!email.includes('@')) {
        badRequest(
          'DEV_BYPASS_AUTH is enabled — credential must be an email address'
        );
      }
      enforceAllowedEmailDomain(email);
      // Generate a fake stable google ID from the email
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(email)
      );
      googleId =
        'dev-' +
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 32);
    }
    // ── Production: verify Google ID token ─────────────────────────────────
    else {
      try {
        if (!c.env.GOOGLE_CLIENT_ID)
          unauthorized('Google authentication is not configured');
        // Verify ID token with Google's tokeninfo endpoint
        const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
        const verifyResp = await fetch(verifyUrl);
        if (!verifyResp.ok) {
          unauthorized('Invalid Google ID token');
        }
        const payload = (await verifyResp.json()) as GoogleIdToken;

        // Validate issuer
        const validIssuers = [
          'https://accounts.google.com',
          'accounts.google.com',
        ];
        if (!validIssuers.includes(payload.iss)) {
          unauthorized('Invalid token issuer');
        }
        if (payload.aud !== c.env.GOOGLE_CLIENT_ID) {
          unauthorized('Invalid token audience');
        }

        // Require verified email
        if (!isGoogleEmailVerified(payload.email_verified)) {
          unauthorized('Email not verified by Google');
        }

        email = payload.email.trim().toLowerCase();
        enforceAllowedEmailDomain(email);
        enforceGoogleWorkspaceDomain(payload);
        googleId = payload.sub;
      } catch (err) {
        // Re-throw our own AppErrors so the global onError handler can format them
        if (err instanceof HTTPException) throw err;
        console.error(
          JSON.stringify({
            message: 'Google token verification failed',
            error: String(err),
          })
        );
        unauthorized('Google authentication failed');
      }
    }

    // ── Upsert user ───────────────────────────────────────────────────────
    // Find existing user by googleId OR email
    let userRows = await db
      .select()
      .from(users)
      .where(
        and(eq(users.googleId, googleId), eq(users.authProvider, 'google'))
      )
      .limit(1);

    if (userRows.length === 0) {
      // Check if email exists with different provider
      const emailRows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (emailRows.length > 0) {
        const existing = emailRows[0];
        // Link Google account to existing user
        await db
          .update(users)
          .set({ googleId, authProvider: 'google' })
          .where(eq(users.id, existing.id));
        userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, existing.id))
          .limit(1);
      } else {
        const result = await db.insert(users).values({
          email,
          googleId,
          authProvider: 'google',
          hashedPassword: null,
          role: 'user',
          isActive: false,
        });
        const created = await db
          .select()
          .from(users)
          .where(eq(users.id, result[0].insertId))
          .limit(1);
        userRows = created;
      }
    }

    const user = userRows[0];
    if (!user.isActive)
      unauthorized('Konto wymaga zatwierdzenia przez administratora');

    return c.json(await authResponse(user, c.env.JWT_SECRET));
  }
);

async function authResponse(
  user: typeof users.$inferSelect,
  secret: string | undefined
) {
  if (!secret) unauthorized('Auth not configured');
  const token = await createAuthToken(
    user.id,
    user.role as 'admin' | 'user',
    secret
  );
  return {
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.isActive,
    },
  };
}

// ─── List users (for dropdowns) ────────────────────────────────────────────

// List users (for owners dropdown) — frontend expects GET /api/v1/auth/users
// Response: [{ id, email }]
router.get('/users', authMiddleware, async (c) => {
  const db = c.get('db');
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.isActive, true));
  return c.json(rows);
});

// ─── Auth config (for frontend) ────────────────────────────────────────────

router.get('/config', async (c) => {
  const devBypass =
    c.env.DEV_BYPASS_AUTH === 'true' || c.env.DEV_BYPASS_AUTH === '1';
  return c.json({
    devBypassAuth: devBypass,
    googleClientId: c.env.GOOGLE_CLIENT_ID || '',
  });
});

export { router as authRouter };
