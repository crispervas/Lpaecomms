/**
 * @file Building blocks for screens that read and write through the API.
 *
 * A load failure, a destructive-action confirmation and a write's outcome look
 * the same on every live screen; one copy keeps their wording, colours and
 * ARIA wiring consistent.
 */

import { useEffect, useRef } from 'react';

/** Classes for the small secondary buttons these parts use. */
const SECONDARY_BUTTON =
  'rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track';

/**
 * Render a list's loading or failed state, or nothing once it is ready.
 *
 * @param {object} props - Component props.
 * @param {'loading'|'ready'|'error'} props.state - The list's state.
 * @param {string|null} props.error - Why it failed.
 * @param {() => void} props.onRetry - Loads the list again.
 * @param {string} props.noun - What is loading, e.g. "products".
 * @returns {JSX.Element|null} The notice, or null.
 */
export function LoadNotice({ state, error, onRetry, noun }) {
  if (state === 'ready') return null;
  if (state === 'loading') {
    return (
      <p role="status" className="mb-5 text-[13px] text-lpa-subtle">
        Loading {noun}…
      </p>
    );
  }
  return (
    <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-[10px] border border-lpa-negative/30 bg-lpa-negative-soft px-4 py-3">
      <p className="text-[13px] text-lpa-ink">
        The {noun} could not be loaded. {error}
      </p>
      <button type="button" onClick={onRetry} className={`flex-none ${SECONDARY_BUTTON}`}>
        Retry
      </button>
    </div>
  );
}

/**
 * Render a confirmation bar for a destructive action.
 *
 * Stays open when the action fails, showing why, so the admin is never left
 * guessing whether the row went.
 *
 * @param {object} props - Component props.
 * @param {string} props.id - Id for the bar's text, which labels the dialog.
 * @param {React.ReactNode} props.children - The question, e.g. "Delete X?".
 * @param {string} props.confirmLabel - The destructive button's text.
 * @param {boolean} props.busy - True while the action runs.
 * @param {string|null} props.error - Why the last attempt failed.
 * @param {() => void} props.onConfirm - Runs the action.
 * @param {() => void} props.onCancel - Closes the bar.
 * @returns {JSX.Element} The bar.
 */
export function ConfirmBar({ id, children, confirmLabel, busy, error, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  // Move focus into the confirmation so a keyboard user lands on its buttons.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-labelledby={id}
      className="mb-5 rounded-[10px] border border-lpa-negative/30 bg-lpa-negative-soft px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <p id={id} className="text-[13px] text-lpa-ink">
          {children}
        </p>
        <div className="flex flex-none gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-lpa-negative px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-lpa-negative">{error}</p>}
    </div>
  );
}

/**
 * Render a live region announcing a write's outcome.
 *
 * @param {object} props - Component props.
 * @param {string} props.message - What happened; empty for nothing.
 * @returns {JSX.Element} The region, visually hidden while empty.
 */
export function Outcome({ message }) {
  return (
    <p role="status" className={message ? 'mb-5 text-[13px] font-semibold text-lpa-success' : 'sr-only'}>
      {message}
    </p>
  );
}
