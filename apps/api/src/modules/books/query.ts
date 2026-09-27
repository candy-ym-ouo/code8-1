import { Prisma } from '@prisma/client';
import { BOOK_STATUSES, type BookStatus } from '@paper-book-traces/shared';
import { AppError } from '../../lib/errors.js';

/**
 * 书目列表的确定性排序：updatedAt 精确到毫秒，可能并列，
 * 必须用 id 作为最终次序，否则跨页可能出现重复或遗漏。
 */
export const BOOK_LIST_ORDER_BY = [
  { updatedAt: 'desc' },
  { id: 'desc' }
] satisfies Prisma.BookOrderByWithRelationInput[];

export interface BookListFilters {
  status?: BookStatus;
  search?: string;
}

export function normalizeBookListFilters(query: Record<string, unknown>): BookListFilters {
  const rawStatus = typeof query.status === 'string' && query.status !== 'ALL' ? query.status : undefined;
  if (rawStatus && !BOOK_STATUSES.includes(rawStatus as BookStatus)) {
    throw new AppError(422, 'VALIDATION_ERROR', '书目状态无效');
  }
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  return {
    ...(rawStatus ? { status: rawStatus as BookStatus } : {}),
    ...(search ? { search } : {})
  };
}

export function buildBookListWhere(userId: string, filters: BookListFilters): Prisma.BookWhereInput {
  return {
    userId,
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { author: { contains: filters.search, mode: 'insensitive' } }
          ]
        }
      : {})
  };
}
