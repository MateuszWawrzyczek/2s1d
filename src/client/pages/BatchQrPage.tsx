import { useEffect, useState } from 'react';
import { batchQrService, type QrSize } from '../services/batchQrService';
import { itemService } from '../services/itemService';
import type { Item } from '../types/item';

export default function BatchQrPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState<QrSize>('medium');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      setError(null);
      setIsLoading(true);
      try {
        setItems(await itemService.getAll());
      } catch {
        setError('Nie udało się pobrać przedmiotów.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  function toggle(id: number) {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]
    );
  }
  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }
  async function download() {
    setError(null);
    setIsDownloading(true);
    try {
      await batchQrService.download(selectedIds, qrSize);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się wygenerować PDF.'
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drukowanie etykiet QR</h1>
          <p className="page-subtitle">
            Wybierz przedmioty, aby wygenerować zbiorczy PDF.
          </p>
        </div>
        <div className="td-actions">
          <label className="form-label" htmlFor="qr-size">
            Rozmiar
          </label>
          <select
            className="form-input form-input--compact"
            id="qr-size"
            value={qrSize}
            onChange={(event) => setQrSize(event.target.value as QrSize)}
          >
            <option value="small">Mały — 24 mm</option>
            <option value="medium">Średni — 30 mm</option>
            <option value="large">Duży — 40 mm</option>
          </select>
          <button
            className="btn btn-primary"
            disabled={!selectedIds.length || isDownloading}
            type="button"
            onClick={download}
          >
            {isDownloading ? 'Generowanie...' : 'Pobierz PDF'}
          </button>
        </div>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie przedmiotów...
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <label className="checkbox-row">
              <input
                aria-label="Zaznacz wszystkie przedmioty"
                checked={allSelected}
                disabled={items.length === 0}
                onChange={toggleAll}
                type="checkbox"
              />
              Zaznacz wszystkie
            </label>
            <span>
              Wybrano: {selectedIds.length} z {items.length}
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Wybór</th>
                <th>ID</th>
                <th>Nazwa</th>
                <th>Producent</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      aria-label={`Wybierz ${item.name}`}
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.manufacturer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
