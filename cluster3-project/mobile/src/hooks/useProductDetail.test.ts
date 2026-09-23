import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/product', () => ({ fetchProduct: vi.fn() }));

import { fetchProduct, type ProductDetail } from '../api/product';
import type { ApiResult } from '../api/client';
import { useProductDetail } from './useProductDetail';

const mockedFetch = vi.mocked(fetchProduct);

const product = (id: number): ProductDetail => ({
  id,
  name: `P${id}`,
  category: { name: 'Clothes', slug: 'clothes' },
  priceAud: 10,
  description: '',
  imageUrls: [],
});

const ok = (id: number): ApiResult<ProductDetail> => ({ ok: true, status: 200, data: product(id), error: null });

describe('useProductDetail', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('loads the product', async () => {
    mockedFetch.mockResolvedValue(ok(7));

    const { result } = renderHook(() => useProductDetail(7));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.product?.id).toBe(7);
  });

  it('reports a product the API does not know as not found', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 404, data: null, error: 'Product 7 does not exist.' });

    const { result } = renderHook(() => useProductDetail(7));

    await waitFor(() => expect(result.current.status).toBe('notFound'));
  });

  it('reports other failures as errors with their message', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 502, data: null, error: 'Down.' });

    const { result } = renderHook(() => useProductDetail(7));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Down.');
  });

  it('treats an unusable id as not found without a request', () => {
    const { result } = renderHook(() => useProductDetail(null));

    expect(result.current.status).toBe('notFound');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('fetches again on retry', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: null, data: null, error: 'Offline.' }).mockResolvedValueOnce(ok(7));

    const { result } = renderHook(() => useProductDetail(7));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('ignores the response for a product that is no longer shown', async () => {
    let resolveFirst: (value: ApiResult<ProductDetail>) => void = () => {};
    mockedFetch.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve))).mockResolvedValueOnce(ok(9));

    const { result, rerender } = renderHook(({ id }) => useProductDetail(id), { initialProps: { id: 7 } });
    rerender({ id: 9 });
    await waitFor(() => expect(result.current.product?.id).toBe(9));

    await act(async () => resolveFirst(ok(7)));

    expect(result.current.product?.id).toBe(9);
  });
});
