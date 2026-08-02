/**
 * @file API status screen.
 *
 * Reports whether the REST API and its database are reachable. It reads the
 * result envelope the main process returns and never performs a request itself;
 * the renderer has no network access and does not know the API's address.
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Describe an envelope as something the user can act on.
 *
 * The 503 branch is the reason this function exists. A 503 from /health means
 * the API answered and is reporting that its database is down — a different
 * problem, with a different fix, from the API being unreachable. Collapsing
 * both into "connection error" would hide exactly what this screen is for.
 *
 * Tailwind class names are written out in full on every branch: the scanner
 * cannot see a class assembled from a variable, and those styles would be
 * stripped from the production build without any error.
 *
 * @param {{ok: boolean, status: number|null, data: object|null, error: string|null}} envelope
 *   Result envelope from the main process.
 * @returns {{tone: string, title: string, detail: string}} Presentation fields.
 */
function describe(envelope) {
  if (!envelope.ok) {
    return {
      tone: 'border-red-300 bg-red-50 text-red-900',
      title: 'API unreachable',
      detail: envelope.error,
    };
  }

  if (envelope.status === 200 && envelope.data?.db === 'connected') {
    return {
      tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      title: 'API healthy',
      detail: 'The API responded and its database is connected.',
    };
  }

  if (envelope.status === 503) {
    return {
      tone: 'border-amber-300 bg-amber-50 text-amber-900',
      title: 'Database unreachable',
      detail: 'The API is running but cannot reach its database.',
    };
  }

  return {
    tone: 'border-slate-300 bg-slate-100 text-slate-900',
    title: `Unexpected response (${envelope.status})`,
    detail: envelope.error ?? 'The API responded in a way this client does not recognise.',
  };
}

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
    const result = await window.api.getHealth();
    setEnvelope(result);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Guard on the envelope alone, not on isChecking: effects run after the first
  // commit, so isChecking is still false on the initial render and a combined
  // condition would fall through to describe(null) and throw.
  if (envelope === null) {
    return (
      <section className="rounded-lg border border-slate-300 bg-white p-6">
        <p className="text-slate-600">Checking the API…</p>
      </section>
    );
  }

  const { tone, title, detail } = describe(envelope);

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
