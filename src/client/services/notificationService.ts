import { authHeaders, jsonAuthHeaders } from './authHeaders';

export interface NotificationPreference {
  id: number;
  userId: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  returnDueNoticeHours: number;
}
export interface NotificationEvent {
  id: number;
  userId: number;
  borrowingId: number | null;
  eventType: 'return_due' | 'borrowing_approved';
  channel: 'in_app' | 'email' | 'push';
  payload: string;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
}

export const notificationService = {
  async getPreferences(): Promise<NotificationPreference> {
    const r = await fetch('/api/v1/notifications/preferences', {
      headers: authHeaders(),
    });
    await ensureOk(r);
    return r.json();
  },
  async updatePreferences(
    p: Pick<
      NotificationPreference,
      'emailEnabled' | 'pushEnabled' | 'returnDueNoticeHours'
    >
  ): Promise<NotificationPreference> {
    const r = await fetch('/api/v1/notifications/preferences', {
      method: 'PUT',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(p),
    });
    await ensureOk(r);
    return r.json();
  },
  async listEvents(): Promise<NotificationEvent[]> {
    const r = await fetch('/api/v1/notifications/events', {
      headers: authHeaders(),
    });
    await ensureOk(r);
    return r.json();
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {}
  throw new Error(detail);
}
