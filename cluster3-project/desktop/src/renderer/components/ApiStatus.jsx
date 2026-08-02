/**
 * @file API status screen.
 *
 * Reports whether the REST API and its database are reachable. It reads the
 * result envelope the main process returns and never performs a request itself;
 * the renderer has no network access and does not know the API's address.
 */

import { useCallback, useEffect, useState } from 'react';

import { describeHealth } from '../lib/describeHealth.mjs';

/**
 * Render the API status panel with a retry control.
 *
 * @returns {JSX.Element} The status panel.
 */
export function ApiStatus() {
  const [envelope, setEnvelope] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await window.api.getHealth();
      setEnvelope(result);
    } catch {
      // The preload's envelope never rejects (see preload.js), but invoke()
      // itself can — e.g. window.api is undefined, or no handler is
      // registered on the other end. That is a different failure with the
      // same symptom, so it needs its own envelope rather than an unhandled
      // rejection that leaves the panel stuck on "Checking the API…" forever.
      setEnvelope({
        ok: false,
        status: null,
        data: null,
        error: 'The desktop bridge is unavailable.',
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Guard on the envelope alone, not on isChecking: effects run after the first
  // commit, so isChecking is still false on the initial render and a combined
  // condition would fall through to describeHealth(null) and throw.
  if (envelope === null) {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-6">
        <p className="text-slate-600">Checking the API…</p>
      </section>
    );
  }

  const { tone, title, detail } = describeHealth(envelope);

  return (
    <section className={`rounded-lg border p-6 ${tone}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{detail}</p>
      <button
        type="button"
        onClick={check}
        disabled={isChecking}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isChecking ? 'Checking…' : 'Check again'}
      </button>
    </section>
  );
}
