import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiGet: vi.fn(),
}));

import { apiGet, MESSAGES } from './client';
import { catalogPath, fetchCatalogPage } from './catalog';

const mockedApiGet = vi.mocked(apiGet);

const item = { id: 1, name: 'Hoodie', category: 'Clothes', priceAud: 90, imageUrl: '' };

describe('catalogPath', () => {
  it('omits the category when there is none', () => {
    expect(catalogPath({ category: null, offset: 0, limit: 6 })).toBe('/catalog?offset=0&limit=6');
  });

  it('encodes the category slug', () => {
    expect(catalogPath({ category: 'a b', offset: 6, limit: 6 })).toBe('/catalog?offset=6&limit=6&category=a+b');
  });
});

describe('fetchCatalogPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('returns typed products and hasMore', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { products: [item], offset: 0, limit: 6, hasMore: true },
      error: null,
    });

    const result = await fetchCatalogPage({ category: 'clothes', offset: 0, limit: 6 });

    expect(mockedApiGet).toHaveBeenCalledWith('/catalog?offset=0&limit=6&category=clothes');
    expect(result).toEqual({ ok: true, status: 200, data: { products: [item], hasMore: true }, error: null });
  });

  it('defaults a missing category name to an empty string and drops malformed items', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { products: [{ ...item, category: undefined }, { id: 'x' }], hasMore: false },
      error: null,
    });

    const result = await fetchCatalogPage({ category: null, offset: 0, limit: 6 });

    expect(result.ok && result.data.products).toEqual([{ ...item, category: '' }]);
  });

  it('fails when hasMore is missing', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { products: [item] }, error: null });

    expect(await fetchCatalogPage({ category: null, offset: 0, limit: 6 })).toEqual({
      ok: false,
      status: 200,
      data: null,
      error: MESSAGES.unreadable,
    });
  });

  it('passes an API failure through unchanged', async () => {
    const failure = { ok: false as const, status: 404, data: null, error: 'Category "x" does not exist.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchCatalogPage({ category: 'x', offset: 0, limit: 6 })).toEqual(failure);
  });
});
