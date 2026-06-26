import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { jsonAuthHeaders } from '../services/authHeaders';

interface Group {
  id: number;
  name: string;
  defaultPermission: 'manage' | 'edit';
  memberIds: number[];
}

interface User {
  id: number;
  email: string;
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState('');
  const [formPermission, setFormPermission] = useState<'manage' | 'edit'>(
    'edit'
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState<number | ''>('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/v1/groups/', { headers: jsonAuthHeaders() });
      if (!r.ok) throw new Error('Nie udało się pobrać grup.');
      const data = (await r.json()) as Group[];
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/auth/users', {
        headers: jsonAuthHeaders(),
      });
      if (!r.ok) return;
      const data = (await r.json()) as { id: number; email: string }[];
      setUsers(data);
    } catch {}
  }, []);

  useEffect(() => {
    void fetchGroups();
    void fetchUsers();
  }, [fetchGroups, fetchUsers]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const r = await fetch('/api/v1/groups/', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          defaultPermission: formPermission,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const detail =
          typeof err === 'object' && err !== null && 'detail' in err
            ? String(err.detail)
            : 'Błąd tworzenia grupy.';
        throw new Error(detail);
      }
      await fetchGroups();
      setShowCreateForm(false);
      setFormName('');
      setFormPermission('edit');
      setSuccessMessage('Grupa została utworzona.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingGroup || !formName.trim()) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const r = await fetch(`/api/v1/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          defaultPermission: formPermission,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const detail =
          typeof err === 'object' && err !== null && 'detail' in err
            ? String(err.detail)
            : 'Błąd aktualizacji grupy.';
        throw new Error(detail);
      }
      await fetchGroups();
      setEditingGroup(null);
      setFormName('');
      setFormPermission('edit');
      setSuccessMessage('Grupa została zaktualizowana.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!confirm('Czy na pewno usunąć tę grupę?')) return;
    try {
      const r = await fetch(`/api/v1/groups/${groupId}`, {
        method: 'DELETE',
        headers: jsonAuthHeaders(),
      });
      if (!r.ok) throw new Error('Nie udało się usunąć grupy.');
      await fetchGroups();
      setSuccessMessage('Grupa została usunięta.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    }
  };

  const handleAddMember = async (groupId: number) => {
    if (!addMemberUserId) return;
    setAddMemberLoading(true);
    try {
      const r = await fetch(`/api/v1/groups/${groupId}/members`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ userId: Number(addMemberUserId) }),
      });
      if (!r.ok) throw new Error('Nie udało się dodać członka.');
      await fetchGroups();
      setAddMemberUserId('');
      setSuccessMessage('Członek został dodany.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (groupId: number, userId: number) => {
    if (!confirm('Usunąć tego członka z grupy?')) return;
    try {
      const r = await fetch(`/api/v1/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: jsonAuthHeaders(),
      });
      if (!r.ok) throw new Error('Nie udało się usunąć członka.');
      await fetchGroups();
      setSuccessMessage('Członek został usunięty.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="page">
        <div className="alert alert-error">
          Tylko administrator ma dostęp do tej strony.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grupy</h1>
          <p className="page-subtitle">Zarządzaj grupami opiekunów</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreateForm(true);
            setEditingGroup(null);
            setFormName('');
            setFormPermission('edit');
            setFormError(null);
          }}
        >
          + Dodaj grupę
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie grup…</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Domyślne uprawnienie</th>
              <th>Liczba członków</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4}>Brak grup.</td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>
                    {group.defaultPermission === 'manage'
                      ? 'Zarządzanie'
                      : 'Edycja'}
                  </td>
                  <td>{group.memberIds.length}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditingGroup(group);
                          setFormName(group.name);
                          setFormPermission(group.defaultPermission);
                          setShowCreateForm(false);
                          setFormError(null);
                        }}
                      >
                        Edytuj
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(group.id)}
                      >
                        Usuń
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() =>
                          setExpandedGroupId(
                            expandedGroupId === group.id ? null : group.id
                          )
                        }
                      >
                        {expandedGroupId === group.id ? 'Zwiń' : 'Członkowie'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {expandedGroupId && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
          }}
        >
          <h3>
            Członkowie grupy:{' '}
            {groups.find((g) => g.id === expandedGroupId)?.name}
          </h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <select
              className="form-input"
              value={addMemberUserId}
              onChange={(e) =>
                setAddMemberUserId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Wybierz użytkownika</option>
              {users
                .filter(
                  (u) =>
                    !groups
                      .find((g) => g.id === expandedGroupId)
                      ?.memberIds.includes(u.id)
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={!addMemberUserId || addMemberLoading}
              onClick={() => handleAddMember(expandedGroupId)}
            >
              {addMemberLoading ? 'Dodawanie...' : 'Dodaj'}
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {groups.find((g) => g.id === expandedGroupId)?.memberIds
                .length === 0 ? (
                <tr>
                  <td colSpan={2}>Brak członków.</td>
                </tr>
              ) : (
                groups
                  .find((g) => g.id === expandedGroupId)
                  ?.memberIds.map((memberId) => {
                    const memberUser = users.find((u) => u.id === memberId);
                    return (
                      <tr key={memberId}>
                        <td>{memberUser?.email ?? `ID: ${memberId}`}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              handleRemoveMember(expandedGroupId, memberId)
                            }
                          >
                            Usuń
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}

      {(showCreateForm || editingGroup) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCreateForm(false);
            setEditingGroup(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGroup ? 'Edytuj grupę' : 'Nowa grupa'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingGroup(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="form">
              <label className="form-label">Nazwa grupy</label>
              <input
                className="form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="np. Laboratorium Fizyki"
              />
              <label className="form-label">Domyślne uprawnienie</label>
              <select
                className="form-input"
                value={formPermission}
                onChange={(e) =>
                  setFormPermission(e.target.value as 'manage' | 'edit')
                }
              >
                <option value="edit">Edycja</option>
                <option value="manage">Zarządzanie</option>
              </select>
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={editingGroup ? handleUpdate : handleCreate}
                  disabled={formLoading || !formName.trim()}
                >
                  {formLoading
                    ? 'Zapisywanie…'
                    : editingGroup
                      ? 'Zapisz zmiany'
                      : 'Utwórz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
