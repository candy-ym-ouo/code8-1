import { BOOK_STATUSES, type BookStatus } from '@paper-book-traces/shared';

/**
 * 书目列表的筛选与分页状态。
 * 同一份状态有三种表示：内存对象、URL query、localStorage，
 * 这里的纯函数负责三者之间的无损转换与合法性归一。
 */
export interface BooksFilter {
  search: string;
  status: 'ALL' | BookStatus;
  page: number;
}

export const DEFAULT_BOOKS_FILTER: BooksFilter = { search: '', status: 'ALL', page: 1 };

const STORAGE_PREFIX = 'paper-book-traces:books-filter';

function storageKey(userId: string | null): string {
  // 按用户隔离，避免同一浏览器切换账号后看到上一个账号的筛选
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

function normalizeSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value: unknown): 'ALL' | BookStatus {
  return typeof value === 'string' && (BOOK_STATUSES as string[]).includes(value)
    ? (value as BookStatus)
    : 'ALL';
}

function normalizePage(value: unknown): number {
  const page = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 从 URL query 解析筛选状态。query 中不含任何筛选键时返回 null，
 * 调用方据此回退到 localStorage 或默认值。
 */
export function booksFilterFromQuery(query: Record<string, unknown>): BooksFilter | null {
  const search = firstValue(query.search);
  const status = firstValue(query.status);
  const page = firstValue(query.page);
  const hasAny = [search, status, page].some((value) => typeof value === 'string' && value !== '');
  if (!hasAny) return null;
  return {
    search: normalizeSearch(search),
    status: normalizeStatus(status),
    page: normalizePage(page)
  };
}

/** 序列化为 URL query，默认值省略以保持地址栏干净。 */
export function booksFilterToQuery(filter: BooksFilter): Record<string, string> {
  const query: Record<string, string> = {};
  if (filter.search) query.search = filter.search;
  if (filter.status !== 'ALL') query.status = filter.status;
  if (filter.page > 1) query.page = String(filter.page);
  return query;
}

/** 读取保存的筛选；未保存或内容损坏时返回 null，绝不抛出。 */
export function loadSavedBooksFilter(
  storage: Pick<Storage, 'getItem'>,
  userId: string | null
): BooksFilter | null {
  try {
    const raw = storage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return {
      search: normalizeSearch(record.search),
      status: normalizeStatus(record.status),
      page: normalizePage(record.page)
    };
  } catch {
    return null;
  }
}

/** 保存筛选；存储不可用（隐私模式、配额满）时静默降级，不影响列表使用。 */
export function saveBooksFilter(
  storage: Pick<Storage, 'setItem'>,
  userId: string | null,
  filter: BooksFilter
): void {
  try {
    storage.setItem(storageKey(userId), JSON.stringify(filter));
  } catch {
    // 忽略持久化失败
  }
}

export function sameBooksFilter(a: BooksFilter, b: BooksFilter): boolean {
  return a.search === b.search && a.status === b.status && a.page === b.page;
}

/**
 * 把页码钳制到 [1, maxPage]。并发删除或筛选变化会让总数缩小，
 * 当前页可能因此越界，需要回退到最后一页重新取数。
 */
export function clampPageToTotal(page: number, total: number, pageSize: number): number {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), maxPage);
}
