import { useEffect, useState } from 'react';
import { userService, type User } from '../services/userService';
import {
  Shield,
  User as UserIcon,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const roleLabels = {
  user: 'Pracownik',
  admin: 'Administrator',
} as const;

function displayedRoleLabel(user: User): string {
  return user.isActive ? roleLabels[user.role] : 'Brak uprawnień';
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać listy użytkowników.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleDeactivate = async (id: number, email: string) => {
    if (!window.confirm(`Dezaktywować konto użytkownika ${email}?`)) return;
    setActionLoading(id);
    try {
      const updated = await userService.deactivate(id);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Błąd podczas dezaktywacji użytkownika.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: number) => {
    setActionLoading(id);
    try {
      const updated = await userService.activate(id);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Błąd podczas aktywacji użytkownika.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetRole = async (id: number, role: 'admin' | 'user') => {
    const confirmMsg = `Czy na pewno chcesz ustawić rolę użytkownika na "${roleLabels[role]}"?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      const updated = await userService.updateRole(id, role);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd podczas zmiany roli.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Zarządzanie użytkownikami</h1>
          <p className="page-subtitle">
            Zatwierdzaj konta i wybieraj poziom uprawnień użytkowników.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {isLoading ? (
        <div className="loading-state">
          <Loader2 className="spinner" size={40} />
          <p>Ładowanie listy użytkowników...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Rola</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', padding: '40px' }}
                  >
                    Brak użytkowników w systemie.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          className="sidebar-user-avatar"
                          style={{ margin: 0 }}
                        >
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.email}</div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            ID: {u.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.role === 'admin' && u.isActive ? 'badge-accent' : 'badge-custom'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {!u.isActive ? (
                          <UserX size={12} />
                        ) : u.role === 'admin' ? (
                          <Shield size={12} />
                        ) : (
                          <UserIcon size={12} />
                        )}
                        {displayedRoleLabel(u)}
                      </span>
                    </td>
                    <td>
                      {!u.isActive ? (
                        <span className="status-indicator status-indicator--danger">
                          Nieaktywny
                        </span>
                      ) : (
                        <span className="status-indicator status-indicator--ok">
                          Aktywny
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        className="td-actions"
                        style={{ justifyContent: 'flex-end' }}
                      >
                        {!u.isActive ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleActivate(u.id)}
                            disabled={actionLoading === u.id}
                          >
                            <UserCheck
                              size={14}
                              style={{ marginRight: '4px' }}
                            />
                            Zatwierdź
                          </button>
                        ) : null}
                        {u.isActive && currentUser?.id !== u.id ? (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeactivate(u.id, u.email)}
                            disabled={actionLoading === u.id}
                          >
                            <UserX size={14} style={{ marginRight: '4px' }} />
                            Dezaktywuj
                          </button>
                        ) : null}
                        {u.isActive && currentUser?.id !== u.id ? (
                          <select
                            className="form-input form-input--compact"
                            value={u.role}
                            onChange={(event) =>
                              handleSetRole(
                                u.id,
                                event.target.value as 'admin' | 'user'
                              )
                            }
                            disabled={actionLoading === u.id}
                            title="Zmień rolę"
                          >
                            <option value="user">Pracownik</option>
                            <option value="admin">Administrator</option>
                          </select>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
