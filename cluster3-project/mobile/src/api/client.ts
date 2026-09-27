/**
 * @file HTTP client for the Lpaecomms REST API.
 *
 * Every call, GET or POST, resolves to a result envelope instead of throwing,
 * so views branch on a value rather than wrapping each request in try/catch.
 * The API itself answers `{ message, data, pagination }`; this client unwraps
 * it, so `data` here is the API's `data` and `pagination` rides alongside.
 * `ok` means a 2xx arrived; `status` stays set on failures so an API error
 * (for example a 502 from an unavailable catalogue) remains distinguishable
 * from an unreachable server (`status: null`).
 */

/** One validation message from the API, tagged with its field when it has one. */
export interface ApiValidationEntry {
  /** Request field the message is about. */
  field?: string;
  /** User-facing message. */
  message: string;
}

/** The API's pagination block, present on list responses. */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  count: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Outcome of an API call. Never thrown; always resolved. */
export type ApiResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
      /** The list's pagination block; null for single records. Optional so
       * results built by hand (parsers, tests) need not repeat it. */
      pagination?: Pagination | null;
      error: null;
    }
  | {
      ok: false;
      status: number | null;
      data: null;
      error: string;
      /** Per-field messages from a 422, when the API sent any. */
      validation?: ApiValidationEntry[];
    };

/**
 * How long a request may take before it is abandoned. Without a limit a
 * server that accepts the connection but never answers would leave the view
 * showing its loading state forever.
 */
export const REQUEST_TIMEOUT_MS = 8000;

/** User-facing failure messages, exported so tests and views share them. */
export const MESSAGES = {
  notConfigured: 'The app is not configured to reach the store.',
  unreachable: 'Could not reach the store. Check your connection and try again.',
  unavailable: 'The store is unavailable right now. Please try again.',
  unreadable: 'The store sent a response the app could not read.',
} as const;

/**
 * Parse a response body as JSON.
 *
 * @param response - The fetch response.
 * @returns The parsed body, or undefined when it is not valid JSON.
 */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Extract the API's error message from an error body.
 *
 * @param body - A parsed error body, in the API's `{ message }` shape or not.
 * @returns The message, or null when the body carries none.
 */
function messageFrom(body: unknown): string | null {
  if (typeof body === 'object' && body !== null) {
    const { message } = body as { message?: unknown };
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return null;
}

/**
 * Extract the API's per-field `errors` list from an error body.
 *
 * @param body - A parsed error body.
 * @returns The well-formed entries; empty when there are none.
 */
function validationFrom(body: unknown): ApiValidationEntry[] {
  if (typeof body !== 'object' || body === null) return [];
  const { errors } = body as { errors?: unknown };
  if (!Array.isArray(errors)) return [];

  return errors.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { field, message } = entry as { field?: unknown; message?: unknown };
    if (typeof message !== 'string') return [];
    return [typeof field === 'string' ? { field, message } : { message }];
  });
}

/**
 * Send one request and turn whatever happens into a result envelope.
 *
 * The base URL is read at call time from VITE_API_BASE_URL so tests and
 * environments can change it without reloading the module.
 *
 * @param path - Path below the API base URL, starting with "/".
 * @param init - Method, extra headers and body.
 * @returns The result envelope. The promise never rejects.
 */
async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    return { ok: false, status: null, data: null, error: MESSAGES.notConfigured };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    const body = await readJson(response);

    if (!response.ok) {
      const validation = validationFrom(body);
      return {
        ok: false,
        status: response.status,
        data: null,
        error: messageFrom(body) ?? MESSAGES.unavailable,
        // Only present when there is something to show, so a failure without
        // field messages keeps the plain envelope shape.
        ...(validation.length > 0 ? { validation } : {}),
      };
    }

    // A 2xx that is not the { message, data, pagination } envelope is not
    // something this client knows how to read.
    const envelope =
      typeof body === 'object' && body !== null && 'data' in body
        ? (body as { data: unknown; pagination?: unknown })
        : undefined;
    if (envelope === undefined) {
      return { ok: false, status: response.status, data: null, error: MESSAGES.unreadable };
    }

    return {
      ok: true,
      status: response.status,
      data: envelope.data as T,
      pagination: (envelope.pagination ?? null) as Pagination | null,
      error: null,
    };
  } catch {
    // Network failures and the timeout abort both land here; neither carries
    // an HTTP status, which is exactly what `status: null` reports.
    return { ok: false, status: null, data: null, error: MESSAGES.unreachable };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET a JSON resource from the API.
 *
 * @param path - Path below the API base URL, starting with "/", e.g. "/products".
 * @returns The result envelope. The promise never rejects.
 */
export async function apiGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: 'GET' });
}

/**
 * POST a JSON body to the API.
 *
 * @param path - Path below the API base URL, starting with "/", e.g. "/contact".
 * @param body - Value to send; serialised as JSON.
 * @returns The result envelope. The promise never rejects.
 */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
