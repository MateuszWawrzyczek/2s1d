import { useState, useEffect, useCallback } from 'react';
import { Lock, X } from 'lucide-react';
import { statusService } from '../services/statusService';
import type {
  Status,
  CreateStatusPayload,
  UpdateStatusPayload,
} from '../types/status';

type ModalMode = 'create' | 'edit';
interface ModalState {
  mode: ModalMode;
  status?: Status;
}

export default function StatusesPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatuses(await statusService.getAll());
    } catch {
      setError('Nie udało się pobrać statusów.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatuses();
  }, [fetchStatuses]);

  const handleCreate = async (payload: CreateStatusPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await statusService.create(payload);
      await fetchStatuses();
      setModal(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };
  const handleUpdate = async (id: number, payload: UpdateStatusPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await statusService.update(id, payload);
      await fetchStatuses();
      setModal(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };
  const handleDelete = async (status: Status) => {
    if (!confirm(`Usunąć status "${status.name}"?`)) return;
    try {
      await statusService.remove(status.id);
      await fetchStatuses();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Nie udało się usunąć statusu.');
    }
  };
  const openCreate = () => {
    setFormError(null);
    setModal({ mode: 'create' });
  };
  const openEdit = (status: Status) => {
    setFormError(null);
    setModal({ mode: 'edit', status });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Statusy i flagi</h1>
          <p className="page-subtitle">
            Zarządzaj statusami systemowymi i własnymi flagami przedmiotów
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Dodaj flagę
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie statusów…</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Identyfikator</th>
              <th>Opis</th>
              <th>Typ</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <tr key={status.id}>
                <td className="td-name">{status.name}</td>
                <td>
                  <code className="slug">{status.slug}</code>
                </td>
                <td className="td-desc">{status.description ?? '—'}</td>
                <td>
                  <span className={`badge badge-${status.type}`}>
                    {status.type === 'system' ? 'Systemowy' : 'Własny'}
                  </span>
                </td>
                <td>
                  <div className="td-actions">
                    {status.type === 'custom' ? (
                      <>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEdit(status)}
                        >
                          Edytuj
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(status)}
                        >
                          Usuń
                        </button>
                      </>
                    ) : (
                      <span className="locked">
                        <Lock size={14} style={{ marginRight: 4 }} />
                        Chroniony
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal.mode === 'create' ? 'Nowa flaga' : 'Edytuj flagę'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            {modal.mode === 'create' ? (
              <CreateForm onSubmit={handleCreate} loading={formLoading} />
            ) : (
              <EditForm
                status={modal.status!}
                onSubmit={(payload) => handleUpdate(modal.status!.id, payload)}
                loading={formLoading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateForm({
  onSubmit,
  loading,
}: {
  onSubmit: (p: CreateStatusPayload) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    );
  };
  const submit = () => {
    if (!name.trim() || !slug.trim()) return;
    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
    });
  };
  return (
    <div className="form">
      <label className="form-label">Nazwa *</label>
      <input
        className="form-input"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="np. Do utylizacji"
      />
      <label className="form-label">Identyfikator (slug) *</label>
      <input
        className="form-input"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="np. to_dispose"
      />
      <p className="form-hint">
        Używany przez API. Tylko małe litery, cyfry i podkreślniki.
      </p>
      <label className="form-label">Opis</label>
      <input
        className="form-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opcjonalny opis"
      />
      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !name.trim() || !slug.trim()}
        >
          {loading ? 'Zapisywanie…' : 'Utwórz'}
        </button>
      </div>
    </div>
  );
}

function EditForm({
  status,
  onSubmit,
  loading,
}: {
  status: Status;
  onSubmit: (p: UpdateStatusPayload) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(status.name);
  const [description, setDescription] = useState(status.description ?? '');
  const submit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };
  return (
    <div className="form">
      <label className="form-label">Nazwa *</label>
      <input
        className="form-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="form-label">Opis</label>
      <input
        className="form-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opcjonalny opis"
      />
      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
