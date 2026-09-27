import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/errors.js';
import { BOOK_LIST_ORDER_BY, buildBookListWhere, normalizeBookListFilters } from './query.js';

describe('normalizeBookListFilters', () => {
  it('trims search and drops empty conditions', () => {
    expect(normalizeBookListFilters({ search: '  活着  ', status: 'ALL' })).toEqual({ search: '活着' });
    expect(normalizeBookListFilters({})).toEqual({});
    expect(normalizeBookListFilters({ search: '   ' })).toEqual({});
  });

  it('keeps a valid status filter', () => {
    expect(normalizeBookListFilters({ status: 'READING' })).toEqual({ status: 'READING' });
  });

  it('rejects an unknown status', () => {
    expect(() => normalizeBookListFilters({ status: 'ARCHIVED' })).toThrow(AppError);
  });
});

describe('buildBookListWhere', () => {
  it('always scopes to the owner and hides soft-deleted rows', () => {
    const where = buildBookListWhere('user-1', {});
    expect(where.userId).toBe('user-1');
    expect(where.deletedAt).toBeNull();
  });

  it('matches title or author case-insensitively when searching', () => {
    const where = buildBookListWhere('user-1', { search: '余华' });
    expect(where.OR).toEqual([
      { title: { contains: '余华', mode: 'insensitive' } },
      { author: { contains: '余华', mode: 'insensitive' } }
    ]);
  });

  it('combines status and search', () => {
    const where = buildBookListWhere('user-1', { status: 'READ', search: 'x' });
    expect(where.status).toBe('READ');
    expect(where.OR).toBeDefined();
  });
});

describe('BOOK_LIST_ORDER_BY', () => {
  it('ends with a unique tiebreaker so pages cannot overlap', () => {
    expect(BOOK_LIST_ORDER_BY[0]).toEqual({ updatedAt: 'desc' });
    expect(BOOK_LIST_ORDER_BY[BOOK_LIST_ORDER_BY.length - 1]).toEqual({ id: 'desc' });
  });
});
