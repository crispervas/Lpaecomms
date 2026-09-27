import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiGet: vi.fn(),
}));

import { apiGet, MESSAGES } from './client';
import { fetchProducts } from './products';

const mockedApiGet = vi.mocked(apiGet);

const apiProduct = {
  id: 1,
  categoryId: 2,
  name: 'Aria 87 Mechanical',
  code: 'aria-87-mechanical',
  price: 149,
  stock: 3,
  img: ['https://img.test/aria.jpg', 'https://img.test/aria-2.jpg'],
  description: 'Clicky.',
  category: { id: 2, name: 'Electronics', code: 'electronics' },
};

const pagination = { total: 1, page: 1, limit: 10, totalPages: 1, count: 1, hasNextPage: false, hasPrevPage: false };

describe('fetchProducts', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('requests /products and keeps only the fields the storefront uses', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: [apiProduct], pagination, error: null });

    const result = await fetchProducts();

    expect(mockedApiGet).toHaveBeenCalledWith('/products');
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: [{ id: 1, name: 'Aria 87 Mechanical', priceAud: 149, imageUrl: 'https://img.test/aria.jpg' }],
      pagination,
      error: null,
    });
  });

  it('normalises a missing image URL to an empty string', async () => {
    const withoutImage = { ...apiProduct, img: [] };
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: [withoutImage], pagination, error: null });

    const result = await fetchProducts();

    expect(result.ok && result.data[0].imageUrl).toBe('');
  });

  it('drops a malformed item and keeps the rest', async () => {
    const broken = { ...apiProduct, id: 2, price: 'free' };
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: [broken, apiProduct], pagination, error: null });

    const result = await fetchProducts();

    expect(result.ok && result.data.map((p) => p.id)).toEqual([1]);
  });

  it('fails when the data is not a list', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { items: [] }, pagination: null, error: null });

    const result = await fetchProducts();

    expect(result).toEqual({ ok: false, status: 200, data: null, error: MESSAGES.unreadable });
  });

  it('passes an API failure through unchanged', async () => {
    const failure = { ok: false as const, status: 502, data: null, error: 'Upstream down.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchProducts()).toEqual(failure);
  });
});
