import { useEffect, useState } from 'react';
import { userService, type User } from '../services/userService';
import {
  UserCog,
  Shield,
  User as UserIcon,
  Loader2,
  UserX,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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

  const handleChangeRole = async (
    id: number,
    currentRole: 'admin' | 'user'
  ) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Czy na pewno chcesz zmienić rolę użytkownika na ${newRole === 'admin' ? 'Administrator' : 'Użytkownik'}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      await userService.updateRole(id, newRole);
      setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
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
            Zarządzaj aktywnością kont i uprawnieniami administratora.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
                        className={`badge ${u.role === 'admin' ? 'badge-accent' : 'badge-custom'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {u.role === 'admin' ? (
                          <Shield size={12} />
                        ) : (
                          <UserIcon size={12} />
                        )}
                        {u.role === 'admin' ? 'Administrator' : 'Pracownik'}
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
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '8px',
                        }}
                      >
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
                        {currentUser?.id !== u.id && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleChangeRole(u.id, u.role)}
                            disabled={actionLoading === u.id}
                            title="Zmień rolę"
                          >
                            <UserCog size={14} style={{ marginRight: '4px' }} />
                            {u.role === 'admin'
                              ? 'Zdejmij admina'
                              : 'Nadaj admina'}
                          </button>
                        )}
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
