import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  qrService,
  type QuickActionItem,
  type ScannedQrItem,
} from '../services/qrService';

export default function QrScannerPage() {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState('');
  const [scanned, setScanned] = useState<ScannedQrItem | null>(null);
  const [details, setDetails] = useState<QuickActionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

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
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Ta przeglądarka nie udostępnia skanowania kodów QR. Wpisz System ID ręcznie albo wczytaj obraz etykiety.'
      );
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scheduleScan();
      }
    } catch {
      setError(
        'Nie udało się uruchomić kamery. Wpisz System ID ręcznie albo wczytaj obraz etykiety.'
      );
      stopCamera();
    }
  }

  function scheduleScan() {
    scanTimerRef.current = window.setTimeout(
      () => void detectFromCamera(),
      300
    );
  }

  async function detectFromCamera() {
    if (!videoRef.current || !streamRef.current) return;
    const rawValue = decodeVideoFrame(videoRef.current);
    if (rawValue) {
      await resolveQr(rawValue);
      return;
    }
    scheduleScan();
  }

  function decodeVideoFrame(video: HTMLVideoElement): string | null {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    const canvas = canvasRef.current;
    if (!canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data ?? null;
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code?.data) {
        setError('Nie znaleziono kodu QR na wybranym obrazie.');
        return;
      }
      await resolveQr(code.data);
    } catch {
      setError('Nie udało się odczytać kodu QR z obrazu.');
    }
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
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
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
          Wprowadź kod z etykiety, użyj kamery albo wczytaj zdjęcie etykiety QR.
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
            <label className="btn btn-secondary">
              Wczytaj obraz
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) =>
                  void handleImageUpload(event.currentTarget.files?.[0] ?? null)
                }
              />
            </label>
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
        <canvas ref={canvasRef} style={{ display: 'none' }} />
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
              <div className="td-actions">
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={markDamaged}
                >
                  Oznacz jako uszkodzony
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => navigate(`/items?itemId=${details.id}`)}
                >
                  Otwórz szczegóły
                </button>
              </div>
            ) : (
              <div className="alert alert-warning">
                Brak uprawnień do zmiany statusu przedmiotu. Skontaktuj się z
                administratorem bądź opiekunem przedmiotu.
              </div>
            )}
            {!details.canEdit ? (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => navigate(`/items?itemId=${details.id}`)}
              >
                Otwórz szczegóły
              </button>
            ) : null}
          </>
        ) : (
          <p className="login-copy">Zeskanowany przedmiot pojawi się tutaj.</p>
        )}
      </aside>
    </section>
  );
}
