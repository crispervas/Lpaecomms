/**
 * @file Admin Users screen.
 *
 * Built from the "Admin Users" desktop mockup: search, role filter, a sortable
 * and paged table, and per-row actions. It is a preview — the API has no users
 * endpoint yet — so it works on the in-memory list App holds: blocking and
 * deleting change that list for the rest of the session and nothing else.
 * Adding and editing stay disabled because no mockup defines their forms.
 */

import { useEffect, useRef, useState } from 'react';

import { formatDate } from '../lib/format.mjs';
import { PAGE_SIZE, paginate, sortRows } from '../lib/table.mjs';
import { ROLE_FILTERS, filterUsers, initialsOf } from '../lib/userTable.mjs';
import { Icon } from './Icon.jsx';
import {
  FilterChips,
  Header,
  Pager,
  PreviewNote,
  SQUARE_BUTTON,
  SearchField,
  SortableHeader,
  nextSort,
} from './tableParts.jsx';

/** The role chips; for users the label doubles as the value. */
const ROLE_OPTIONS = ROLE_FILTERS.map((role) => ({ value: role, label: role }));

/**
 * Badge label and classes per account status, written out in full because
 * Tailwind's scanner cannot see a class name assembled from a variable.
 */
const STATUS_BADGE = {
  active: { label: 'Active', className: 'bg-lpa-success-soft text-lpa-success' },
  blocked: { label: 'Blocked', className: 'bg-lpa-negative-soft text-lpa-negative' },
};

/**
 * Render the Users screen.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{id: string, name: string, email: string, role: string,
 *   status: 'active'|'blocked', signedUpOn: string}>} props.users - Every
 *   account.
 * @param {string} props.currentAdminId - The signed-in administrator's id; their
 *   own row cannot be blocked or deleted.
 * @param {(id: string) => void} props.onToggleBlock - Blocks an active account
 *   or unblocks a blocked one.
 * @param {(id: string) => void} props.onDelete - Removes an account.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Users({ users, currentAdminId, onToggleBlock, onDelete }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const cancelRef = useRef(null);

  const matching = filterUsers(users, { query, role });
  const shown = paginate(sortRows(matching, sort), page, PAGE_SIZE);

  // Move focus into the confirmation so a keyboard user lands on its buttons.
  useEffect(() => {
    if (pendingDelete) cancelRef.current?.focus();
  }, [pendingDelete]);

  /**
   * Delete the account awaiting confirmation.
   *
   * @returns {void}
   */
  function confirmDelete() {
    onDelete(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <>
      <header className="mb-7 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[26px] font-bold">Users</h1>
          <p className="text-sm text-lpa-subtle">
            {matching.length} {matching.length === 1 ? 'user' : 'users'}
          </p>
        </div>
        <button
          type="button"
          aria-disabled="true"
          title="Adding users is coming soon"
          className="cursor-not-allowed rounded-[10px] bg-lpa-ink px-5 py-3 text-sm font-semibold text-white"
        >
          + Add user
        </button>
      </header>

      <PreviewNote>
        Preview — sample accounts. Blocking and deleting last until you sign out.
      </PreviewNote>

      <div className="mb-5 flex items-center gap-3">
        <SearchField
          label="Search users"
          placeholder="Search users..."
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <FilterChips
          label="Filter by role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        />
      </div>

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-labelledby="delete-user-title"
          className="mb-5 flex items-center justify-between gap-4 rounded-[10px] border border-lpa-negative/30 bg-lpa-negative-soft px-4 py-3"
        >
          <p id="delete-user-title" className="text-[13px] text-lpa-ink">
            Delete <strong>{pendingDelete.name}</strong>? This removes the account from the list.
          </p>
          <div className="flex flex-none gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-lpa-negative px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <section aria-label="Users" className="overflow-hidden rounded-2xl border border-lpa-line bg-lpa-surface">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-1/3" />
            <col className="w-1/6" />
            <col className="w-1/6" />
            <col className="w-1/6" />
            <col className="w-1/6" />
          </colgroup>
          <thead className="border-b border-lpa-line bg-lpa-canvas">
            <tr>
              <SortableHeader label="Name / Email" column="name" sort={sort} onSort={(column) => setSort((current) => nextSort(current, column))} />
              <Header>Role</Header>
              <Header>Status</Header>
              <SortableHeader label="Signup date" column="signedUpOn" sort={sort} onSort={(column) => setSort((current) => nextSort(current, column))} />
              <Header alignRight>Actions</Header>
            </tr>
          </thead>
          <tbody>
            {shown.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-lpa-subtle">
                  No users match your search.
                </td>
              </tr>
            )}
            {shown.items.map((user) => {
              const badge = STATUS_BADGE[user.status];
              const isSelf = user.id === currentAdminId;
              const isBlocked = user.status === 'blocked';
              const blockLabel = `${isBlocked ? 'Unblock' : 'Block'} ${user.name}`;
              return (
                <tr key={user.id} className="border-b border-lpa-track">
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <div className="flex items-center gap-2.5">
                      <div
                        aria-hidden="true"
                        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-lpa-tint text-xs font-semibold text-lpa-accent"
                      >
                        {initialsOf(user.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{user.name}</div>
                        <div className="truncate text-xs text-lpa-subtle">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">{user.role}</td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <span className={`inline-block rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle">{formatDate(user.signedUpOn)}</td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        aria-disabled="true"
                        aria-label={`Edit ${user.name}`}
                        title="Editing is coming soon"
                        className={`h-[30px] w-[30px] cursor-not-allowed ${SQUARE_BUTTON}`}
                      >
                        <Icon name="edit" size={13} className="text-lpa-ink" />
                      </button>
                      {/* Your own account is exempt: blocking or deleting it
                          would lock you out of the console. */}
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => onToggleBlock(user.id)}
                        aria-label={blockLabel}
                        title={isSelf ? 'You cannot block your own account' : blockLabel}
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon
                          name={isBlocked ? 'unblock' : 'block'}
                          size={13}
                          className={isBlocked ? 'text-lpa-success' : 'text-lpa-warning'}
                        />
                      </button>
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setPendingDelete(user)}
                        aria-label={`Delete ${user.name}`}
                        title={isSelf ? 'You cannot delete your own account' : `Delete ${user.name}`}
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="trash" size={13} className="text-lpa-negative" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Pager shown={shown} onPage={setPage} />
      </section>
    </>
  );
}
