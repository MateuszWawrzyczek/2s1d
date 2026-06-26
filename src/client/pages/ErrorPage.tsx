import { useRouteError, Link, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const ErrorPage = () => {
  const error = useRouteError();
  let errorMessage: string;
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Wystąpił nieznany błąd';
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -3,
            color: 'var(--danger)',
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={64} />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.5,
            marginBottom: 12,
          }}
        >
          Coś poszło nie tak
        </h1>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {errorMessage}
        </p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft
            size={16}
            style={{ verticalAlign: 'middle', marginRight: 6 }}
          />
          Wróć do strony głównej
        </Link>
      </div>
    </div>
  );
};
