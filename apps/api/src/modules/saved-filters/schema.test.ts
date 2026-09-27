import { describe, expect, it } from 'vitest';
import { savedFilterInputSchema, serializeSavedFilter } from './schema.js';

describe('savedFilterInputSchema', () => {
  it('defaults to an unfiltered condition', () => {
    const parsed = savedFilterInputSchema.parse({ name: '全部书目' });
    expect(parsed).toEqual({ name: '全部书目', search: '', status: 'ALL' });
  });

  it('trims name and search', () => {
    const parsed = savedFilterInputSchema.parse({ name: ' 在读的书 ', search: ' 余华 ', status: 'READING' });
    expect(parsed).toEqual({ name: '在读的书', search: '余华', status: 'READING' });
  });

  it('rejects empty or overlong names', () => {
    expect(savedFilterInputSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(savedFilterInputSchema.safeParse({ name: 'a'.repeat(61) }).success).toBe(false);
  });

  it('rejects unknown statuses', () => {
    expect(savedFilterInputSchema.safeParse({ name: 'x', status: 'ARCHIVED' }).success).toBe(false);
  });
});

describe('serializeSavedFilter', () => {
  it('maps a null status back to ALL', () => {
    const now = new Date('2026-09-27T00:00:00.000Z');
    expect(
      serializeSavedFilter({ id: 'f1', name: '全部', search: '', status: null, createdAt: now, updatedAt: now }).status
    ).toBe('ALL');
    expect(
      serializeSavedFilter({ id: 'f2', name: '在读', search: '', status: 'READING', createdAt: now, updatedAt: now })
        .status
    ).toBe('READING');
  });
});
