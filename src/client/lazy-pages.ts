import { lazy } from 'react';

export const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage }))
);
export const StatusesPage = lazy(() => import('./pages/StatusesPage'));
export const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
export const DelegationsPage = lazy(() => import('./pages/DelegationsPage'));
export const BorrowingsPage = lazy(() => import('./pages/BorrowingsPage'));
export const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
export const ExcelImportPage = lazy(() => import('./pages/ExcelImportPage'));
export const ItemsPage = lazy(() => import('./pages/ItemsPage'));
export const UsersPage = lazy(() => import('./pages/UsersPage'));
export const LoginPage = lazy(() => import('./pages/LoginPage'));
export const NotificationsPage = lazy(
  () => import('./pages/NotificationsPage')
);
export const OverdueReportsPage = lazy(
  () => import('./pages/OverdueReportsPage')
);
export const QrScannerPage = lazy(() => import('./pages/QrScannerPage'));
export const BatchQrPage = lazy(() => import('./pages/BatchQrPage'));
export const GroupsPage = lazy(() => import('./pages/GroupsPage'));
