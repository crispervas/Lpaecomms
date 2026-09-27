/**
 * @file Form building blocks shared by the admin screens' forms.
 *
 * The Catalog forms and Settings → Store info draw their fields the same way;
 * one copy keeps labels, hints, errors and their ARIA wiring consistent.
 */

/** Classes shared by every text field and select. */
export const CONTROL =
  'w-full rounded-[10px] border bg-lpa-surface px-3.5 py-2.5 text-[13px] text-lpa-ink placeholder:text-lpa-placeholder ' +
  'focus:border-lpa-accent focus:outline-none focus:ring-2 focus:ring-lpa-accent/40';

/**
 * Pick a control's border from its validation state, written out in full
 * because Tailwind's scanner cannot see a class assembled from a variable.
 *
 * @param {string|undefined} error - The field's message, if it failed.
 * @returns {string} The border colour class.
 */
export function borderClass(error) {
  return error ? 'border-lpa-danger' : 'border-lpa-control';
}

/**
 * Render a labelled control with its hint or error underneath.
 *
 * @param {object} props - Component props.
 * @param {string} props.id - The control's id.
 * @param {string} props.label - Visible label.
 * @param {string} [props.hint] - Help shown while the field is valid.
 * @param {string} [props.error] - Validation message; replaces the hint.
 * @param {string} [props.className] - Grid placement classes.
 * @param {(describedBy: string|undefined) => React.ReactNode} props.children -
 *   Renders the control, given the id it should name in aria-describedby.
 * @returns {JSX.Element} The field.
 */
export function Field({ id, label, hint, error, className = '', children }) {
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {children(noteId)}
      {note && (
        <p id={noteId} className={`mt-1.5 text-xs ${error ? 'text-lpa-danger' : 'text-lpa-subtle'}`}>
          {note}
        </p>
      )}
    </div>
  );
}
