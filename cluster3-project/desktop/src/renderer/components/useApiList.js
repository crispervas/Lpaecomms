/**
 * @file React hooks that load admin data through window.api.
 *
 * Every live screen loads the same way — a request on mount, a loading state,
 * an error with a retry, and a reload after each write — so the state machine
 * lives here once. An expired session is handed to `onExpired` instead of
 * being shown as an error, because the only way forward is signing in again.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { isSessionExpired } from '../lib/apiMapping.mjs';

/**
 * Load one API result and keep it current.
 *
 * @param {() => Promise<{ok: boolean, status: number|null, data: unknown,
 *   error: string|null}>} load - A window.api read function.
 * @param {(data: unknown) => unknown} transform - Turns the payload into what
 *   the screen shows.
 * @param {unknown} empty - The value before the first successful load.
 * @param {() => void} onExpired - Called when the session has expired.
 * @returns {{state: 'loading'|'ready'|'error', value: unknown,
 *   error: string|null, reload: () => Promise<void>}} The value and its state.
 */
export function useApiResult(load, transform, empty, onExpired) {
  const [state, setState] = useState('loading');
  const [value, setValue] = useState(empty);
  const [error, setError] = useState(null);
  // The latest callbacks, so `reload` stays stable for effects that use it.
  const latest = useRef({ load, transform, onExpired });
  latest.current = { load, transform, onExpired };

  const reload = useCallback(async () => {
    const result = await latest.current.load();
    if (isSessionExpired(result)) {
      latest.current.onExpired();
      return;
    }
    if (result.ok && result.status === 200 && result.data != null) {
      setValue(latest.current.transform(result.data));
      setError(null);
      setState('ready');
    } else {
      setError(result.error ?? 'The data could not be loaded.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, value, error, reload };
}

/** Shared empty list, so an unloaded list keeps one identity across renders. */
const NO_ITEMS = Object.freeze([]);

/**
 * Load a list and keep it current.
 *
 * @param {() => Promise<{ok: boolean, status: number|null, data: Array<object>|null,
 *   error: string|null}>} load - A window.api list function.
 * @param {(row: object) => object} map - Turns one API row into a screen item.
 * @param {() => void} onExpired - Called when the session has expired.
 * @returns {{state: 'loading'|'ready'|'error', items: Array<object>,
 *   error: string|null, reload: () => Promise<void>}} The list and its state.
 */
export function useApiList(load, map, onExpired) {
  const { value, ...rest } = useApiResult(load, (rows) => rows.map(map), NO_ITEMS, onExpired);
  return { items: value, ...rest };
}
