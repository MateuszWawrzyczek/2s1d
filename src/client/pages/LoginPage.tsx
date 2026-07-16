import { useState, useEffect, type FormEvent, useCallback } from 'react';
import { authService } from '../services/authService';

// Extend window to declare google type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            hd?: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: unknown) => void) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Auth config ──────────────────────────────────────────────────────────
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [devBypassAuth, setDevBypassAuth] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    void authService
      .getConfig()
      .then((cfg) => {
        setDevBypassAuth(cfg.devBypassAuth);
        setGoogleClientId(cfg.googleClientId);
      })
      .catch(() => setConfigError('Nie udało się pobrać konfiguracji logowania.'))
      .finally(() => setIsConfigLoading(false));
  }, []);

  // ── Google Sign-In callback ──────────────────────────────────────────────

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setGoogleError(null);
    setIsSubmitting(true);
    try {
      await authService.googleLogin(credential);
    } catch (err) {
      setGoogleError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zalogować przez Google.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Initialize Google Identity Services when client ID is available
  useEffect(() => {
    if (!googleClientId || devBypassAuth) return;
    let cancelled = false;
    let retryTimer: number | undefined;

    // Load GIS script if not already loaded
    const scriptId = 'google-gis-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogle();
      };
      script.onerror = () => {
        if (!cancelled) {
          setGoogleError('Nie udało się załadować przycisku logowania Google.');
        }
      };
      document.head.appendChild(script);
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (cancelled) return;
      if (!window.google?.accounts) {
        // Retry after a short delay
        retryTimer = window.setTimeout(initGoogle, 200);
        return;
      }
      setGoogleError(null);
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleGoogleCredential(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        hd: '*',
      });
      // Render the Google Sign-In button
      const btnContainer = document.getElementById('g_id_signin');
      if (btnContainer) {
        btnContainer.replaceChildren();
        window.google.accounts.id.renderButton(btnContainer, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: btnContainer.offsetWidth > 0 ? btnContainer.offsetWidth : 360,
        });
      }
    }

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [googleClientId, devBypassAuth, handleGoogleCredential]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError(null);
    setRegistrationMessage(null);
    setIsRegistering(true);
    try {
      await authService.register({
        email: registerEmail,
        password: registerPassword,
      });
      setRegistrationMessage(
        'Konto wymaga zatwierdzenia przez administratora.'
      );
      setRegisterEmail('');
      setRegisterPassword('');
    } catch (err) {
      setRegisterError(
        err instanceof Error ? err.message : 'Nie udało się zarejestrować.'
      );
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleLocalLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await authService.login({ email: loginEmail, password: loginPassword });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Nie udało się zalogować.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDevBypassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      // In dev bypass mode, we send the email as credential
      await authService.googleLogin(devEmail);
      setDevEmail('');
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zalogować przez dev bypass.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-grid">
      <div className="login-panel login-panel--primary">
        <p className="login-eyebrow">
          Logowanie do systemu aparatury pomiarowej
        </p>
        <h1>Wybierz metodę logowania</h1>
        <p className="login-copy">
          Zaloguj się przez AGH Google SSO albo użyj konta developerskiego.
        </p>
        <p className="login-copy">Wymagane logowanie</p>
      </div>

      {/* ── Google Sign-In (production) ─────────────────────────────────── */}
      {!devBypassAuth && (
        <div className="login-panel">
          <h2>AGH Google SSO</h2>
          {configError ? (
            <div className="alert alert-error">{configError}</div>
          ) : isConfigLoading ? (
            <p className="login-copy">Pobieranie konfiguracji logowania...</p>
          ) : googleClientId ? (
            <>
              <p className="login-copy">
                Użyj konta w domenie @agh.edu.pl lub @student.agh.edu.pl.
              </p>
              <div
                id="g_id_signin"
                className="google-signin-slot"
                aria-busy={isSubmitting}
              />
              {googleError ? (
                <div className="alert alert-error">{googleError}</div>
              ) : null}
            </>
          ) : (
            <p className="login-copy">
              Logowanie Google wymaga ustawienia{' '}
              <strong>GOOGLE_CLIENT_ID</strong>. Skontaktuj się z
              administratorem albo użyj logowania e-mailem.
            </p>
          )}
        </div>
      )}

      {/* ── Dev bypass ──────────────────────────────────────────────────── */}
      {devBypassAuth && (
        <div className="login-panel">
          <h2>Dev Bypass - Google SSO (symulowane)</h2>
          <p className="login-copy">
            <strong>DEV_BYPASS_AUTH</strong> jest włączone. Podaj adres e-mail,
            a system utworzy lub znajdzie konto w dozwolonej domenie AGH. W
            produkcji ten panel nie będzie widoczny.
          </p>
          <form className="form" onSubmit={handleDevBypassSubmit}>
            <label className="form-label" htmlFor="dev-email">
              E-mail
            </label>
            <input
              className="form-input"
              id="dev-email"
              type="email"
              placeholder="jan.kowalski@agh.edu.pl"
              value={devEmail}
              onChange={(event) => setDevEmail(event.target.value)}
              required
            />
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Logowanie...' : 'Zaloguj (dev bypass)'}
              </button>
            </div>
            {loginError ? <div className="alert alert-error">{loginError}</div> : null}
          </form>
        </div>
      )}

      {/* ── Registration ────────────────────────────────────────────────── */}
      <div className="login-panel">
        <form className="form" onSubmit={handleLocalLogin}>
          <h2>Logowanie e-mailem</h2>
          {loginError ? <div className="alert alert-error">{loginError}</div> : null}
          <label className="form-label" htmlFor="login-email">
            E-mail
          </label>
          <input
            className="form-input"
            id="login-email"
            type="email"
            autoComplete="username"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            required
          />
          <label className="form-label" htmlFor="login-password">
            Hasło
          </label>
          <input
            className="form-input"
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            required
          />
          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Logowanie...' : 'Zaloguj'}
            </button>
          </div>
        </form>
      </div>

      <div className="login-panel">
        <form className="form" onSubmit={handleRegister}>
          <h2>Rejestracja</h2>
          {registerError ? <div className="alert alert-error">{registerError}</div> : null}
          <label className="form-label" htmlFor="register-email">
            E-mail
          </label>
          <input
            className="form-input"
            id="register-email"
            type="email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
            required
          />
          <label className="form-label" htmlFor="register-password">
            Hasło
          </label>
          <input
            className="form-input"
            id="register-password"
            minLength={8}
            type="password"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            required
          />
          {registrationMessage ? (
            <div className="alert alert-success">{registrationMessage}</div>
          ) : null}
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              disabled={isRegistering}
              type="submit"
            >
              {isRegistering ? 'Rejestrowanie...' : 'Zarejestruj'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
