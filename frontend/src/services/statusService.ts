/**
 * KONTRAKT API – po podłączeniu backendu zamień mock na fetch:
 *
 * GET    /api/v1/statuses          → Status[]
 * POST   /api/v1/statuses          → Status        body: CreateStatusPayload
 * PUT    /api/v1/statuses/:id      → Status        body: UpdateStatusPayload
 * DELETE /api/v1/statuses/:id      → 204 No Content
 *
 * Błędy walidacyjne: { detail: string } z kodem 422
 */

import type {
  Status,
  CreateStatusPayload,
  UpdateStatusPayload,
} from '../types/status';

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

const _fetchStatuses = (): Status[] => {
  return [...mockStatuses];
};

export const statusService = {
  async getAll(): Promise<Status[]> {
    await delay(100);
    return _fetchStatuses();
  },

  async create(payload: CreateStatusPayload): Promise<Status> {
    await delay(300);

    const slugValid = /^[a-z0-9_]+$/.test(payload.slug);
    if (!slugValid) {
      throw new Error(
        'Identyfikator może zawierać tylko małe litery, cyfry i podkreślniki.'
      );
    }

    const slugExists = mockStatuses.some((s) => s.slug === payload.slug);
    if (slugExists)
      throw new Error('Status o takim identyfikatorze już istnieje.');
    const newStatus: Status = {
      id: nextId++,
      name: payload.name,
      slug: payload.slug,
      type: 'custom',
      description: payload.description,
    };
    mockStatuses = [...mockStatuses, newStatus];
    return newStatus;
  },

  async update(id: number, payload: UpdateStatusPayload): Promise<Status> {
    await delay(300);
    const status = mockStatuses.find((s) => s.id === id);
    if (!status) throw new Error('Status nie istnieje.');
    if (status.type === 'system')
      throw new Error('Nie można edytować statusów systemowych.');
    const updated = { ...status, ...payload };
    mockStatuses = mockStatuses.map((s) => (s.id === id ? updated : s));
    return updated;
  },

  async remove(id: number): Promise<void> {
    await delay(300);
    const status = mockStatuses.find((s) => s.id === id);
    if (!status) throw new Error('Status nie istnieje.');
    if (status.type === 'system')
      throw new Error('Nie można usunąć statusów systemowych.');
    mockStatuses = mockStatuses.filter((s) => s.id !== id);
  },
};
