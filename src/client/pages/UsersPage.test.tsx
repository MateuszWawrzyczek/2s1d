import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import UsersPage from './UsersPage';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'admin@agh.edu.pl',
      role: 'admin',
      is_active: true,
    },
  }),
}));

vi.mock('../services/userService', () => ({
  userService: {
    getAll: vi.fn(),
    deactivate: vi.fn(),
    updateRole: vi.fn(),
  },
}));

const { userService } = await import('../services/userService');

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(userService.getAll).mockResolvedValue([
      {
        id: 1,
        email: 'admin@agh.edu.pl',
        role: 'admin',
        isActive: true,
      },
      {
        id: 2,
        email: 'nowy.pracownik@agh.edu.pl',
        role: 'user',
        isActive: true,
      },
    ]);
    vi.mocked(userService.deactivate).mockResolvedValue({
      id: 2,
      email: 'nowy.pracownik@agh.edu.pl',
      role: 'user',
      isActive: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dezaktywuje aktywne konto i pokazuje status nieaktywny', async () => {
    render(<UsersPage />);

    const row = await screen.findByRole('row', {
      name: /nowy\.pracownik@agh\.edu\.pl/,
    });
    expect(within(row).getByText('Aktywny')).toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Dezaktywuj' }));

    expect(userService.deactivate).toHaveBeenCalledWith(2);
    expect(await screen.findByText('Nieaktywny')).toBeInTheDocument();
  });
});
