import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiGet: vi.fn(),
}));

import { apiGet, MESSAGES } from './client';
import { fetchProduct, parseProductId } from './product';

const mockedApiGet = vi.mocked(apiGet);

const apiProduct = {
  id: 7,
  categoryId: 2,
  name: 'Wireless Keyboard',
  code: 'wireless-keyboard',
  category: { id: 2, name: 'Electronics', code: 'electronics' },
  price: 120,
  stock: 4,
  description: 'Quiet keys.',
  img: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
};

describe('parseProductId', () => {
  it('accepts a positive whole number', () => {
    expect(parseProductId('42')).toBe(42);
  });

  it.each([undefined, '', 'abc', '0', '1.5', '-1', '99999999999999999999'])('rejects %s', (raw) => {
    expect(parseProductId(raw)).toBeNull();
  });
});

describe('fetchProduct', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('requests the product and keeps the fields the page uses', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: apiProduct, pagination: null, error: null });

    const result = await fetchProduct(7);

    expect(mockedApiGet).toHaveBeenCalledWith('/products/7');
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: {
        id: 7,
        name: 'Wireless Keyboard',
        category: { name: 'Electronics', slug: 'electronics' },
        priceAud: 120,
        description: 'Quiet keys.',
        imageUrls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      },
      pagination: null,
      error: null,
    });
  });

  it('defaults a missing category, description and images, and drops non-string images', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 7, name: 'Keyboard', price: 120, img: ['https://img.test/a.jpg', 3] },
      pagination: null,
      error: null,
    });

    const result = await fetchProduct(7);

    expect(result.ok && result.data).toEqual({
      id: 7,
      name: 'Keyboard',
      category: { name: '', slug: '' },
      priceAud: 120,
      description: '',
      imageUrls: ['https://img.test/a.jpg'],
    });
  });

  it('fails when the product is malformed', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: { id: 7 }, pagination: null, error: null });

    expect(await fetchProduct(7)).toEqual({ ok: false, status: 200, data: null, error: MESSAGES.unreadable });
  });

  it('passes a 404 through unchanged', async () => {
    const failure = { ok: false as const, status: 404, data: null, error: 'Product 7 does not exist.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchProduct(7)).toEqual(failure);
  });
});
