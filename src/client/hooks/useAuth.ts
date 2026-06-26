import { useState, useEffect } from 'react';
import { authService, type AuthUser } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() =>
    authService.getSessionUser()
  );

  useEffect(() => {
    const sync = () => setUser(authService.getSessionUser());
    window.addEventListener('auth-session-changed', sync);
    return () => window.removeEventListener('auth-session-changed', sync);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
  };
}
