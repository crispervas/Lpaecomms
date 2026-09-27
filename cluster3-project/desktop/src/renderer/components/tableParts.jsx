/**
 * @file Building blocks shared by the admin list screens.
 *
 * Users and Orders draw the same toolbar, sortable headers and pager in the
 * desktop mockups. Keeping one copy here means a fix to, say, the pager's
 * keyboard behaviour reaches both screens at once.
 */

import { Icon } from './Icon.jsx';

/** Classes for the small square buttons: row actions and pager arrows. */
export const SQUARE_BUTTON =
  'flex items-center justify-center rounded-lg border border-lpa-line bg-lpa-surface ' +
  'hover:bg-lpa-track disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lpa-surface';

/**
 * Pick a chip's or page button's classes, spelled out per branch because
 * Tailwind's scanner cannot see a class name assembled from a variable.
 *
 * @param {boolean} isSelected - Whether the control is the active one.
 * @returns {string} The control's colour classes.
 */
function selectableClass(isSelected) {
  return isSelected
    ? 'border-lpa-ink bg-lpa-ink text-white'
    : 'border-lpa-line bg-lpa-surface text-lpa-ink hover:bg-lpa-track';
}

/**
 * Render the note that marks a screen's data as sample data.
 *
 * The mockups have no such note; it keeps sample records from being mistaken
 * for real ones.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The note's text.
 * @returns {JSX.Element} The note.
 */
export function PreviewNote({ children }) {
  return (
    <p className="mb-5 rounded-[10px] bg-lpa-tint px-4 py-2.5 text-[13px] text-lpa-ink">{children}</p>
  );
}

/**
 * Render the toolbar's search box.
 *
 * @param {object} props - Component props.
 * @param {string} props.label - Accessible name, e.g. "Search users".
 * @param {string} props.placeholder - Placeholder text from the mockup.
 * @param {string} props.value - Current text.
 * @param {(value: string) => void} props.onChange - Called with the new text.
 * @returns {JSX.Element} The search field.
 */
export function SearchField({ label, placeholder, value, onChange }) {
  return (
    <label className="flex w-[280px] flex-none items-center gap-2 rounded-[10px] border border-lpa-control bg-lpa-surface px-4 py-[11px] focus-within:border-lpa-accent focus-within:ring-2 focus-within:ring-lpa-accent/40">
      <Icon name="search" size={15} className="text-lpa-subtle" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-lpa-ink placeholder:text-lpa-subtle focus:outline-none"
      />
    </label>
  );
}

/**
 * Render a row of mutually exclusive filter chips.
 *
 * @param {object} props - Component props.
 * @param {string} props.label - Accessible name of the group.
 * @param {ReadonlyArray<{value: string, label: string}>} props.options - Chips
 *   in display order.
 * @param {string} props.value - The selected option's value.
 * @param {(value: string) => void} props.onChange - Called with a chip's value.
 * @returns {JSX.Element} The chip group.
 */
export function FilterChips({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-4 py-2.5 text-[13px] font-semibold ${selectableClass(option.value === value)}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Render a column header that sorts the table when chosen.
 *
 * @param {object} props - Component props.
 * @param {string} props.label - Column name.
 * @param {string} props.column - The field this column sorts by.
 * @param {{key: string|null, direction: 'asc'|'desc'}} props.sort - Current sort.
 * @param {(column: string) => void} props.onSort - Called with `column`.
 * @returns {JSX.Element} The header cell.
 */
export function SortableHeader({ label, column, sort, onSort }) {
  const isSorted = sort.key === column;
  let ariaSort = 'none';
  // Unsorted columns keep the mockup's muted chevron; the sorted one darkens and
  // points up while ascending.
  let chevronClass = '';
  if (isSorted && sort.direction === 'asc') {
    ariaSort = 'ascending';
    chevronClass = 'rotate-180 text-lpa-ink';
  } else if (isSorted) {
    ariaSort = 'descending';
    chevronClass = 'text-lpa-ink';
  }

  return (
    <th scope="col" aria-sort={ariaSort} className="py-4 pl-3 first:pl-6 last:pr-6 text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-[5px] whitespace-nowrap text-xs font-semibold text-lpa-subtle hover:text-lpa-ink"
      >
        {label}
        <Icon name="chevronDown" size={11} strokeWidth={2.5} className={chevronClass} />
      </button>
    </th>
  );
}

/**
 * Render a plain column header in the mockups' style.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Column name.
 * @param {boolean} [props.alignRight=false] - Right-align, for Actions.
 * @returns {JSX.Element} The header cell.
 */
export function Header({ children, alignRight = false }) {
  return (
    <th
      scope="col"
      className={`py-4 pl-3 first:pl-6 last:pr-6 text-xs font-semibold text-lpa-subtle ${alignRight ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

/**
 * Next sort after a header is chosen: ascending first, then flip.
 *
 * @param {{key: string|null, direction: 'asc'|'desc'}} current - Current sort.
 * @param {string} column - The column chosen.
 * @returns {{key: string, direction: 'asc'|'desc'}} The new sort.
 */
export function nextSort(current, column) {
  if (current.key !== column) return { key: column, direction: 'asc' };
  return { key: column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/**
 * Render the range label and page buttons under a table.
 *
 * @param {object} props - Component props.
 * @param {{page: number, pageCount: number, from: number, to: number,
 *   total: number}} props.shown - The page on show, from paginate().
 * @param {(page: number) => void} props.onPage - Called with a page number.
 * @returns {JSX.Element} The pager.
 */
export function Pager({ shown, onPage }) {
  const pages = Array.from({ length: shown.pageCount }, (_, index) => index + 1);
  return (
    <nav aria-label="Pages" className="flex items-center justify-between px-6 py-4">
      <span className="text-[13px] text-lpa-subtle">
        Showing {shown.from}-{shown.to} of {shown.total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={shown.page === 1}
          onClick={() => onPage(shown.page - 1)}
          aria-label="Previous page"
          className={`h-[34px] w-[34px] ${SQUARE_BUTTON}`}
        >
          ‹
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onPage(number)}
            aria-current={number === shown.page ? 'page' : undefined}
            aria-label={`Page ${number}`}
            className={`h-[34px] w-[34px] rounded-lg border text-[13px] ${number === shown.page ? 'font-semibold' : ''} ${selectableClass(number === shown.page)}`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          disabled={shown.page === shown.pageCount}
          onClick={() => onPage(shown.page + 1)}
          aria-label="Next page"
          className={`h-[34px] w-[34px] ${SQUARE_BUTTON}`}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
