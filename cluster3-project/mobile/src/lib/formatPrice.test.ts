import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('drops the cents on a whole amount', () => {
    expect(formatPrice(149)).toBe('$149');
  });

  it('keeps two decimals on a fractional amount', () => {
    expect(formatPrice(19.5)).toBe('$19.50');
  });

  it('groups thousands', () => {
    expect(formatPrice(1299)).toBe('$1,299');
  });
});
