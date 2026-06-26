import { render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

describe('router', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('blokuje Dashboard dla wylogowanego użytkownika', async () => {
    const { router } = await import('./router');

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Wymagane logowanie')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('przekierowuje zalogowanego użytkownika ze strony logowania', async () => {
    window.localStorage.setItem('access_token', 'test-token');
    window.localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 1,
        email: 'admin@agh.edu.pl',
        role: 'admin',
        is_active: true,
      })
    );
    const { router } = await import('./router');
    await router.navigate('/login');

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rejestracja' })).toBeNull();
    expect(router.state.location.pathname).toBe('/');
  });
});
