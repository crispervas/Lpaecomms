import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/categories', () => ({ fetchCategories: vi.fn() }));

import { fetchCategories } from '../api/categories';
import { useCategories } from './useCategories';

const mockedFetch = vi.mocked(fetchCategories);

describe('useCategories', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns the categories once loaded', async () => {
    const clothes = { id: 1, name: 'Clothes', slug: 'clothes' };
    mockedFetch.mockResolvedValue({ ok: true, status: 200, data: [clothes], error: null });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current).toEqual([clothes]));
  });

  it('stays empty when the request fails', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 502, data: null, error: 'Down.' });

    const { result } = renderHook(() => useCategories());
    await act(async () => {});

    expect(mockedFetch).toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });
});
