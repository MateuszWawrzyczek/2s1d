import { useState, type FormEvent } from 'react';
import {
  excelImportService,
  type ImportReport,
} from '../services/excelImportService';

const defaultColumnMapping = {
  name: 'name',
  manufacturer: 'manufacturer',
  description: 'description',
  purchase_date: 'purchase_date',
  category_id: 'category_id',
  status_id: 'status_id',
  location_id: 'location_id',
  owner_id: 'owner_id',
};

export default function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState(defaultColumnMapping);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setReport(null);
    setIsUploading(true);
    try {
      setReport(await excelImportService.upload(file, columnMapping));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się zaimportować pliku.'
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="import-grid">
      <div className="import-panel import-panel--primary">
        <p className="login-eyebrow">Import Excel</p>
        <h1>Migracja danych z arkusza .xlsx</h1>
        <p className="login-copy">
          Import obsługuje kolumny: name, manufacturer, description,
          purchase_date, category_id, status_id, location_id oraz owner_id.
        </p>
      </div>
      <div className="import-panel">
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="excel-file">
            Plik .xlsx
          </label>
          <label className="file-upload" htmlFor="excel-file">
            <span className="btn btn-secondary">
              Wybierz plik .xlsx
            </span>

            <span className="file-upload-name">
              {file ? file.name : 'Nie wybrano pliku'}
            </span>

            <input
              id="excel-file"
              type="file"
              accept=".xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <fieldset className="import-mapping">
            <legend>Mapowanie kolumn</legend>
            {Object.entries(columnMapping).map(([field, column]) => (
              <label className="form-label" key={field}>
                {field}
                <input
                  className="form-input"
                  onChange={(event) =>
                    setColumnMapping((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  value={column}
                />
              </label>
            ))}
          </fieldset>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={!file || isUploading}>
              {isUploading ? 'Importowanie...' : 'Importuj'}
            </button>
          </div>
        </form>
      </div>
      <aside className="import-panel import-report">
        <p className="login-eyebrow">Raport</p>
        {report ? (
          <>
            <dl>
              <dt>Przetworzone wiersze</dt>
              <dd>{report.total_rows_processed}</dd>
              <dt>Zaimportowane</dt>
              <dd>{report.successful_rows}</dd>
              <dt>Błędy</dt>
              <dd>{report.errors.length}</dd>
            </dl>
            {report.errors.length ? (
              <table className="table import-errors">
                <thead>
                  <tr>
                    <th>Wiersz</th>
                    <th>Błąd</th>
                  </tr>
                </thead>
                <tbody>
                  {report.errors.map((item) => (
                    <tr key={`${item.row_number}-${item.error_message}`}>
                      <td>{item.row_number}</td>
                      <td>{item.error_message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </>
        ) : (
          <p className="login-copy">Raport pojawi się po przesłaniu pliku.</p>
        )}
      </aside>
    </section>
  );
}
