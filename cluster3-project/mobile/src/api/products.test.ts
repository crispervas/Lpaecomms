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
  name: 'Aria 87 Mechanical',
  priceAud: 149,
  imageUrl: 'https://img.test/aria.jpg',
  store: 'Surfers Paradise',
  latitude: -28.0023,
  longitude: 153.4145,
};

describe('fetchProducts', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('requests /products and keeps only the fields the storefront uses', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { products: [apiProduct] }, error: null });

    const result = await fetchProducts();

    expect(mockedApiGet).toHaveBeenCalledWith('/products');
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: [{ id: 1, name: 'Aria 87 Mechanical', priceAud: 149, imageUrl: 'https://img.test/aria.jpg' }],
      error: null,
    });
  });

  it('normalises a missing image URL to an empty string', async () => {
    const withoutImage: Partial<typeof apiProduct> = { ...apiProduct };
    delete withoutImage.imageUrl;
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { products: [withoutImage] }, error: null });

    const result = await fetchProducts();

    expect(result.ok && result.data[0].imageUrl).toBe('');
  });

  it('drops a malformed item and keeps the rest', async () => {
    const broken = { ...apiProduct, id: 2, priceAud: 'free' };
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { products: [broken, apiProduct] },
      error: null,
    });

    const result = await fetchProducts();

    expect(result.ok && result.data.map((p) => p.id)).toEqual([1]);
  });

  it('fails when the body has no products array', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { items: [] }, error: null });

    const result = await fetchProducts();

    expect(result).toEqual({ ok: false, status: 200, data: null, error: MESSAGES.unreadable });
  });

  it('passes an API failure through unchanged', async () => {
    const failure = { ok: false as const, status: 502, data: null, error: 'Upstream down.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchProducts()).toEqual(failure);
  });
});
