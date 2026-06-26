import { Link } from 'react-router-dom';
import { type ElementType, useEffect, useState } from 'react';
import {
  Package,
  QrCode,
  Plus,
  FileSpreadsheet,
  Printer,
  FileWarning,
  ArrowLeftRight,
  AlertTriangle,
  FolderTree,
  Inbox,
  Database,
} from 'lucide-react';
import {
  dashboardService,
  type DashboardStats,
} from '../services/dashboardService';
import { healthService, type DatabaseStatus } from '../services/healthService';

const quickActions: { to: string; icon: ElementType; label: string }[] = [
  { to: '/items', icon: Package, label: 'Przeglądaj przedmioty' },
  { to: '/borrowings', icon: ArrowLeftRight, label: 'Obsłuż wypożyczenia' },
  { to: '/qr', icon: QrCode, label: 'Skanuj kod QR' },
  { to: '/items', icon: Plus, label: 'Dodaj przedmiot' },
  { to: '/import', icon: FileSpreadsheet, label: 'Importuj z Excel' },
  { to: '/batch-qr', icon: Printer, label: 'Drukuj etykiety' },
  {
    to: '/reports/overdue',
    icon: FileWarning,
    label: 'Raport przeterminowanych',
  },
];

const databaseStatusLabels: Record<DatabaseStatus, string> = {
  ok: 'Połączono',
  error: 'Błąd',
  unknown: 'Nieznany',
};

const HEALTH_REFRESH_INTERVAL_MS = 5000;

const emptyStats: DashboardStats = {
  items: 0,
  borrowed: 0,
  overdue: 0,
  categories: 0,
};

export const HomePage = () => {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus>('unknown');
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadHealth = async () => {
      try {
        const health = await healthService.getStatus();
        if (!isMounted) return;
        setDatabaseStatus(health.database);
        setHealthError(null);
      } catch {
        if (!isMounted) return;
        setDatabaseStatus('error');
        setHealthError('Nie udało się pobrać statusu bazy danych.');
      } finally {
        if (isMounted) setIsHealthLoading(false);
      }
    };
    void loadHealth();
    const intervalId = window.setInterval(
      loadHealth,
      HEALTH_REFRESH_INTERVAL_MS
    );
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      setIsStatsLoading(true);
      try {
        const dashboardStats = await dashboardService.getStats();
        if (!isMounted) return;
        setStats(dashboardStats);
        setStatsError(null);
      } catch {
        if (!isMounted) return;
        setStatsError('Nie udało się pobrać statystyk Dashboardu.');
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    };
    void loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Przegląd systemu zarządzania inwentaryzacją aparatury pomiarowej AGH
          </p>
        </div>
      </div>

      {statsError && <div className="alert alert-error">{statsError}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--accent">
            <Package size={24} />
          </div>
          <div className="stat-card-label">Przedmioty</div>
          <div className="stat-card-value">
            {isStatsLoading ? '...' : stats.items}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--info">
            <ArrowLeftRight size={24} />
          </div>
          <div className="stat-card-label">Wypożyczone</div>
          <div className="stat-card-value">
            {isStatsLoading ? '...' : stats.borrowed}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--danger">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-card-label">Przeterminowane</div>
          <div className="stat-card-value">
            {isStatsLoading ? '...' : stats.overdue}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--warning">
            <FolderTree size={24} />
          </div>
          <div className="stat-card-label">Kategorie</div>
          <div className="stat-card-value">
            {isStatsLoading ? '...' : stats.categories}
          </div>
        </div>
        <div className="stat-card">
          <div
            className={`stat-card-icon stat-card-icon--database-${databaseStatus}`}
          >
            <Database size={24} />
          </div>
          <div className="stat-card-label">Status bazy danych</div>
          <div className="stat-card-value stat-card-value--status">
            {isHealthLoading
              ? 'Sprawdzanie...'
              : databaseStatusLabels[databaseStatus]}
          </div>
          {healthError && <div className="stat-card-note">{healthError}</div>}
        </div>
      </div>

      <div className="section-header">
        <h2>Szybkie akcje</h2>
      </div>
      <div className="quick-actions">
        {quickActions.map((action) => (
          <Link
            key={action.to + action.label}
            to={action.to}
            className="quick-action"
          >
            <div className="quick-action-icon">
              <action.icon size={20} />
            </div>
            {action.label}
          </Link>
        ))}
      </div>

      <div className="section-header">
        <h2>Ostatnia aktywność</h2>
      </div>
      <div className="empty-state">
        <div className="empty-state-icon">
          <Inbox size={48} />
        </div>
        <p className="empty-state-text">
          Brak ostatniej aktywności. Dodaj przedmioty do systemu, aby rozpocząć
          śledzenie inwentaryzacji.
        </p>
      </div>
    </div>
  );
};
