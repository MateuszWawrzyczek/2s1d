import { borrowingReportService } from './borrowingReportService';
import { itemService } from './itemService';

export interface DashboardStats {
  items: number;
  borrowed: number;
  overdue: number;
  categories: number;
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
};
