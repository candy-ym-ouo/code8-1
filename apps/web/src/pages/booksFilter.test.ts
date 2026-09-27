import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOOKS_FILTER,
  booksFilterFromQuery,
  booksFilterToQuery,
  clampPageToTotal,
  loadSavedBooksFilter,
  sameBooksFilter,
  saveBooksFilter
} from './booksFilter';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    dump: () => Object.fromEntries(map)
  };
}

describe('booksFilterFromQuery', () => {
  it('returns null when the query carries no filter keys', () => {
    expect(booksFilterFromQuery({})).toBeNull();
    expect(booksFilterFromQuery({ unrelated: 'x' })).toBeNull();
    expect(booksFilterFromQuery({ search: '', status: '', page: '' })).toBeNull();
  });

  it('parses a full query and fills defaults for missing keys', () => {
    expect(booksFilterFromQuery({ search: ' 雪国 ', status: 'READ', page: '3' })).toEqual({
      search: '雪国',
      status: 'READ',
      page: 3
    });
    expect(booksFilterFromQuery({ status: 'PAUSED' })).toEqual({ search: '', status: 'PAUSED', page: 1 });
  });

  it('drops invalid status and page values instead of trusting the URL', () => {
    expect(booksFilterFromQuery({ status: 'HACKED', page: 'abc' })).toEqual({
      search: '',
      status: 'ALL',
      page: 1
    });
    expect(booksFilterFromQuery({ page: '-2' })).toEqual({ search: '', status: 'ALL', page: 1 });
    expect(booksFilterFromQuery({ page: '2.5' })).toEqual({ search: '', status: 'ALL', page: 1 });
  });

  it('uses the first value when a key appears multiple times', () => {
    expect(booksFilterFromQuery({ status: ['READ', 'PAUSED'] })).toEqual({
      search: '',
      status: 'READ',
      page: 1
    });
  });
});

describe('booksFilterToQuery', () => {
  it('omits defaults to keep the URL clean', () => {
    expect(booksFilterToQuery(DEFAULT_BOOKS_FILTER)).toEqual({});
    expect(booksFilterToQuery({ search: '边城', status: 'READING', page: 2 })).toEqual({
      search: '边城',
      status: 'READING',
      page: '2'
    });
  });

  it('round-trips through booksFilterFromQuery', () => {
    const filter = { search: '边城', status: 'READING' as const, page: 4 };
    expect(booksFilterFromQuery(booksFilterToQuery(filter))).toEqual(filter);
  });
});

describe('saved books filter', () => {
  it('round-trips through storage scoped by user', () => {
    const storage = memoryStorage();
    const filter = { search: '雪国', status: 'READ' as const, page: 2 };
    saveBooksFilter(storage, 'user-1', filter);
    expect(loadSavedBooksFilter(storage, 'user-1')).toEqual(filter);
    expect(loadSavedBooksFilter(storage, 'user-2')).toBeNull();
    expect(loadSavedBooksFilter(storage, null)).toBeNull();
  });

  it('normalizes tampered or outdated stored values', () => {
    const storage = memoryStorage({
      'paper-book-traces:books-filter': JSON.stringify({ search: 42, status: 'NOPE', page: -3 })
    });
    expect(loadSavedBooksFilter(storage, null)).toEqual(DEFAULT_BOOKS_FILTER);
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    const storage = memoryStorage({ 'paper-book-traces:books-filter': '{not json' });
    expect(loadSavedBooksFilter(storage, null)).toBeNull();
  });

  it('swallows storage write failures', () => {
    const broken = {
      setItem: () => {
        throw new Error('quota exceeded');
      }
    };
    expect(() => saveBooksFilter(broken, null, DEFAULT_BOOKS_FILTER)).not.toThrow();
  });
});

describe('clampPageToTotal', () => {
  it('keeps a valid page untouched', () => {
    expect(clampPageToTotal(2, 30, 12)).toBe(2);
    expect(clampPageToTotal(1, 0, 12)).toBe(1);
  });

  it('pulls an out-of-range page back to the last page', () => {
    expect(clampPageToTotal(5, 30, 12)).toBe(3);
    expect(clampPageToTotal(3, 12, 12)).toBe(1);
    expect(clampPageToTotal(9, 0, 12)).toBe(1);
  });
});

describe('sameBooksFilter', () => {
  it('compares all three fields', () => {
    const base = { search: 'a', status: 'READ' as const, page: 2 };
    expect(sameBooksFilter(base, { ...base })).toBe(true);
    expect(sameBooksFilter(base, { ...base, page: 3 })).toBe(false);
    expect(sameBooksFilter(base, { ...base, status: 'ALL' })).toBe(false);
    expect(sameBooksFilter(base, { ...base, search: 'b' })).toBe(false);
  });
});
