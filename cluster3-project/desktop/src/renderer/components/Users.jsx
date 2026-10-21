/**
 * @file Admin Users screen.
 *
 * Built from the "Admin Users" desktop mockup: search, role filter, a sortable
 * and paged table, and per-row actions — edit, block or unblock, delete — plus
 * a form for new accounts. Everything goes through window.api, and the list is
 * loaded again after every successful change.
 *
 * The admin's own row cannot be blocked or deleted, which the API refuses too:
 * doing either would lock them out of the console.
 */

import { useState } from 'react';

import { fromUserRecord, isSessionExpired, toSaveResult, toUser } from '../lib/apiMapping.mjs';
import { formatDate } from '../lib/format.mjs';
import { PAGE_SIZE, paginate, sortRows } from '../lib/table.mjs';
import { ROLE_FILTERS, filterUsers, initialsOf } from '../lib/userTable.mjs';
import { ConfirmBar, LoadNotice, Outcome } from './dataParts.jsx';
import { Icon } from './Icon.jsx';
import {
  FilterChips,
  Header,
  Pager,
  SQUARE_BUTTON,
  SearchField,
  SortableHeader,
  nextSort,
} from './tableParts.jsx';
import { UserForm } from './UserForm.jsx';
import { useApiList } from './useApiList.js';

/** The role chips; for users the label doubles as the value. */
const ROLE_OPTIONS = ROLE_FILTERS.map((role) => ({ value: role, label: role }));

/**
 * Badge label and classes per account status, written out in full because
 * Tailwind's scanner cannot see a class name assembled from a variable.
 */
const STATUS_BADGE = {
  active: { label: 'Active', className: 'bg-lpa-success-soft text-lpa-success' },
  blocked: { label: 'Blocked', className: 'bg-lpa-negative-soft text-lpa-negative' },
  pending: { label: 'Pending', className: 'bg-lpa-track text-lpa-subtle' },
};

/** Lookup rows keep only what the selects show. */
const toOption = ({ id, name }) => ({ id, name });

/** The API's user field that the form calls something else. */
const USER_FIELD_RENAME = { name: 'firstName' };

/** Fields the user form shows, so an API message for any other field is not lost. */
const USER_FIELDS = Object.freeze([
  'firstName', 'lastName', 'email', 'password', 'roleId', 'genderId', 'documentTypeId', 'document', 'phone', 'address',
]);

/**
 * Render the Users screen.
 *
 * @param {object} props - Component props.
 * @param {number} props.currentAdminId - The signed-in administrator's id; their
 *   own row cannot be blocked or deleted.
 * @param {() => void} props.onExpired - Called when the session has expired.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Users({ currentAdminId, onExpired }) {
  const userList = useApiList(window.api.listUsers, toUser, onExpired);
  const roles = useApiList(window.api.listRoles, toOption, onExpired);
  const genders = useApiList(window.api.listGenders, toOption, onExpired);
  const documentTypes = useApiList(window.api.listDocumentTypes, toOption, onExpired);
  const users = userList.items;

  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  // {item: object|null} while the form is open; item null for a new account.
  const [form, setForm] = useState(null);
  // {user, busy, error} for the delete awaiting confirmation.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState('');
  // Ids whose block/unblock is in flight, so a double click sends one request.
  const [toggling, setToggling] = useState(() => new Set());

  const matching = filterUsers(users, { query, role });
  const shown = paginate(sortRows(matching, sort), page, PAGE_SIZE);

  /**
   * Handle a write's result: back to sign-in when expired, else report.
   *
   * @param {object} result - The write's envelope.
   * @param {string} done - The notice on success.
   * @returns {Promise<string|null>} Null on success, or the failure message.
   */
  async function settle(result, done) {
    if (isSessionExpired(result)) {
      onExpired();
      return null;
    }
    if (!result.ok || result.status < 200 || result.status >= 300) {
      return result.error ?? 'The change could not be saved.';
    }
    setNotice(done);
    await userList.reload();
    return null;
  }

  /**
   * Save the user form.
   *
   * @param {object} record - A record that passed lib/userRules.mjs.
   * @returns {Promise<{fieldErrors: Record<string, string>, error: string|null}|null>}
   *   What the API refused, or null once stored.
   */
  async function saveUser(record) {
    const editing = form.item;
    const body = fromUserRecord(record);
    const result = await (editing ? window.api.updateUser(editing.id, body) : window.api.createUser(body));
    if (isSessionExpired(result)) {
      onExpired();
      return null;
    }
    const refused = toSaveResult(result, USER_FIELD_RENAME, USER_FIELDS);
    if (refused) return refused;

    setForm(null);
    setNotice(`${record.firstName} ${record.lastName} was ${editing ? 'saved' : 'created'}.`);
    await userList.reload();
    return null;
  }

  /**
   * Block an active account, or unblock a blocked or pending one.
   *
   * @param {object} user - The account.
   * @returns {Promise<void>}
   */
  async function toggleBlock(user) {
    if (toggling.has(user.id)) return;
    setToggling((current) => new Set(current).add(user.id));
    setNotice('');
    const blocking = user.status === 'active';
    const result = await (blocking ? window.api.blockUser(user.id) : window.api.unblockUser(user.id));
    const failed = await settle(result, `${user.name} was ${blocking ? 'blocked' : 'unblocked'}.`);
    if (failed) setNotice(failed);
    setToggling((current) => {
      const next = new Set(current);
      next.delete(user.id);
      return next;
    });
  }

  /**
   * Delete the account awaiting confirmation, keeping the bar open on failure.
   *
   * @returns {Promise<void>}
   */
  async function confirmDelete() {
    const { user } = pendingDelete;
    setPendingDelete((current) => ({ ...current, busy: true, error: null }));
    const failed = await settle(await window.api.deleteUser(user.id), `${user.name} was deleted.`);
    if (failed) setPendingDelete((current) => ({ ...current, busy: false, error: failed }));
    else setPendingDelete(null);
  }

  const lookupsReady = [roles, genders, documentTypes].every((list) => list.state === 'ready');
  const lookupFailure = [roles, genders, documentTypes].find((list) => list.state === 'error');

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
          disabled={!lookupsReady}
          title={lookupsReady ? undefined : 'Loading roles, genders and document types…'}
          onClick={() => {
            setNotice('');
            setPendingDelete(null);
            setForm({ item: null });
          }}
          className="rounded-[10px] bg-lpa-ink px-5 py-3 text-sm font-semibold text-white hover:bg-lpa-ink-hover disabled:cursor-wait disabled:opacity-70"
        >
          + Add user
        </button>
      </header>

      <LoadNotice state={userList.state} error={userList.error} onRetry={userList.reload} noun="users" />
      {lookupFailure && (
        <LoadNotice
          state="error"
          error={lookupFailure.error}
          onRetry={() => Promise.all([roles.reload(), genders.reload(), documentTypes.reload()])}
          noun="form options"
        />
      )}
      <Outcome message={notice} />

      {form && (
        <UserForm
          key={form.item?.id ?? 'new'}
          initial={form.item}
          lookups={{ roles: roles.items, genders: genders.items, documentTypes: documentTypes.items }}
          onSave={saveUser}
          onCancel={() => setForm(null)}
        />
      )}

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
        <ConfirmBar
          id="delete-user-title"
          confirmLabel="Delete"
          busy={Boolean(pendingDelete.busy)}
          error={pendingDelete.error ?? null}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          Delete <strong>{pendingDelete.user.name}</strong>? The account can no longer sign in, and it leaves this
          list.
        </ConfirmBar>
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
              // A pending account is not active yet, so its action is Unblock too.
              const isBlocked = user.status !== 'active';
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
                        disabled={!lookupsReady}
                        onClick={() => {
                          setNotice('');
                          setPendingDelete(null);
                          setForm({ item: user });
                        }}
                        aria-label={`Edit ${user.name}`}
                        title={`Edit ${user.name}`}
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="edit" size={13} className="text-lpa-ink" />
                      </button>
                      {/* Your own account is exempt: blocking or deleting it
                          would lock you out of the console. */}
                      <button
                        type="button"
                        disabled={isSelf || toggling.has(user.id)}
                        onClick={() => toggleBlock(user)}
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
                        onClick={() => {
                          setForm(null);
                          setPendingDelete({ user });
                        }}
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
