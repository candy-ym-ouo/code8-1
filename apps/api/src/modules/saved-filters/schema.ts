import { z } from 'zod';
import { BOOK_STATUSES, type BookStatus } from '@paper-book-traces/shared';

export type SavedFilterStatus = BookStatus | 'ALL';

export const SAVED_FILTER_STATUSES: [SavedFilterStatus, ...SavedFilterStatus[]] = ['ALL', ...BOOK_STATUSES];

export const savedFilterInputSchema = z.object({
  name: z.string().trim().min(1, '请输入筛选名称').max(60, '筛选名称最长 60 字'),
  search: z.string().trim().max(200, '搜索词最长 200 字').optional().default(''),
  status: z.enum(SAVED_FILTER_STATUSES).optional().default('ALL')
});

export interface SavedFilterRecord {
  id: string;
  name: string;
  search: string;
  status: BookStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeSavedFilter(filter: SavedFilterRecord) {
  return {
    id: filter.id,
    name: filter.name,
    search: filter.search,
    status: filter.status ?? 'ALL',
    createdAt: filter.createdAt,
    updatedAt: filter.updatedAt
  };
}
