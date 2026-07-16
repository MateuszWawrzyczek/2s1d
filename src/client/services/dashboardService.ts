import { borrowingReportService } from './borrowingReportService';
import { itemService } from './itemService';
import { authHeaders } from './authHeaders';

export interface DashboardStats {
  items: number;
  borrowed: number;
  overdue: number;
  categories: number;
}

export interface DashboardActivity {
  id: number;
  timestamp: string;
  action: string;
  itemId: number;
  userEmail: string | null;
  itemName: string | null;
  itemSystemId: string | null;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [items, categories, statuses, overdueRows] = await Promise.all([
      itemService.getAll(),
      itemService.getCategories(),
      itemService.getStatuses(),
      borrowingReportService.getOverdue(false),
    ]);

    const borrowedStatusIds = new Set(
      statuses
        .filter((status) => status.name.toLowerCase() === 'wypożyczony')
        .map((status) => status.id)
    );

    return {
      items: items.length,
      borrowed: items.filter((item) => borrowedStatusIds.has(item.statusId))
        .length,
      overdue: overdueRows.length,
      categories: categories.length,
    };
  },
  async getRecentActivity(): Promise<DashboardActivity[]> {
    const response = await fetch('/api/v1/audit-logs/recent', {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Nie udało się pobrać aktywności.');
    return response.json();
  },
};
