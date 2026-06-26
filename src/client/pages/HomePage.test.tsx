import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

vi.mock('../services/dashboardService', () => ({
  dashboardService: {
    getStats: vi.fn(),
  },
}));

vi.mock('../services/healthService', () => ({
  healthService: {
    getStatus: vi.fn(),
  },
}));

const { dashboardService } = await import('../services/dashboardService');
const { healthService } = await import('../services/healthService');

describe('Komponent HomePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(healthService.getStatus).mockResolvedValue({
      app: 'ok',
      database: 'ok',
    });
    vi.mocked(dashboardService.getStats).mockResolvedValue({
      items: 12,
      borrowed: 3,
      overdue: 1,
      categories: 4,
    });
  });

  it('powinien wyrenderować główny nagłówek poprawnie', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const headingElement = screen.getByRole('heading', { level: 1 });

    expect(headingElement).toHaveTextContent('Dashboard');
    expect(headingElement).toBeInTheDocument();
    expect(await screen.findByText('Połączono')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('pokazuje błąd statusu bazy danych', async () => {
    vi.mocked(healthService.getStatus).mockRejectedValue(new Error('offline'));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Błąd')).toBeInTheDocument();
    expect(
      screen.getByText('Nie udało się pobrać statusu bazy danych.')
    ).toBeInTheDocument();
  });

  it('pokazuje błąd pobierania statystyk Dashboardu', async () => {
    vi.mocked(dashboardService.getStats).mockRejectedValue(
      new Error('stats offline')
    );

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Nie udało się pobrać statystyk Dashboardu.')
    ).toBeInTheDocument();
  });
});
