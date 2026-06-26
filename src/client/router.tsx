import { createBrowserRouter } from 'react-router-dom';
import { Suspense, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { AuthGate } from './components/AuthGate';
import { GuestOnly } from './components/GuestOnly';
import { ErrorPage } from './pages/ErrorPage';
import {
  AuditLogsPage,
  BatchQrPage,
  BorrowingsPage,
  CategoriesPage,
  DelegationsPage,
  ExcelImportPage,
  GroupsPage,
  HomePage,
  ItemsPage,
  LoginPage,
  NotificationsPage,
  OverdueReportsPage,
  QrScannerPage,
  StatusesPage,
  UsersPage,
} from './lazy-pages';

function loading(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie...
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <AuthGate>{loading(<HomePage />)}</AuthGate> },
      {
        path: '/statuses',
        element: <AuthGate>{loading(<StatusesPage />)}</AuthGate>,
      },
      {
        path: '/categories',
        element: <AuthGate>{loading(<CategoriesPage />)}</AuthGate>,
      },
      {
        path: '/delegations',
        element: <AuthGate>{loading(<DelegationsPage />)}</AuthGate>,
      },
      {
        path: '/borrowings',
        element: <AuthGate>{loading(<BorrowingsPage />)}</AuthGate>,
      },
      {
        path: '/users',
        element: <AuthGate requireAdmin>{loading(<UsersPage />)}</AuthGate>,
      },
      {
        path: '/audit-logs',
        element: <AuthGate requireAdmin>{loading(<AuditLogsPage />)}</AuthGate>,
      },
      {
        path: '/items',
        element: <AuthGate>{loading(<ItemsPage />)}</AuthGate>,
      },
      {
        path: '/qr',
        element: <AuthGate>{loading(<QrScannerPage />)}</AuthGate>,
      },
      {
        path: '/import',
        element: (
          <AuthGate requireAdmin>{loading(<ExcelImportPage />)}</AuthGate>
        ),
      },
      {
        path: '/reports/overdue',
        element: <AuthGate>{loading(<OverdueReportsPage />)}</AuthGate>,
      },
      {
        path: '/batch-qr',
        element: <AuthGate>{loading(<BatchQrPage />)}</AuthGate>,
      },
      {
        path: '/notifications',
        element: <AuthGate>{loading(<NotificationsPage />)}</AuthGate>,
      },
      {
        path: '/groups',
        element: <AuthGate requireAdmin>{loading(<GroupsPage />)}</AuthGate>,
      },
      {
        path: '/login',
        element: <GuestOnly>{loading(<LoginPage />)}</GuestOnly>,
      },
    ],
  },
]);
