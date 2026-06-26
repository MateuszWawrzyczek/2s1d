import { authService } from './authService';

export async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;

  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {
    // Keep fallback error.
  }

  if (response.status === 401) {
    authService.logout();
  }

  throw new Error(detail);
}
