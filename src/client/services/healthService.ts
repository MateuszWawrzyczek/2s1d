import { authHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';

export type DatabaseStatus = 'ok' | 'error' | 'unknown';

interface BackendHealthResponse {
  status?: string;
  database?: string;
}

export interface HealthStatus {
  app: 'ok' | 'degraded' | 'unknown';
  database: DatabaseStatus;
}

export const healthService = {
  async getStatus(): Promise<HealthStatus> {
    if (USE_MOCKS) {
      return { app: 'ok', database: 'ok' };
    }

    const response = await fetch('/api/health', { headers: authHeaders() });
    if (!response.ok) {
      throw new Error(`Health check failed (${response.status})`);
    }

    const data: BackendHealthResponse = await response.json();

    return {
      app:
        data.status === 'ok' || data.status === 'degraded'
          ? data.status
          : 'unknown',
      database:
        data.database === 'ok' || data.database === 'error'
          ? data.database
          : 'unknown',
    };
  },
};
