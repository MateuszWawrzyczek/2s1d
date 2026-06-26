import type {
  Borrowing,
  BorrowingMode,
  BorrowingRequestPayload,
  BorrowingReturnPayload,
  ExternalBorrowingPayload,
} from '../types/borrowing';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MockBorrowingPayload {
  itemId: number;
  borrowerId: number | null;
  externalBorrower: string | null;
  mode: BorrowingMode;
  status: Borrowing['status'];
  plannedReturnAt?: string;
  approvedAt?: string | null;
  handedOverAt?: string | null;
}

let mockBorrowings: Borrowing[] = [
  {
    id: 1,
    itemId: 2,
    borrowerId: 2,
    externalBorrower: null,
    mode: 'classic',
    status: 'borrowed',
    plannedReturnAt: '2026-06-16T12:00:00.000Z',
    approvedAt: '2026-06-01T08:00:00.000Z',
    handedOverAt: '2026-06-01T10:00:00.000Z',
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-01T07:30:00.000Z',
  },
];

let nextId = 2;

export const borrowingService = {
  async getAll(itemId?: number): Promise<Borrowing[]> {
    if (USE_MOCKS) {
      await delay(100);
      return itemId
        ? mockBorrowings.filter((borrowing) => borrowing.itemId === itemId)
        : [...mockBorrowings];
    }

    const params = itemId ? `?itemId=${itemId}` : '';
    const response = await fetch(`/api/v1/borrowings/${params}`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async request(payload: BorrowingRequestPayload): Promise<Borrowing> {
    validateInternalBorrowing(payload.itemId);

    if (USE_MOCKS) {
      await delay(300);
      const borrowing = createMockBorrowing({
        ...payload,
        borrowerId: 1,
        externalBorrower: null,
        status: 'pending',
      });
      mockBorrowings = [borrowing, ...mockBorrowings];
      return borrowing;
    }

    const response = await fetch('/api/v1/borrowings/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return response.json();
  },

  async createExternal(payload: ExternalBorrowingPayload): Promise<Borrowing> {
    if (!payload.itemId) throw new Error('Wybierz przedmiot.');
    if (!payload.externalBorrower.trim()) {
      throw new Error('Podaj odbiorcę zewnętrznego.');
    }

    if (USE_MOCKS) {
      await delay(300);
      const now = new Date().toISOString();
      const borrowing = createMockBorrowing({
        ...payload,
        externalBorrower: payload.externalBorrower.trim(),
        borrowerId: null,
        mode: 'external',
        status: 'borrowed',
        approvedAt: now,
        handedOverAt: now,
      });
      mockBorrowings = [borrowing, ...mockBorrowings];
      return borrowing;
    }

    const response = await fetch('/api/v1/borrowings/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        itemId: payload.itemId,
        externalBorrower: payload.externalBorrower.trim(),
        mode: 'external',
        plannedReturnAt: payload.plannedReturnAt,
      }),
    });
    await ensureOk(response);
    return response.json();
  },

  async approve(id: number): Promise<Borrowing> {
    return patchStatus(id, 'approve');
  },

  async reject(id: number): Promise<Borrowing> {
    return patchStatus(id, 'reject');
  },

  async handover(id: number): Promise<Borrowing> {
    return patchStatus(id, 'handover');
  },

  async returnBorrowing(
    id: number,
    payload: BorrowingReturnPayload
  ): Promise<Borrowing> {
    if (USE_MOCKS) {
      await delay(300);
      return updateMockBorrowing(id, {
        status: 'returned',
        returnedAt: new Date().toISOString(),
        returnComment: payload.comment?.trim() || null,
      });
    }

    const response = await fetch(`/api/v1/borrowings/${id}/return`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return response.json();
  },
};

function validateInternalBorrowing(itemId: number): void {
  if (!itemId) throw new Error('Wybierz przedmiot.');
}

async function patchStatus(
  id: number,
  action: 'approve' | 'reject' | 'handover'
): Promise<Borrowing> {
  if (USE_MOCKS) {
    await delay(300);
    const now = new Date().toISOString();
    if (action === 'approve') {
      return updateMockBorrowing(id, {
        status: 'borrowed',
        approvedAt: now,
        handedOverAt: now,
      });
    }
    return updateMockBorrowing(id, { status: 'rejected' });
  }

  const response = await fetch(`/api/v1/borrowings/${id}/${action}`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  await ensureOk(response);
  return response.json();
}

function createMockBorrowing(payload: MockBorrowingPayload): Borrowing {
  return {
    id: nextId++,
    itemId: payload.itemId,
    borrowerId: payload.borrowerId,
    externalBorrower: payload.externalBorrower,
    mode: payload.mode,
    status: payload.status,
    plannedReturnAt: payload.plannedReturnAt ?? null,
    approvedAt: payload.approvedAt ?? null,
    handedOverAt: payload.handedOverAt ?? null,
    returnedAt: null,
    returnComment: null,
    createdAt: new Date().toISOString(),
  };
}

function updateMockBorrowing(id: number, patch: Partial<Borrowing>): Borrowing {
  const borrowing = mockBorrowings.find((current) => current.id === id);
  if (!borrowing) throw new Error('Wypożyczenie nie istnieje.');
  const updated = { ...borrowing, ...patch };
  mockBorrowings = mockBorrowings.map((current) =>
    current.id === id ? updated : current
  );
  return updated;
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
