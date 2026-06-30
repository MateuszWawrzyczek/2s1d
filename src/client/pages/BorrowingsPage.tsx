import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { borrowingService } from '../services/borrowingService';
import { itemService } from '../services/itemService';
import { useAuth } from '../hooks/useAuth';
import type {
  Borrowing,
  BorrowingMode,
  BorrowingRequestPayload,
  BorrowingStatus,
  ExternalBorrowingPayload,
} from '../types/borrowing';
import type { Item } from '../types/item';
import type { Owner } from '../types/owner';

type ModalState =
  | { mode: 'request' }
  | { mode: 'external' }
  | { mode: 'return'; borrowing: Borrowing };

const statusLabels: Record<BorrowingStatus, string> = {
  pending: 'Oczekuje',
  reserved: 'Zarezerwowane',
  borrowed: 'Wypożyczone',
  returned: 'Zwrócone',
  rejected: 'Odrzucone',
};

const modeLabels: Record<BorrowingMode, string> = {
  classic: 'Klasyczne',
  trusted: 'Zaufane',
  asynchronous: 'Asynchroniczne',
  external: 'Zewnętrzne',
};

const activeStatuses: BorrowingStatus[] = ['pending', 'reserved', 'borrowed'];

export default function BorrowingsPage() {
  const { user } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [borrowingsData, itemsData, ownersData] = await Promise.all([
        borrowingService.getAll(),
        itemService.getAll(),
        itemService.getOwners(),
      ]);
      setBorrowings(borrowingsData);
      setItems(itemsData);
      setOwners(ownersData);
    } catch {
      setError('Nie udało się pobrać wypożyczeń.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeBorrowings = useMemo(
    () =>
      borrowings.filter((borrowing) =>
        activeStatuses.includes(borrowing.status)
      ),
    [borrowings]
  );

  const closedBorrowings = useMemo(
    () =>
      borrowings.filter(
        (borrowing) => !activeStatuses.includes(borrowing.status)
      ),
    [borrowings]
  );

  const requestableItems = useMemo(() => {
    const blocked = new Set(
      activeBorrowings
        .filter(
          (borrowing) =>
            borrowing.status === 'reserved' ||
            borrowing.status === 'borrowed' ||
            (borrowing.status === 'pending' &&
              borrowing.borrowerId === user?.id)
        )
        .map((borrowing) => borrowing.itemId)
    );
    return items.filter((item) => !blocked.has(item.id));
  }, [activeBorrowings, items, user?.id]);

  const externalBorrowingItems = useMemo(() => {
    if (user?.role === 'admin') return items;
    return items.filter((item) => item.ownerId === user?.id);
  }, [items, user?.id, user?.role]);

  const itemName = (itemId: number) =>
    items.find((item) => item.id === itemId)?.name ?? `Przedmiot #${itemId}`;

  const borrowerName = (borrowing: Borrowing) => {
    if (borrowing.externalBorrower) return borrowing.externalBorrower;
    if (!borrowing.borrowerId) return '—';
    return (
      owners.find((owner) => owner.id === borrowing.borrowerId)?.fullName ??
      `Użytkownik #${borrowing.borrowerId}`
    );
  };

  const runAction = async (
    borrowing: Borrowing,
    action: 'approve' | 'reject' | 'handover'
  ) => {
    setActionLoading(`${borrowing.id}:${action}`);
    setError(null);
    try {
      if (action === 'approve') await borrowingService.approve(borrowing.id);
      if (action === 'reject') await borrowingService.reject(borrowing.id);
      if (action === 'handover') await borrowingService.handover(borrowing.id);
      await fetchData();
      setSuccessMessage('Status wypożyczenia został zaktualizowany.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się wykonać akcji wypożyczenia.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequest = async (payload: BorrowingRequestPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await borrowingService.request(payload);
      await fetchData();
      setSuccessMessage('Wniosek o wypożyczenie został utworzony.');
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleExternal = async (payload: ExternalBorrowingPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await borrowingService.createExternal(payload);
      await fetchData();
      setSuccessMessage('Wypożyczenie zewnętrzne zostało utworzone.');
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReturn = async (borrowing: Borrowing, comment: string) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await borrowingService.returnBorrowing(borrowing.id, {
        comment: comment.trim() || undefined,
      });
      await fetchData();
      setSuccessMessage('Wypożyczenie zostało zwrócone.');
      setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Wypożyczenia</h1>
          <p className="page-subtitle">
            Obsługa wniosków, wydań, wypożyczeń zewnętrznych i zwrotów.
          </p>
        </div>
        <div className="td-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFormError(null);
              setModal({ mode: 'external' });
            }}
            type="button"
          >
            Wypożyczenie zewnętrzne
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError(null);
              setModal({ mode: 'request' });
            }}
            type="button"
          >
            Nowy wniosek
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie wypożyczeń...</span>
        </div>
      ) : (
        <>
          <div className="borrowing-board">
            {activeStatuses.map((status) => (
              <section className="borrowing-column" key={status}>
                <div className="borrowing-column__header">
                  <h2>{statusLabels[status]}</h2>
                  <span>
                    {
                      activeBorrowings.filter(
                        (borrowing) => borrowing.status === status
                      ).length
                    }
                  </span>
                </div>
                <div className="borrowing-column__list">
                  {activeBorrowings
                    .filter((borrowing) => borrowing.status === status)
                    .map((borrowing) => {
                      const item = items.find(
                        (current) => current.id === borrowing.itemId
                      );
                      const isAdmin = user?.role === 'admin';
                      const isOwner = item?.ownerId === user?.id;
                      const isBorrower = borrowing.borrowerId === user?.id;
                      return (
                        <BorrowingCard
                          actionLoading={actionLoading}
                          borrowerName={borrowerName(borrowing)}
                          borrowing={borrowing}
                          canApprove={Boolean(isAdmin || isOwner)}
                          canHandover={Boolean(
                            isAdmin ||
                            isOwner ||
                            (borrowing.mode === 'asynchronous' && isBorrower)
                          )}
                          canReturn={Boolean(
                            isAdmin ||
                            isOwner ||
                            (borrowing.mode !== 'classic' && isBorrower)
                          )}
                          handoverLabel={
                            borrowing.mode === 'asynchronous' && isBorrower
                              ? 'Odbierz'
                              : 'Wydaj'
                          }
                          itemName={itemName(borrowing.itemId)}
                          key={borrowing.id}
                          onApprove={() => runAction(borrowing, 'approve')}
                          onHandover={() => runAction(borrowing, 'handover')}
                          onReject={() => runAction(borrowing, 'reject')}
                          onReturn={() => {
                            setFormError(null);
                            setModal({ mode: 'return', borrowing });
                          }}
                        />
                      );
                    })}
                  {activeBorrowings.every(
                    (borrowing) => borrowing.status !== status
                  ) ? (
                    <div className="borrowing-empty">Brak wpisów.</div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <div className="section-header">
            <h2>Historia</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Przedmiot</th>
                <th>Odbiorca</th>
                <th>Tryb</th>
                <th>Status</th>
                <th>Planowany zwrot</th>
                <th>Komentarz zwrotu</th>
                <th>Utworzono</th>
              </tr>
            </thead>
            <tbody>
              {closedBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={7}>Brak zakończonych wypożyczeń.</td>
                </tr>
              ) : (
                closedBorrowings.map((borrowing) => (
                  <tr key={borrowing.id}>
                    <td>{borrowing.id}</td>
                    <td>{itemName(borrowing.itemId)}</td>
                    <td>{borrowerName(borrowing)}</td>
                    <td>{modeLabels[borrowing.mode]}</td>
                    <td>
                      <span
                        className={`badge badge-borrowing-${borrowing.status}`}
                      >
                        {statusLabels[borrowing.status]}
                      </span>
                    </td>
                    <td>{formatDate(borrowing.plannedReturnAt)}</td>
                    <td>{borrowing.returnComment || '—'}</td>
                    <td>{formatDate(borrowing.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}

      {modal ? (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTitle(modal)}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>
            {formError ? (
              <div className="alert alert-error">{formError}</div>
            ) : null}
            {modal.mode === 'request' ? (
              <BorrowingRequestForm
                items={requestableItems}
                loading={formLoading}
                onSubmit={handleRequest}
              />
            ) : null}
            {modal.mode === 'external' ? (
              <ExternalBorrowingForm
                items={externalBorrowingItems}
                loading={formLoading}
                onSubmit={handleExternal}
              />
            ) : null}
            {modal.mode === 'return' ? (
              <ReturnBorrowingForm
                borrowing={modal.borrowing}
                itemName={itemName(modal.borrowing.itemId)}
                loading={formLoading}
                onSubmit={(comment) => handleReturn(modal.borrowing, comment)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BorrowingCard({
  actionLoading,
  borrowerName,
  borrowing,
  canApprove,
  canHandover,
  canReturn,
  handoverLabel,
  itemName,
  onApprove,
  onHandover,
  onReject,
  onReturn,
}: {
  actionLoading: string | null;
  borrowerName: string;
  borrowing: Borrowing;
  canApprove: boolean;
  canHandover: boolean;
  canReturn: boolean;
  handoverLabel: string;
  itemName: string;
  onApprove: () => void;
  onHandover: () => void;
  onReject: () => void;
  onReturn: () => void;
}) {
  return (
    <article className="borrowing-card">
      <div className="borrowing-card__topline">
        <span>#{borrowing.id}</span>
        <span className={`badge badge-borrowing-${borrowing.status}`}>
          {statusLabels[borrowing.status]}
        </span>
      </div>
      <h3>{itemName}</h3>
      <dl>
        <div>
          <dt>Odbiorca</dt>
          <dd>{borrowerName}</dd>
        </div>
        <div>
          <dt>Tryb</dt>
          <dd>{modeLabels[borrowing.mode]}</dd>
        </div>
        <div>
          <dt>Planowany zwrot</dt>
          <dd>{formatDate(borrowing.plannedReturnAt)}</dd>
        </div>
      </dl>
      <div className="borrowing-card__actions">
        {borrowing.status === 'pending' && canApprove ? (
          <>
            <button
              className="btn btn-sm btn-primary"
              disabled={actionLoading !== null}
              onClick={onApprove}
              type="button"
            >
              {actionLoading === `${borrowing.id}:approve`
                ? 'Zapis...'
                : 'Zatwierdź'}
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={actionLoading !== null}
              onClick={onReject}
              type="button"
            >
              Odrzuć
            </button>
          </>
        ) : null}
        {borrowing.status === 'reserved' && canHandover ? (
          <button
            className="btn btn-sm btn-primary"
            disabled={actionLoading !== null}
            onClick={onHandover}
            type="button"
          >
            {actionLoading === `${borrowing.id}:handover`
              ? 'Zapis...'
              : handoverLabel}
          </button>
        ) : null}
        {borrowing.status === 'borrowed' && canReturn ? (
          <button
            className="btn btn-sm btn-secondary"
            disabled={actionLoading !== null}
            onClick={onReturn}
            type="button"
          >
            Zwrot
          </button>
        ) : null}
      </div>
    </article>
  );
}

function BorrowingRequestForm({
  items,
  loading,
  onSubmit,
}: {
  items: Item[];
  loading: boolean;
  onSubmit: (payload: BorrowingRequestPayload) => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? 0);
  const [mode, setMode] = useState<BorrowingRequestPayload['mode']>('classic');
  const [plannedReturnAt, setPlannedReturnAt] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  useEffect(() => {
    setItemId(items[0]?.id ?? 0);
  }, [items]);
  return (
    <div className="form">
      {items.length === 0 ? (
        <div className="alert alert-info">
          Brak przedmiotów dostępnych do złożenia wniosku.
        </div>
      ) : null}
      <label className="form-label">Przedmiot *</label>
      <select
        className="form-input"
        value={itemId}
        onChange={(event) => setItemId(Number(event.target.value))}
        disabled={items.length === 0}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <label className="form-label">Tryb *</label>
      <select
        className="form-input"
        value={mode}
        onChange={(event) =>
          setMode(event.target.value as BorrowingRequestPayload['mode'])
        }
      >
        <option value="classic">Klasyczne</option>
        <option value="trusted">Zaufane</option>
        <option value="asynchronous">Asynchroniczne</option>
      </select>
      <label className="form-label">Planowany zwrot *</label>
      <input
        className="form-input"
        type="datetime-local"
        value={plannedReturnAt}
        onChange={(event) => {
          setPlannedReturnAt(event.target.value);
          setDateError(null);
        }}
      />
      {dateError ? <div className="alert alert-error">{dateError}</div> : null}
      <div className="form-actions">
        <button
          className="btn btn-primary"
          disabled={loading || !itemId}
          onClick={() => {
            if (!plannedReturnAt) {
              setDateError('Dodaj datę planowanego zwrotu');
              return;
            }
            onSubmit({
              itemId,
              mode,
              plannedReturnAt: toIsoDate(plannedReturnAt),
            });
          }}
          type="button"
        >
          {loading ? 'Zapisywanie...' : 'Utwórz wniosek'}
        </button>
      </div>
    </div>
  );
}

function ExternalBorrowingForm({
  items,
  loading,
  onSubmit,
}: {
  items: Item[];
  loading: boolean;
  onSubmit: (payload: ExternalBorrowingPayload) => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? 0);
  const [externalBorrower, setExternalBorrower] = useState('');
  const [plannedReturnAt, setPlannedReturnAt] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  useEffect(() => {
    setItemId(items[0]?.id ?? 0);
  }, [items]);
  return (
    <div className="form">
      {items.length === 0 ? (
        <div className="alert alert-info">
          Brak przedmiotów, dla których możesz utworzyć wypożyczenie zewnętrzne.
        </div>
      ) : null}
      <label className="form-label">Przedmiot *</label>
      <select
        className="form-input"
        value={itemId}
        onChange={(event) => setItemId(Number(event.target.value))}
        disabled={items.length === 0}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <label className="form-label">Odbiorca zewnętrzny *</label>
      <input
        className="form-input"
        value={externalBorrower}
        onChange={(event) => setExternalBorrower(event.target.value)}
        placeholder="Nazwa osoby lub instytucji"
      />
      <label className="form-label">Planowany zwrot *</label>
      <input
        className="form-input"
        type="datetime-local"
        value={plannedReturnAt}
        onChange={(event) => {
          setPlannedReturnAt(event.target.value);
          setDateError(null);
        }}
      />
      {dateError ? <div className="alert alert-error">{dateError}</div> : null}
      <div className="form-actions">
        <button
          className="btn btn-primary"
          disabled={loading || !itemId || !externalBorrower.trim()}
          onClick={() => {
            if (!plannedReturnAt) {
              setDateError('Dodaj datę planowanego zwrotu');
              return;
            }
            onSubmit({
              itemId,
              externalBorrower,
              plannedReturnAt: toIsoDate(plannedReturnAt),
            });
          }}
          type="button"
        >
          {loading ? 'Zapisywanie...' : 'Wypożycz'}
        </button>
      </div>
    </div>
  );
}

function ReturnBorrowingForm({
  borrowing,
  itemName,
  loading,
  onSubmit,
}: {
  borrowing: Borrowing;
  itemName: string;
  loading: boolean;
  onSubmit: (comment: string) => void;
}) {
  const [comment, setComment] = useState('');
  return (
    <div className="form">
      <p className="return-summary">
        Zwrot wypożyczenia #{borrowing.id}: {itemName}
      </p>
      <label className="form-label">Komentarz zwrotu</label>
      <textarea
        className="form-input"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="np. Bez uszkodzeń"
      />
      <div className="form-actions">
        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => onSubmit(comment)}
          type="button"
        >
          {loading ? 'Zapisywanie...' : 'Potwierdź zwrot'}
        </button>
      </div>
    </div>
  );
}

function modalTitle(modal: ModalState): string {
  if (modal.mode === 'request') return 'Nowy wniosek';
  if (modal.mode === 'external') return 'Wypożyczenie zewnętrzne';
  return 'Zwrot przedmiotu';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pl-PL');
}

function toIsoDate(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}
