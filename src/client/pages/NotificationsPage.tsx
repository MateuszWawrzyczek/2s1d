import { useEffect, useState, type FormEvent } from 'react';
import {
  notificationService,
  type NotificationEvent,
  type NotificationPreference,
} from '../services/notificationService';

export default function NotificationsPage() {
  const [preference, setPreference] = useState<NotificationPreference | null>(
    null
  );
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setError(null);
      setIsLoading(true);
      try {
        const [p, e] = await Promise.all([
          notificationService.getPreferences(),
          notificationService.listEvents(),
        ]);
        setPreference(p);
        setEvents(e);
      } catch {
        setError('Nie udało się pobrać ustawień powiadomień.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preference) return;
    setError(null);
    setSuccess(null);
    try {
      setPreference(
        await notificationService.updatePreferences({
          emailEnabled: preference.emailEnabled,
          pushEnabled: preference.pushEnabled,
          returnDueNoticeHours: preference.returnDueNoticeHours,
        })
      );
      setSuccess('Preferencje powiadomień zostały zapisane.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się zapisać ustawień.'
      );
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Powiadomienia</h1>
          <p className="page-subtitle">
            Powiadomienia w aplikacji i historia zdarzeń.
          </p>
        </div>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}
      {isLoading || !preference ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie powiadomień...
        </div>
      ) : (
        <>
          <form className="notification-form" onSubmit={handleSubmit}>
            <p className="alert alert-info">
              Kanały e-mail i push nie są dostępne. Zdarzenia są widoczne w tej
              aplikacji.
            </p>
            <label className="form-label" htmlFor="notice-hours">
              Godziny przed terminem zwrotu
            </label>
            <input
              className="form-input"
              id="notice-hours"
              min={1}
              max={720}
              type="number"
              value={preference.returnDueNoticeHours}
              onChange={(e) =>
                setPreference({
                  ...preference,
                  returnDueNoticeHours: Number(e.target.value),
                })
              }
            />
            <button className="btn btn-primary" type="submit">
              Zapisz ustawienie
            </button>
          </form>
          <div className="table-wrap table-wrap--scroll">
            <table className="table notification-events-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Kanał</th>
                  <th>Treść</th>
                  <th>Zaplanowano</th>
                  <th>Wysłano</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Brak zdarzeń powiadomień.</td>
                  </tr>
                ) : (
                  events.map((item) => (
                    <tr key={item.id}>
                      <td>{item.eventType}</td>
                      <td>{item.channel}</td>
                      <td>{item.payload}</td>
                      <td>
                        {new Date(item.scheduledAt).toLocaleString('pl-PL')}
                      </td>
                      <td>
                        {item.sentAt
                          ? new Date(item.sentAt).toLocaleString('pl-PL')
                          : 'Nie'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
