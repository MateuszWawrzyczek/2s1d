import { authHeaders, jsonAuthHeaders } from './authHeaders';

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await fetch('/api/v1/users', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async deactivate(id: number): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async activate(id: number): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/activate`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async updateRole(id: number, role: 'admin' | 'user'): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ role }),
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
    // Fallback
  }
  throw new Error(detail);
}
