import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiGet: vi.fn(),
}));

import { apiGet, MESSAGES } from './client';
import { fetchCategories } from './categories';

const mockedApiGet = vi.mocked(apiGet);

describe('fetchCategories', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('requests every category by name and maps code to slug', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ id: 1, name: 'Clothes', code: 'clothes', extra: true }],
      pagination: null,
      error: null,
    });

    const result = await fetchCategories();

    expect(mockedApiGet).toHaveBeenCalledWith('/categories?limit=100&sort=name&order=asc');
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: [{ id: 1, name: 'Clothes', slug: 'clothes' }],
      pagination: null,
      error: null,
    });
  });

  it('drops a malformed category', async () => {
    mockedApiGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ id: 1, name: 'Clothes' }, { id: 2, name: 'Shoes', code: 'shoes' }],
      pagination: null,
      error: null,
    });

    const result = await fetchCategories();

    expect(result.ok && result.data.map((c) => c.slug)).toEqual(['shoes']);
  });

  it('fails when the data is not a list', async () => {
    mockedApiGet.mockResolvedValue({ ok: true, status: 200, data: {}, pagination: null, error: null });

    expect(await fetchCategories()).toEqual({ ok: false, status: 200, data: null, error: MESSAGES.unreadable });
  });

  it('passes an API failure through unchanged', async () => {
    const failure = { ok: false as const, status: 502, data: null, error: 'Down.' };
    mockedApiGet.mockResolvedValue(failure);

    expect(await fetchCategories()).toEqual(failure);
  });
});
