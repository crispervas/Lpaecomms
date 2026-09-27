import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/catalog', () => ({ fetchCatalogPage: vi.fn() }));

import { fetchCatalogPage } from '../api/catalog';
import type { ApiResult } from '../api/client';
import type { CatalogPage } from '../api/catalog';
import { CATALOG_PAGE_SIZE, useCatalog } from './useCatalog';

const mockedFetch = vi.mocked(fetchCatalogPage);

/** A successful page, numbered `pageNo`, holding products with the given ids. */
const page = (ids: number[], hasMore: boolean, pageNo = 1): ApiResult<CatalogPage> => ({
  ok: true,
  status: 200,
  data: {
    products: ids.map((id) => ({ id, name: `P${id}`, priceAud: 10, imageUrl: '', category: 'Clothes' })),
    hasMore,
    page: pageNo,
  },
  error: null,
});

const failure = (error: string): ApiResult<CatalogPage> => ({ ok: false, status: null, data: null, error });

const ids = (result: { current: { products: { id: number }[] } }) => result.current.products.map((p) => p.id);

describe('useCatalog', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('loads the first page for the category', async () => {
    mockedFetch.mockResolvedValue(page([1, 2, 3, 4, 5, 6], true));

    const { result } = renderHook(() => useCatalog(null));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockedFetch).toHaveBeenCalledWith({ category: null, page: 1, limit: CATALOG_PAGE_SIZE });
    expect(ids(result)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.current.hasMore).toBe(true);
  });

  it('starts over when the category changes', async () => {
    mockedFetch.mockResolvedValueOnce(page([1, 2], false)).mockResolvedValueOnce(page([9], false));

    const { result, rerender } = renderHook(({ category }) => useCatalog(category), {
      initialProps: { category: null as string | null },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({ category: 'shoes' });

    await waitFor(() => expect(ids(result)).toEqual([9]));
    expect(mockedFetch).toHaveBeenLastCalledWith({ category: 'shoes', page: 1, limit: CATALOG_PAGE_SIZE });
  });

  it('appends the next page', async () => {
    mockedFetch.mockResolvedValueOnce(page([1, 2, 3, 4, 5, 6], true)).mockResolvedValueOnce(page([7, 8], false, 2));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.loadMore());

    await waitFor(() => expect(ids(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(mockedFetch).toHaveBeenLastCalledWith({ category: null, page: 2, limit: CATALOG_PAGE_SIZE });
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadingMore).toBe(false);
  });

  it('drops repeated products and still asks for the following page', async () => {
    mockedFetch
      .mockResolvedValueOnce(page([1, 2, 3, 4, 5, 6], true))
      .mockResolvedValueOnce(page([6, 7, 8, 9, 10, 11], true, 2))
      .mockResolvedValueOnce(page([12], false, 3));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(mockedFetch).toHaveBeenLastCalledWith({ category: null, page: 3, limit: CATALOG_PAGE_SIZE });
  });

  it('advances past items the client rejected as malformed', async () => {
    mockedFetch
      .mockResolvedValueOnce(page([1, 2, 3, 4, 5, 6], true))
      // The server sent six items, all malformed: nothing shows, but the next
      // request must still move past them instead of asking for them again.
      .mockResolvedValueOnce(page([], true, 2))
      .mockResolvedValueOnce(page([13], false, 3));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.loadMore());
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(mockedFetch).toHaveBeenLastCalledWith({ category: null, page: 3, limit: CATALOG_PAGE_SIZE });
  });

  it('keeps the loaded products when a later page fails', async () => {
    mockedFetch.mockResolvedValueOnce(page([1, 2, 3, 4, 5, 6], true)).mockResolvedValueOnce(failure('Offline.'));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadMoreError).toBe('Offline.'));
    expect(ids(result)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.current.status).toBe('ready');
    expect(result.current.loadingMore).toBe(false);
  });

  it('sends one request for a double tap on load more', async () => {
    mockedFetch.mockResolvedValueOnce(page([1, 2, 3, 4, 5, 6], true)).mockResolvedValueOnce(page([7], false));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a response for a category that is no longer selected', async () => {
    let resolveFirst: (value: ApiResult<CatalogPage>) => void = () => {};
    mockedFetch
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(page([9], false));

    const { result, rerender } = renderHook(({ category }) => useCatalog(category), {
      initialProps: { category: null as string | null },
    });

    rerender({ category: 'shoes' });
    await waitFor(() => expect(ids(result)).toEqual([9]));

    await act(async () => resolveFirst(page([1, 2], false)));

    expect(ids(result)).toEqual([9]);
  });

  it('fetches the first page again on retry', async () => {
    mockedFetch.mockResolvedValueOnce(failure('Offline.')).mockResolvedValueOnce(page([1], false));

    const { result } = renderHook(() => useCatalog(null));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Offline.');

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(ids(result)).toEqual([1]);
  });
});
