export interface GlobalDelegation extends Delegation {
  item_name: string;
}

import type { CreateDelegationPayload, Delegation } from '../types/delegation';
import type { AutocompleteOption } from '../components/Autocomplete';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockDelegations: Delegation[] = [
  {
    id: 1,
    item_id: 1,
    user_id: 2,
    group_id: null,
    permission: 'edit',
    user_email: 'jan@agh.edu.pl',
    group_name: null,
  },
  {
    id: 2,
    item_id: 1,
    user_id: 3,
    group_id: null,
    permission: 'manage',
    user_email: 'anna@agh.edu.pl',
    group_name: null,
  },
  {
    id: 3,
    item_id: 1,
    user_id: null,
    group_id: 1,
    permission: 'edit',
    user_email: null,
    group_name: 'Administratorzy',
  },
];
let nextId = 4;

export const delegationService = {
  async getAll(itemId: number): Promise<Delegation[]> {
    if (USE_MOCKS) {
      await delay(100);
      return mockDelegations.filter((d) => d.item_id === itemId);
    }
    const response = await fetch(`/api/v1/items/${itemId}/delegations/`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },
  async getAllGlobal(): Promise<GlobalDelegation[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [];
    }
    const response = await fetch(`/api/v1/delegations/`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },
  async create(
    itemId: number,
    payload: CreateDelegationPayload
  ): Promise<Delegation> {
    if (!payload.user_id && !payload.group_id)
      throw new Error('Podaj użytkownika lub grupę.');
    if (USE_MOCKS) {
      await delay(300);
      const d: Delegation = {
        id: nextId++,
        item_id: itemId,
        user_id: payload.user_id ?? null,
        group_id: payload.group_id ?? null,
        permission: payload.permission,
        user_email: null,
        group_name: null,
      };
      mockDelegations = [...mockDelegations, d];
      return d;
    }
    const response = await fetch(`/api/v1/items/${itemId}/delegations/`, {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return response.json();
  },
  async update(
    itemId: number,
    delegationId: number,
    payload: CreateDelegationPayload
  ): Promise<Delegation> {
    if (USE_MOCKS) {
      await delay(300);
      mockDelegations = mockDelegations.map((delegation) =>
        delegation.id === delegationId
          ? {
              ...delegation,
              user_id: payload.user_id ?? null,
              group_id: payload.group_id ?? null,
              permission: payload.permission,
            }
          : delegation
      );
      const updated = mockDelegations.find(
        (delegation) => delegation.id === delegationId
      );
      if (!updated) throw new Error('Delegation not found');
      return updated;
    }
    const response = await fetch(
      `/api/v1/items/${itemId}/delegations/${delegationId}`,
      {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    await ensureOk(response);
    return response.json();
  },
  async remove(itemId: number, delegationId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(300);
      mockDelegations = mockDelegations.filter((d) => d.id !== delegationId);
      return;
    }
    const response = await fetch(
      `/api/v1/items/${itemId}/delegations/${delegationId}`,
      { method: 'DELETE', headers: authHeaders() }
    );
    await ensureOk(response);
  },
  async removeGlobal(delegationId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(300);
      return;
    }
    const response = await fetch(`/api/v1/delegations/${delegationId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await ensureOk(response);
  },

  async searchUsers(query: string): Promise<AutocompleteOption[]> {
    if (USE_MOCKS) {
      await delay(200);
      const q = query.toLowerCase();
      const allUsers = [
        { value: 1, label: 'admin@agh.edu.pl' },
        { value: 2, label: 'jan@agh.edu.pl' },
        { value: 3, label: 'anna@agh.edu.pl' },
        { value: 4, label: 'piotr@agh.edu.pl' },
      ];
      return allUsers.filter((u) => u.label.toLowerCase().includes(q));
    }
    const response = await fetch(
      `/api/v1/users/search?q=${encodeURIComponent(query)}`,
      { headers: authHeaders() }
    );
    await ensureOk(response);
    const data: { id: number; email: string }[] = await response.json();
    return data.map((u) => ({ value: u.id, label: u.email }));
  },

  async searchGroups(query: string): Promise<AutocompleteOption[]> {
    if (USE_MOCKS) {
      await delay(200);
      const q = query.toLowerCase();
      const allGroups = [
        { value: 1, label: 'Administratorzy' },
        { value: 2, label: 'Wydział Informatyki' },
      ];
      return allGroups.filter((g) => g.label.toLowerCase().includes(q));
    }
    const response = await fetch(
      `/api/v1/groups/search?q=${encodeURIComponent(query)}`,
      { headers: authHeaders() }
    );
    await ensureOk(response);
    const data: {
      id: number;
      name: string;
      defaultPermission: 'manage' | 'edit';
    }[] = await response.json();
    return data.map((g) => ({
      value: g.id,
      label: g.name,
      extra: { defaultPermission: g.defaultPermission },
    }));
  },

  async searchAndCreateGroup(
    name: string,
    defaultPermission: 'manage' | 'edit'
  ): Promise<AutocompleteOption> {
    const matches = await this.searchGroups(name);
    const existing = matches.find(
      (group) => group.label.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (existing) return existing;
    const response = await fetch('/api/v1/groups/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ name, defaultPermission }),
    });
    await ensureOk(response);
    const group = (await response.json()) as {
      id: number;
      name: string;
      defaultPermission: 'manage' | 'edit';
    };
    return {
      value: group.id,
      label: group.name,
      extra: { defaultPermission: group.defaultPermission },
    };
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
