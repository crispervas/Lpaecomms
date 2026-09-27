import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/catalog', () => ({ fetchCatalogPage: vi.fn() }));

import { fetchCatalogPage } from '../api/catalog';
import { useRelatedProducts } from './useRelatedProducts';

const mockedFetch = vi.mocked(fetchCatalogPage);

const page = (ids: number[]) => ({
  ok: true as const,
  status: 200,
  data: {
    products: ids.map((id) => ({ id, name: `P${id}`, priceAud: 10, imageUrl: '', category: 'Clothes' })),
    hasMore: false,
    page: 1,
  },
  error: null,
});

describe('useRelatedProducts', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('asks for one more than it shows, from the same category', async () => {
    mockedFetch.mockResolvedValue(page([1, 2, 3, 4, 5]));

    renderHook(() => useRelatedProducts('clothes', 3));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith({ category: 'clothes', page: 1, limit: 5 }));
  });

  it('leaves out the product being viewed and shows at most four', async () => {
    mockedFetch.mockResolvedValue(page([1, 2, 3, 4, 5]));

    const { result } = renderHook(() => useRelatedProducts('clothes', 3));

    await waitFor(() => expect(result.current.map((p) => p.id)).toEqual([1, 2, 4, 5]));
  });

  it('shows nothing and asks nothing for a product without a category', async () => {
    const { result } = renderHook(() => useRelatedProducts('', 3));
    await act(async () => {});

    expect(result.current).toEqual([]);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('shows nothing when the request fails', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 502, data: null, error: 'Down.' });

    const { result } = renderHook(() => useRelatedProducts('clothes', 3));
    await act(async () => {});

    expect(result.current).toEqual([]);
  });
});
