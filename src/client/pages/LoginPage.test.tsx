import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMock = vi.hoisted(() => ({
  getConfig: vi.fn(),
  googleLogin: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  authService: authServiceMock,
}));

import LoginPage from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    authServiceMock.getConfig.mockResolvedValue({
      devBypassAuth: false,
      googleClientId: '',
    });
    authServiceMock.googleLogin.mockResolvedValue(undefined);
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.register.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = '';
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: undefined,
    });
  });

  it('inicjalizuje Google SSO i wysyła credential do authService', async () => {
    authServiceMock.getConfig.mockResolvedValue({
      devBypassAuth: false,
      googleClientId: 'client-id.apps.googleusercontent.com',
    });

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    document.head.appendChild(script);

    const initialize = vi.fn();
    const renderButton = vi.fn();
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        accounts: {
          id: {
            initialize,
            renderButton,
            prompt: vi.fn(),
          },
        },
      },
    });

    render(<LoginPage />);

    await waitFor(() =>
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'client-id.apps.googleusercontent.com',
          callback: expect.any(Function),
          hd: '*',
        })
      )
    );
    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ text: 'signin_with' })
    );

    const callback = initialize.mock.calls[0][0].callback as (response: {
      credential: string;
    }) => void;
    callback({ credential: 'google-id-token' });

    await waitFor(() =>
      expect(authServiceMock.googleLogin).toHaveBeenCalledWith(
        'google-id-token'
      )
    );
  });

  it('pokazuje informację, gdy Google SSO nie jest skonfigurowany', async () => {
    render(<LoginPage />);

    expect(
      await screen.findByText(/Logowanie Google wymaga ustawienia/)
    ).toBeInTheDocument();
    expect(screen.getByText('GOOGLE_CLIENT_ID')).toBeInTheDocument();
  });
});
