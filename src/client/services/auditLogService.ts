import { authHeaders } from './authHeaders';

export type AuditLogAction =
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'STATUS_CHANGED'
  | 'LOCATION_CHANGED'
  | 'ITEM_BORROWED'
  | 'BORROWING_REQUESTED'
  | 'BORROWING_APPROVED'
  | 'BORROWING_RETURNED'
  | 'PHOTO_ADDED'
  | 'OWNER_CHANGED'
  | 'DELEGATES_CHANGED'
  | 'DELEGATE_REMOVED'
  | 'BORROWING_REJECTED'
  | 'ITEM_IMPORTED';

export interface AuditLogEntry {
  id: number;
  userId: number;
  action: string;
  itemId: number;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  timestamp: string;

  userEmail: string | null;
  itemName: string | null;
  itemSerial: string | null;
  itemSystemId: string | null;
}

export const auditLogService = {
  async getAll(): Promise<AuditLogEntry[]> {
    const response = await fetch('/api/v1/audit-logs/', {
      headers: authHeaders(),
    });
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
  } catch {
    // Keep fallback error.
  }
  throw new Error(detail);
}
