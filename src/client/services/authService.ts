export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

export interface AuthConfig {
  devBypassAuth: boolean;
  googleClientId: string;
}

interface GoogleLoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';
export interface RegisterPayload {
  email: string;
  password: string;
}

export type LoginPayload = RegisterPayload;

export const authService = {
  /**
   * Google Workspace SSO login.
   * @param credential Google ID token from GIS (or AGH email string when dev bypass is active)
   */
  async googleLogin(credential: string): Promise<AuthSession> {
    const response = await fetch('/api/v1/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    await ensureOk(response);
    const data: GoogleLoginResponse = await response.json();
    return storeSession(data);
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    const data: GoogleLoginResponse = await response.json();
    return storeSession(data);
  },

  /** Fetch auth configuration (dev bypass flag, Google client ID) */
  async getConfig(): Promise<AuthConfig> {
    const response = await fetch('/api/v1/auth/config');
    if (!response.ok) {
      return {
        devBypassAuth: false,
        googleClientId: '',
      };
    }
    const data = (await response.json()) as Partial<AuthConfig>;
    return {
      devBypassAuth: Boolean(data.devBypassAuth),
      googleClientId: data.googleClientId ?? '',
    };
  },

  getSessionUser(): AuthUser | null {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  async register(payload: RegisterPayload): Promise<void> {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
  },

  logout(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('auth-session-changed'));
  },
};

function storeSession(data: GoogleLoginResponse): AuthSession {
  const session = {
    accessToken: data.access_token,
    tokenType: data.token_type,
    user: data.user,
  };
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  window.dispatchEvent(new Event('auth-session-changed'));
  return session;
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {
    // Keep fallback error.
  }
  throw new Error(detail);
}
