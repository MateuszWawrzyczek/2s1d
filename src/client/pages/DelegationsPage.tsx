import { useState, useEffect, useCallback } from 'react';
import {
  delegationService,
  type GlobalDelegation,
} from '../services/delegationService';
import { useAuth } from '../hooks/useAuth';

export default function DelegationsPage() {
  const { user } = useAuth();
  const [delegations, setDelegations] = useState<GlobalDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDelegations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await delegationService.getAllGlobal();
      setDelegations(data);
    } catch {
      setError('Nie udało się pobrać delegacji.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDelegations();
  }, [fetchDelegations]);

  const handleDelete = async (delegation: GlobalDelegation) => {
    const label =
      delegation.user_email ?? delegation.group_name ?? `#${delegation.id}`;
    if (
      !confirm(
        `Usunąć delegację na przedmiot "${delegation.item_name}" dla: ${label}?`
      )
    )
      return;
    try {
      await delegationService.removeGlobal(delegation.id);
      await fetchDelegations();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Nie udało się usunąć delegacji.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Wszystkie delegacje</h1>
          <p className="page-subtitle">
            {user?.role === 'admin'
              ? 'Przegląd uprawnień do wszystkich przedmiotów w systemie'
              : 'Przegląd uprawnień do przedmiotów, których jesteś właścicielem'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie delegacji…</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Przedmiot</th>
              <th>Użytkownik / Grupa</th>
              <th>Uprawnienie</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {delegations.length === 0 ? (
              <tr>
                <td colSpan={4}>Brak przypisanych delegacji.</td>
              </tr>
            ) : (
              delegations.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.item_name}</strong>
                    <div
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                    >
                      ID: {d.item_id}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      if (d.user_email) return <span>👤 {d.user_email}</span>;
                      if (d.group_name) return <span>👥 {d.group_name}</span>;
                      return '—';
                    })()}
                  </td>
                  <td>
                    <span className={`badge badge-${d.permission}`}>
                      {d.permission === 'manage' ? 'Zarządzanie' : 'Edycja'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(d)}
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
