import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/products', () => ({ fetchProducts: vi.fn() }));

import { fetchProducts } from '../api/products';
import { useProducts } from './useProducts';

const mockedFetch = vi.mocked(fetchProducts);
const product = { id: 1, name: 'Aria 87 Mechanical', priceAud: 149, imageUrl: '' };

describe('useProducts', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('starts loading and becomes ready with the products', async () => {
    mockedFetch.mockResolvedValue({ ok: true, status: 200, data: [product], error: null });

    const { result } = renderHook(() => useProducts());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.products).toEqual([product]);
    expect(result.current.error).toBeNull();
  });

  it('reports the error message when the request fails', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: null, data: null, error: 'Offline.' });

    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Offline.');
    expect(result.current.products).toEqual([]);
  });

  it('fetches again on retry', async () => {
    mockedFetch
      .mockResolvedValueOnce({ ok: false, status: null, data: null, error: 'Offline.' })
      .mockResolvedValueOnce({ ok: true, status: 200, data: [product], error: null });

    const { result } = renderHook(() => useProducts());
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
