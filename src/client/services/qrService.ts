import { authHeaders } from './authHeaders';

export interface ScannedQrItem {
  id: number;
  system_id: string | null;
  name: string;
  description: string | null;
  qr_data: string;
}
export interface QuickActionItem {
  id: number;
  name: string;
  location: string;
  owner_id: number | null;
  status: string;
  canEdit: boolean;
}

export const qrService = {
  async scan(qrData: string): Promise<ScannedQrItem> {
    const response = await fetch(
      `/api/v1/qr-codes/scan/${encodeURIComponent(qrData)}`,
      { headers: authHeaders() }
    );
    await ensureOk(response);
    return response.json();
  },
  async getQuickActions(itemId: number): Promise<QuickActionItem> {
    const response = await fetch(`/api/v1/quick-actions/${itemId}`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },
  async markDamaged(itemId: number): Promise<QuickActionItem> {
    const response = await fetch(
      `/api/v1/quick-actions/${itemId}/mark-damaged`,
      { method: 'PATCH', headers: authHeaders() }
    );
    await ensureOk(response);
    return response.json();
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
