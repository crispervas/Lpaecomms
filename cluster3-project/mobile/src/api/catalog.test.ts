import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiGet: vi.fn(),
}));

import { apiGet, MESSAGES } from './client';
import { catalogPath, fetchCatalogPage } from './catalog';

const mockedApiGet = vi.mocked(apiGet);

const item = {
  id: 1,
  name: 'Hoodie',
  price: 90,
  img: [],
  category: { id: 3, name: 'Clothes', code: 'clothes' },
};

const pagination = (page: number, hasNextPage: boolean) => ({
  total: 7, page, limit: 6, totalPages: 2, count: 1, hasNextPage, hasPrevPage: page > 1,
});

describe('catalogPath', () => {
  it('omits the category when there is none', () => {
    expect(catalogPath({ category: null, page: 1, limit: 6 })).toBe('/products?page=1&limit=6');
  });

  it('encodes the category slug', () => {
    expect(catalogPath({ category: 'a b', page: 2, limit: 6 })).toBe('/products?page=2&limit=6&category=a+b');
  });
});

describe('fetchCatalogPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('returns typed products, hasMore and the page served', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: [item], pagination: pagination(1, true), error: null });

    const result = await fetchCatalogPage({ category: 'clothes', page: 1, limit: 6 });

    expect(mockedApiGet).toHaveBeenCalledWith('/products?page=1&limit=6&category=clothes');
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: {
        products: [{ id: 1, name: 'Hoodie', priceAud: 90, imageUrl: '', category: 'Clothes' }],
        hasMore: true,
        page: 1,
      },
      pagination: pagination(1, true),
      error: null,
    });
  });

  it('defaults a missing category name to an empty string and drops malformed items', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ ...item, category: undefined }, { id: 'x' }],
      pagination: pagination(2, false),
      error: null,
    });

    const result = await fetchCatalogPage({ category: null, page: 2, limit: 6 });

    expect(result.ok && result.data.products).toEqual([{ id: 1, name: 'Hoodie', priceAud: 90, imageUrl: '', category: '' }]);
    expect(result.ok && result.data.page).toBe(2);
  });

  it('fails when the pagination block is missing', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: [item], pagination: null, error: null });

    expect(await fetchCatalogPage({ category: null, page: 1, limit: 6 })).toEqual({
      ok: false,
      status: 200,
      data: null,
      error: MESSAGES.unreadable,
    });
  });

  it('passes an API failure through unchanged', async () => {
    const failure = { ok: false as const, status: 400, data: null, error: 'Some fields need attention.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchCatalogPage({ category: 'x', page: 1, limit: 6 })).toEqual(failure);
  });
});
