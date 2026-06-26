import { useEffect, useState } from 'react';
import {
  borrowingReportService,
  type OverdueReportRow,
} from '../services/borrowingReportService';
import { useAuth } from '../hooks/useAuth';
import { jsPDF } from 'jspdf';
import 'jspdf/dist/polyfills.es.js';

export default function OverdueReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [includeAll] = useState(false);
  const [rows, setRows] = useState<OverdueReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setError(null);
      setIsLoading(true);
      try {
        setRows(await borrowingReportService.getOverdue(includeAll));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Nie udało się pobrać raportu.'
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [includeAll]);
  async function downloadCsv() {
    await borrowingReportService.download(
      borrowingReportService.csvUrl(includeAll),
      'overdue.csv'
    );
  }
  async function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });

    const fixChars = (str: string) =>
      str
        .replace(/ą/g, 'a')
        .replace(/ć/g, 'c')
        .replace(/ę/g, 'e')
        .replace(/ł/g, 'l')
        .replace(/ń/g, 'n')
        .replace(/ó/g, 'o')
        .replace(/ś/g, 's')
        .replace(/ź/g, 'z')
        .replace(/ż/g, 'z')
        .replace(/Ą/g, 'A')
        .replace(/Ć/g, 'C')
        .replace(/Ę/g, 'E')
        .replace(/Ł/g, 'L')
        .replace(/Ń/g, 'N')
        .replace(/Ó/g, 'O')
        .replace(/Ś/g, 'S')
        .replace(/Ź/g, 'Z')
        .replace(/Ż/g, 'Z');

    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(fixChars('Raport przeterminowanych wypożyczeń'), 14, 20);
    doc.setFontSize(10);

    const headers = [
      'ID',
      'Przedmiot',
      'Odbiorca',
      fixChars('Planowany zwrot'),
      'Dni po terminie',
    ];
    const colWidths = [15, 60, 70, 50, 25];
    let y = 35;

    // Nagłówki tabeli
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 5, 265, 8, 'F');
    doc.setFont('helvetica', 'bold');
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(fixChars(h), x, y);
      x += colWidths[i];
    });
    y += 8;

    // Wiersze
    doc.setFont('helvetica', 'normal');
    for (const row of rows) {
      const plannedReturn = row.plannedReturnAt
        ? new Date(row.plannedReturnAt).toLocaleDateString('pl-PL')
        : '—';
      const borrower = row.borrowerEmail ?? row.externalBorrower ?? '—';
      const values = [
        String(row.borrowingId),
        row.itemName,
        borrower,
        plannedReturn,
        String(row.daysOverdue),
      ];
      x = 14;
      values.forEach((v, i) => {
        doc.text(fixChars(v.slice(0, 40)), x, y);
        x += colWidths[i];
      });
      y += 7;
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save('overdue.pdf');
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Raport przeterminowanych wypożyczeń</h1>
          <p className="page-subtitle">
            Lista przedmiotów po planowanym terminie zwrotu z eksportem CSV i
            PDF.
          </p>
        </div>
        <div className="td-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={downloadCsv}
          >
            Pobierz CSV
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={downloadPdf}
          >
            Pobierz PDF
          </button>
        </div>
      </div>
      {isAdmin ? (
        <p style={{ marginBottom: '1rem' }}>
          Wyświetlane są wszystkie przeterminowane wypożyczenia w systemie.
        </p>
      ) : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie raportu...
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Wypożyczenie</th>
              <th>Przedmiot</th>
              <th>Odbiorca</th>
              <th>Planowany zwrot</th>
              <th>Dni po terminie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.borrowingId}>
                <td>{row.borrowingId}</td>
                <td>{row.itemName}</td>
                <td>{row.borrowerEmail ?? row.externalBorrower ?? '—'}</td>
                <td>
                  {new Date(row.plannedReturnAt).toLocaleDateString('pl-PL')}
                </td>
                <td>{row.daysOverdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
