export function authHeaders(): Record<string, string> {
  const token = window.localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function jsonAuthHeaders(): Record<string, string> {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}
