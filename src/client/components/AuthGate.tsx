import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthGateProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function AuthGate({ children, requireAdmin = false }: AuthGateProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-icon">
          <ShieldAlert size={48} />
        </div>
        <h2 className="auth-gate-title">Wymagane logowanie</h2>
        <p className="auth-gate-text">
          Nie masz dostępu do tej strony. Zaloguj się, aby kontynuować.
        </p>
        <Link to="/login" className="btn btn-primary">
          <LogIn size={16} style={{ marginRight: 6 }} />
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  if (requireAdmin && user?.role !== 'admin') {
    return (
      <div className="auth-gate">
        <div className="auth-gate-icon">
          <ShieldAlert size={48} />
        </div>
        <h2 className="auth-gate-title">Brak uprawnień</h2>
        <p className="auth-gate-text">
          Ta strona wymaga uprawnień administratora.
        </p>
        <Link to="/" className="btn btn-secondary">
          Wróć do dashboardu
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
