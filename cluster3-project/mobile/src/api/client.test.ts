import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, MESSAGES, REQUEST_TIMEOUT_MS } from './client';

const BASE = 'http://api.test/api/v1';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiGet', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the parsed body on a 2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { hello: 'world' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet('/products');

    expect(result).toEqual({ ok: true, status: 200, data: { hello: 'world' }, error: null });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/products`);
  });

  it('tolerates a trailing slash on the base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', `${BASE}/`);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await apiGet('/products');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/products`);
  });

  it('keeps the status and the API message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(502, { message: 'The product catalogue source is unavailable.' }),
      ),
    );

    const result = await apiGet('/products');

    expect(result).toEqual({
      ok: false,
      status: 502,
      data: null,
      error: 'The product catalogue source is unavailable.',
    });
  });

  it('falls back to a generic message when the error body has none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })));

    const result = await apiGet('/products');

    expect(result).toEqual({ ok: false, status: 500, data: null, error: MESSAGES.unavailable });
  });

  it('reports a 2xx with an unreadable body as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })));

    const result = await apiGet('/products');

    expect(result).toEqual({ ok: false, status: 200, data: null, error: MESSAGES.unreadable });
  });

  it('reports a network failure with a null status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await apiGet('/products');

    expect(result).toEqual({ ok: false, status: null, data: null, error: MESSAGES.unreachable });
  });

  it('gives up when the server never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const pending = apiGet('/products');
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(await pending).toEqual({
      ok: false,
      status: null,
      data: null,
      error: MESSAGES.unreachable,
    });
  });

  it('fails without calling fetch when no base URL is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet('/products');

    expect(result).toEqual({ ok: false, status: null, data: null, error: MESSAGES.notConfigured });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
