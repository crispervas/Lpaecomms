import { describe, expect, it } from 'vitest';
import { productPath, tabBase } from './tabBase';

describe('tabBase', () => {
  it.each([
    ['/catalog', '/catalog'],
    ['/catalog/product/4', '/catalog'],
    ['/home', '/home'],
    ['/home/product/4', '/home'],
    ['/home/about', '/home'],
    ['/catalogue', '/home'],
  ])('%s belongs to %s', (pathname, base) => {
    expect(tabBase(pathname)).toBe(base);
  });
});

describe('productPath', () => {
  it('keeps a product inside the tab it was opened from', () => {
    expect(productPath('/catalog/product/4', 9)).toBe('/catalog/product/9');
    expect(productPath('/home', 9)).toBe('/home/product/9');
  });
});
