import { describe, expect, it } from 'vitest';
import { shortText } from './format';

describe('shortText', () => {
  it('normalizes whitespace and truncates long content', () => {
    expect(shortText('  一段\n  文字  ', 20)).toBe('一段 文字');
    expect(shortText('123456', 4)).toBe('1234…');
  });
});
