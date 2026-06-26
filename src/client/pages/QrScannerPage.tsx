import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  qrService,
  type QuickActionItem,
  type ScannedQrItem,
} from '../services/qrService';

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

export default function QrScannerPage() {
  const [qrData, setQrData] = useState('');
  const [scanned, setScanned] = useState<ScannedQrItem | null>(null);
  const [details, setDetails] = useState<QuickActionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await resolveQr(qrData);
  }
  async function resolveQr(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    setWarning(null);
    setIsLoading(true);
    try {
      const item = await qrService.scan(trimmed);
      const quickActions = await qrService.getQuickActions(item.id);
      setScanned(item);
      setDetails(quickActions);
      setQrData(item.qr_data);
      stopCamera();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się odczytać kodu QR.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function startCamera() {
    const BarcodeDetector = getBarcodeDetector();
    if (!BarcodeDetector) {
      setError('Ta przeglądarka nie udostępnia skanowania kodów QR.');
      return;
    }
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    streamRef.current = stream;
    setIsCameraActive(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      void detectFromCamera(new BarcodeDetector({ formats: ['qr_code'] }));
    }
  }
  async function detectFromCamera(
    detector: InstanceType<BarcodeDetectorConstructor>
  ) {
    if (!videoRef.current || !streamRef.current) return;
    const [code] = await detector.detect(videoRef.current);
    if (code?.rawValue) {
      await resolveQr(code.rawValue);
      return;
    }
    window.setTimeout(() => void detectFromCamera(detector), 350);
  }

  async function markDamaged() {
    if (!details) return;
    setError(null);
    setSuccess(null);
    setWarning(null);
    if (details.status.toLowerCase() === 'uszkodzony') {
      setWarning('Status przedmiotu to już jest uszkodzony.');
      return;
    }
    try {
      setDetails(await qrService.markDamaged(details.id));
      setSuccess('Pomyślnie zmieniono status przedmiotu na uszkodzony.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się zmienić statusu.'
      );
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  }

  return (
    <section className="qr-grid">
      <div className="qr-panel qr-panel--scan">
        <p className="login-eyebrow">Identyfikacja QR</p>
        <h1>Skanowanie przedmiotów</h1>
        <p className="login-copy">
          Wprowadź kod z etykiety albo użyj kamery, aby odczytać identyfikator
          przedmiotu i wykonać szybką akcję.
        </p>
        <form className="form qr-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="qr-data">
            Kod QR
          </label>
          <input
            className="form-input"
            id="qr-data"
            value={qrData}
            onChange={(event) => setQrData(event.target.value)}
            placeholder="ITEM-..."
          />
          <div className="td-actions">
            <button
              className="btn btn-primary"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Sprawdzanie...' : 'Sprawdź'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={startCamera}
            >
              Skanuj kamerą
            </button>
            {isCameraActive ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={stopCamera}
              >
                Zatrzymaj kamerę
              </button>
            ) : null}
          </div>
        </form>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <video className="qr-video" muted playsInline ref={videoRef} />
      </div>
      <aside className="qr-panel">
        <p className="login-eyebrow">Szczegóły</p>
        {scanned && details ? (
          <>
            <dl className="qr-details">
              <dt>Nazwa</dt>
              <dd>{details.name}</dd>
              <dt>Kod</dt>
              <dd>{scanned.qr_data}</dd>
              <dt>Lokalizacja</dt>
              <dd>{details.location}</dd>
              <dt>Status</dt>
              <dd>{details.status}</dd>
            </dl>
            {success ? (
              <div
                className="alert alert-success"
                style={{ marginBottom: '16px' }}
              >
                {success}
              </div>
            ) : null}
            {warning ? (
              <div
                className="alert alert-warning"
                style={{ marginBottom: '16px' }}
              >
                {warning}
              </div>
            ) : null}
            {details.canEdit ? (
              <button
                className="btn btn-danger"
                type="button"
                onClick={markDamaged}
              >
                Oznacz jako uszkodzony
              </button>
            ) : (
              <div className="alert alert-warning">
                Brak uprawnień do zmiany statusu przedmiotu. Skontaktuj się z
                administratorem bądź opiekunem przedmiotu.
              </div>
            )}
          </>
        ) : (
          <p className="login-copy">Zeskanowany przedmiot pojawi się tutaj.</p>
        )}
      </aside>
    </section>
  );
}
function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const candidate = (
    window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  return candidate ?? null;
}
