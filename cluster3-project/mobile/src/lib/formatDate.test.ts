import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats a calendar date as in the mockups', () => {
    expect(formatDate('2026-07-12')).toBe('Jul 12, 2026');
  });

  it('keeps the first of the month on its own day', () => {
    expect(formatDate('2026-06-01')).toBe('Jun 1, 2026');
  });

  it('rejects an invalid date', () => {
    expect(() => formatDate('not-a-date')).toThrow(RangeError);
  });
});
