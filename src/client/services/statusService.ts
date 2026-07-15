import type {
  Status,
  CreateStatusPayload,
  UpdateStatusPayload,
} from '../types/status';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const API_BASE = '/api/v1/item-status';
const USE_MOCKS = import.meta.env.MODE === 'test';

interface BackendStatusResponse {
  id: number;
  name: string;
  is_system: boolean;
  slug?: string | null;
  description?: string | null;
}

const mapBackend = (b: BackendStatusResponse): Status => ({
  id: b.id,
  name: b.name,
  slug:
    b.slug ??
    b.name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, ''),
  type: b.is_system ? 'system' : 'custom',
  description: b.description ?? undefined,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockStatuses: Status[] = [
  {
    id: 1,
    name: 'Dostępny',
    slug: 'available',
    type: 'system',
    description: 'Przedmiot jest dostępny do wypożyczenia',
  },
  {
    id: 2,
    name: 'Wypożyczony',
    slug: 'borrowed',
    type: 'system',
    description: 'Przedmiot jest aktualnie wypożyczony',
  },
  {
    id: 3,
    name: 'Zarezerwowany',
    slug: 'reserved',
    type: 'system',
    description: 'Przedmiot jest zarezerwowany',
  },
  {
    id: 4,
    name: 'Uszkodzony',
    slug: 'damaged',
    type: 'system',
    description: 'Przedmiot jest uszkodzony',
  },
  {
    id: 5,
    name: 'Oczekuje zatwierdzenia',
    slug: 'pending_approval',
    type: 'system',
    description: 'Przedmiot oczekuje na zatwierdzenie',
  },
  {
    id: 6,
    name: 'Zaginiony',
    slug: 'lost',
    type: 'custom',
    description: 'Przedmiot zaginął',
  },
  {
    id: 7,
    name: 'W serwisie',
    slug: 'in_service',
    type: 'custom',
    description: 'Przedmiot jest w serwisie',
  },
];
let nextId = 8;

function validateSlug(slug: string): void {
  if (slug !== slug.toLowerCase()) {
    throw new Error('Nazwa slug musi zawierać wyłącznie małe litery');
  }
  if (/[^a-z0-9_]/.test(slug)) {
    throw new Error('Nazwa slug musi zawierać wyłącznie małe litery');
  }
}

export const statusService = {
  async getAll(): Promise<Status[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockStatuses];
    }
    const response = await fetch(`${API_BASE}/`, { headers: authHeaders() });
    if (!response.ok) await handleApiError(response);
    return ((await response.json()) as BackendStatusResponse[]).map(mapBackend);
  },
  async create(payload: CreateStatusPayload): Promise<Status> {
    if (USE_MOCKS) {
      await delay(300);
      validateSlug(payload.slug);
      const existing = mockStatuses.find((s) => s.slug === payload.slug);
      if (existing) throw new Error('Status z tym slugiem już istnieje');
      const s: Status = { id: nextId++, ...payload, type: 'custom' };
      mockStatuses = [...mockStatuses, s];
      return s;
    }
    const response = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        name: payload.name,
        description: payload.description?.trim() || undefined,
      }),
    });
    if (!response.ok) await handleApiError(response);
    return mapBackend((await response.json()) as BackendStatusResponse);
  },
  async update(id: number, payload: UpdateStatusPayload): Promise<Status> {
    if (USE_MOCKS) {
      await delay(300);
      const s = mockStatuses.find((x) => x.id === id);
      if (!s) throw new Error('Status nie istnieje.');
      if (s.type === 'system')
        throw new Error('Nie można edytować statusów systemowych');
      const updated = {
        ...s,
        ...payload,
        slug: payload.name
          ? payload.name
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '')
          : s.slug,
      };
      mockStatuses = mockStatuses.map((x) => (x.id === id ? updated : x));
      return updated;
    }
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        name: payload.name,
        description: payload.description?.trim() || undefined,
      }),
    });
    if (!response.ok) await handleApiError(response);
    return mapBackend((await response.json()) as BackendStatusResponse);
  },
  async remove(id: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(300);
      const s = mockStatuses.find((x) => x.id === id);
      if (!s) throw new Error('Status nie istnieje.');
      if (s.type === 'system')
        throw new Error('Nie można usunąć statusów systemowych');
      mockStatuses = mockStatuses.filter((s) => s.id !== id);
      return;
    }
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) await handleApiError(response);
  },
};

async function handleApiError(response: Response): Promise<never> {
  let detail = `Błąd serwera (kod: ${response.status}).`;
  try {
    const d = (await response.json()) as Record<string, unknown>;
    if (typeof d.detail === 'string') detail = d.detail;
  } catch {}
  throw new Error(detail);
}
