import { useEffect, useState } from 'react';
import {
  auditLogService,
  type AuditLogEntry,
} from '../services/auditLogService';

const actionLabels: Record<AuditLogEntry['action'], string> = {
  ITEM_CREATED: 'Utworzenie przedmiotu',
  ITEM_UPDATED: 'Edycja przedmiotu',
  STATUS_CHANGED: 'Zmiana statusu',
  LOCATION_CHANGED: 'Zmiana lokalizacji',
  ITEM_BORROWED: 'Wypożyczenie przedmiotu',
  BORROWING_REQUESTED: 'Wniosek o wypożyczenie',
  BORROWING_APPROVED: 'Akceptacja wypożyczenia',
  BORROWING_RETURNED: 'Zwrot przedmiotu',
  PHOTO_ADDED: 'Dodanie zdjęcia',
  OWNER_CHANGED: 'Zmiana opiekuna',
  DELEGATE_ADDED: 'Dodanie delegata',
  DELEGATE_REMOVED: 'Usunięcie delegata',
  DELEGATES_CHANGED: 'Zmiana delegatów',
  ITEM_IMPORTED: 'Import przedmiotu z pliku',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setError(null);
      setIsLoading(true);
      try {
        setLogs(await auditLogService.getAll());
      } catch {
        setError('Nie udało się pobrać logów audytu.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadLogs();
  }, []);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Logi audytu</h1>
          <p className="page-subtitle">
            Historia zmian przedmiotów, wypożyczeń, zdjęć, opiekunów i
            delegatów.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie logów audytu...
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Użytkownik</th>
              <th>Przedmiot</th>
              <th>Rodzaj zmiany</th>
              <th>Przed</th>
              <th>Po</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6}>Brak logów audytu.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString('pl-PL')}</td>
                  <td>{log.userEmail ?? `Użytkownik #${log.userId}`}</td>
                  <td>
                    {log.itemName
                      ? `${log.itemName}${log.itemSerial ? ` (${log.itemSerial})` : ''}`
                      : `Przedmiot #${log.itemId}`}
                  </td>
                  <td>
                    <span className="badge badge-custom">
                      {actionLabels[log.action] ?? log.action}
                    </span>
                  </td>
                  <td>
                    <code className="slug">{formatValue(log.oldValue)}</code>
                  </td>
                  <td>
                    <code className="slug">{formatValue(log.newValue)}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function formatValue(value: Record<string, unknown> | null): string {
  if (!value) return '—';
  return JSON.stringify(value);
}
