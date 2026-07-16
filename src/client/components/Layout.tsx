import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState, type ElementType } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  CircleDot,
  Send,
  ArrowLeftRight,
  QrCode,
  Printer,
  FileSpreadsheet,
  FileWarning,
  Bell,
  History,
  Users,
  Menu,
  LogIn,
  LogOut,
} from 'lucide-react';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';

const NOTIFICATIONS_SEEN_AT_KEY = 'notifications-seen-at';

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  section?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    section: 'Główne',
    requiresAuth: true,
  },
  { to: '/items', label: 'Przedmioty', icon: Package, requiresAuth: true },
  {
    to: '/categories',
    label: 'Kategorie',
    icon: FolderTree,
    requiresAuth: true,
  },
  { to: '/statuses', label: 'Statusy', icon: CircleDot, requiresAuth: true },
  { to: '/delegations', label: 'Delegacje', icon: Send, requiresAuth: true },
  {
    to: '/borrowings',
    label: 'Wypożyczenia',
    icon: ArrowLeftRight,
    requiresAuth: true,
  },
  {
    to: '/qr',
    label: 'Skaner QR',
    icon: QrCode,
    section: 'Narzędzia',
    requiresAuth: true,
  },
  { to: '/batch-qr', label: 'Druk QR', icon: Printer, requiresAuth: true },
  {
    to: '/import',
    label: 'Import Excel',
    icon: FileSpreadsheet,
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    to: '/reports/overdue',
    label: 'Raporty',
    icon: FileWarning,
    requiresAuth: true,
  },
  {
    to: '/users',
    label: 'Użytkownicy',
    icon: Users,
    section: 'System',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    to: '/groups',
    label: 'Grupy',
    icon: Users,
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    to: '/notifications',
    label: 'Powiadomienia',
    icon: Bell,
    requiresAuth: true,
  },
  {
    to: '/audit-logs',
    label: 'Logi audytu',
    icon: History,
    requiresAuth: true,
    requiresAdmin: true,
  },
];

export const Layout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      return;
    }
    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const events = await notificationService.listEvents();
        const seenAt = Date.parse(
          window.localStorage.getItem(NOTIFICATIONS_SEEN_AT_KEY) ?? ''
        );
        const unread = events.filter(
          (event) =>
            !Number.isFinite(seenAt) || Date.parse(event.createdAt) > seenAt
        ).length;
        if (!cancelled) setNotificationCount(unread);
      } catch {
        if (!cancelled) setNotificationCount(0);
      }
    };
    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user]);

  const markNotificationsSeen = () => {
    window.localStorage.setItem(
      NOTIFICATIONS_SEEN_AT_KEY,
      new Date().toISOString()
    );
    setNotificationCount(0);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <button
        className="btn btn-ghost mobile-nav-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-controls="main-navigation"
        aria-expanded={sidebarOpen}
        aria-label="Menu"
        type="button"
      >
        <Menu size={20} />
      </button>

      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 49,
          }}
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        id="main-navigation"
      >
        <Link
          to="/"
          className="sidebar-brand"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="sidebar-brand-icon">SZ</div>
          <div className="sidebar-brand-text">
            Inwentaryzacja
            <small>System zarządzania</small>
          </div>
        </Link>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems
            .filter((item) => {
              if (item.requiresAuth && !user) return false;
              if (item.requiresAdmin && user?.role !== 'admin') return false;
              return true;
            })
            .map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <div key={item.to}>
                  {item.section && (
                    <div className="sidebar-section">
                      <div className="sidebar-section-label">
                        {item.section}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '0 10px' }}>
                    <Link
                      to={item.to}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      onClick={
                        item.to === '/notifications'
                          ? markNotificationsSeen
                          : () => setSidebarOpen(false)
                      }
                    >
                      <span className="nav-link-icon">
                        <item.icon size={18} />
                      </span>
                      {item.label}
                      {item.to === '/notifications' && notificationCount > 0 ? (
                        <span
                          className="notification-badge"
                          aria-label={`${notificationCount} nowych powiadomień`}
                        >
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                </div>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <>
              <button
                className="sidebar-logout"
                onClick={() => {
                  authService.logout();
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-link-icon">
                  <LogOut size={18} />
                </span>
                Wyloguj
              </button>
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user.email}</div>
                  <div className="sidebar-user-role">
                    {user.role === 'admin'
                      ? 'Administrator'
                      : 'Pracownik'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="nav-link"
                style={{ marginBottom: 8 }}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-link-icon">
                  <LogIn size={18} />
                </span>
                Logowanie
              </Link>
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">?</div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">Niezalogowany</div>
                  <div className="sidebar-user-role">Zaloguj się</div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="main-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
};
