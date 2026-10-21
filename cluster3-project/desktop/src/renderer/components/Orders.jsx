/**
 * @file Admin Orders screen.
 *
 * Built from the "Admin Orders" desktop mockup: search, status filter, a
 * sortable and paged table, and per-row View, Update and Delete actions, all
 * through window.api. The status shown and filtered is the shipping
 * (fulfilment) status; payment status is the order's other axis and is edited
 * in the same panel.
 *
 * Orders are created by customers on the web and mobile stores, never here, so
 * the screen has no "new order" button. Money and lines are fixed once an
 * order exists; the panel edits only what the API lets change.
 *
 * The mockup draws no order detail or status form, so View and Update open one
 * panel above the table: View lands on its summary, Update on its first field.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { isSessionExpired, toOrder, toSaveResult } from '../lib/apiMapping.mjs';
import { formatDate, formatMoney } from '../lib/format.mjs';
import { ORDER_STATUSES, filterOrders } from '../lib/orderTable.mjs';
import { PAGE_SIZE, paginate, sortRows } from '../lib/table.mjs';
import { ConfirmBar, LoadNotice, Outcome } from './dataParts.jsx';
import { CONTROL, Field, borderClass } from './formParts.jsx';
import { Icon } from './Icon.jsx';
import { OrderStatusBadge, orderStatusLabel } from './OrderStatusBadge.jsx';
import {
  FilterChips,
  Header,
  Pager,
  SQUARE_BUTTON,
  SearchField,
  SortableHeader,
  nextSort,
} from './tableParts.jsx';
import { useApiList } from './useApiList.js';

/** Fields the order panel shows, so an API message for any other field is not lost. */
const ORDER_FIELDS = Object.freeze(['fulfillmentStatus', 'paymentStatus', 'reference', 'invoice']);

/** Payment statuses the API accepts, with their display names. */
const PAYMENT_STATUS_LABEL = Object.freeze({
  PENDING: 'Pending',
  SUCCESS: 'Paid',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
});

/** The status chips: every status plus "All". */
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) })),
];

/**
 * Render the order panel: a summary, and the fields an admin may change.
 *
 * @param {object} props - Component props.
 * @param {object} props.order - The order on show (lib/apiMapping.mjs toOrder shape).
 * @param {'view'|'status'} props.focus - Which part receives focus on open.
 * @param {(changes: object) => Promise<{fieldErrors: Record<string, string>,
 *   error: string|null}|null>} props.onSave - Stores the changed fields, in
 *   API names; resolves to null once stored.
 * @param {() => void} props.onClose - Called when the panel is dismissed.
 * @returns {JSX.Element} The panel.
 */
function OrderPanel({ order, focus, onSave, onClose }) {
  const id = useId();
  const [draft, setDraft] = useState({
    status: order.status,
    paymentStatus: order.paymentStatus,
    reference: order.reference,
    invoice: order.invoice,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const headingRef = useRef(null);
  const selectRef = useRef(null);

  // Land keyboard users where the action they chose continues.
  useEffect(() => {
    (focus === 'status' ? selectRef : headingRef).current?.focus();
  }, [focus, order.id]);

  // Only what changed is sent, so saving one field never rewrites the others.
  const changes = {};
  if (draft.status !== order.status) changes.fulfillmentStatus = draft.status.toUpperCase();
  if (draft.paymentStatus !== order.paymentStatus) changes.paymentStatus = draft.paymentStatus;
  if (draft.reference.trim() !== order.reference) changes.reference = draft.reference.trim() || null;
  if (draft.invoice.trim() !== order.invoice) changes.invoice = draft.invoice.trim() || null;
  const changed = Object.keys(changes).length > 0;

  /**
   * Store an edited field and clear its stale messages.
   *
   * @param {string} field - The field edited.
   * @param {string} value - Its new value.
   * @returns {void}
   */
  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFailure(null);
  }

  /**
   * Save the changed fields.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || !changed) return;
    if (draft.reference.trim().length > 100 || draft.invoice.trim().length > 100) {
      setErrors({
        reference: draft.reference.trim().length > 100 ? 'Please keep this to 100 characters or fewer.' : undefined,
        invoice: draft.invoice.trim().length > 100 ? 'Please keep this to 100 characters or fewer.' : undefined,
      });
      return;
    }
    setBusy(true);
    const result = await onSave(changes);
    if (result) {
      setBusy(false);
      setErrors(result.fieldErrors);
      setFailure(result.error);
    }
  }

  return (
    <section
      aria-labelledby="order-panel-title"
      className="mb-5 rounded-2xl border border-lpa-line bg-lpa-surface p-6"
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="order-panel-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-base font-semibold focus:outline-none"
        >
          Order {order.label}
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
        <dt className="text-lpa-subtle">Customer</dt>
        <dd>
          <span className="font-semibold">{order.customer}</span>
          {order.email && <span className="text-lpa-subtle"> · {order.email}</span>}
        </dd>
        <dt className="text-lpa-subtle">Date</dt>
        <dd>{formatDate(order.placedOn)}</dd>
        <dt className="text-lpa-subtle">Items</dt>
        <dd>
          <ul>
            {order.items.map((item, index) => (
              // Two lines can name the same product, so the index keeps keys unique.
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </dd>
        <dt className="text-lpa-subtle">Total</dt>
        <dd className="font-semibold">{formatMoney(order.total, { alwaysCents: true })}</dd>
        <dt className="text-lpa-subtle">Payment</dt>
        <dd>{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd>
      </dl>

      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-lpa-track pt-5">
        <Field id={`${id}-status`} label="Shipping status" error={errors.fulfillmentStatus}>
          {(describedBy) => (
            <select
              id={`${id}-status`}
              ref={selectRef}
              value={draft.status}
              onChange={(event) => update('status', event.target.value)}
              aria-describedby={describedBy}
              className={`${CONTROL} ${borderClass(errors.fulfillmentStatus)}`}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${id}-payment`} label="Payment status" error={errors.paymentStatus}>
          {(describedBy) => (
            <select
              id={`${id}-payment`}
              value={draft.paymentStatus}
              onChange={(event) => update('paymentStatus', event.target.value)}
              aria-describedby={describedBy}
              className={`${CONTROL} ${borderClass(errors.paymentStatus)}`}
            >
              {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${id}-reference`} label="Reference" hint="Optional; shown as the order number." error={errors.reference}>
          {(describedBy) => (
            <input
              id={`${id}-reference`}
              value={draft.reference}
              onChange={(event) => update('reference', event.target.value)}
              aria-invalid={Boolean(errors.reference)}
              aria-describedby={describedBy}
              className={`${CONTROL} ${borderClass(errors.reference)}`}
            />
          )}
        </Field>
        <Field id={`${id}-invoice`} label="Invoice" hint="Optional." error={errors.invoice}>
          {(describedBy) => (
            <input
              id={`${id}-invoice`}
              value={draft.invoice}
              onChange={(event) => update('invoice', event.target.value)}
              aria-invalid={Boolean(errors.invoice)}
              aria-describedby={describedBy}
              className={`${CONTROL} ${borderClass(errors.invoice)}`}
            />
          )}
        </Field>
        <div className="col-span-2 flex items-center justify-end gap-2">
          {/* Always mounted, so a screen reader announces a failure when it appears. */}
          <p role="alert" className="mr-auto text-[13px] font-semibold text-lpa-negative empty:hidden">
            {failure}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={!changed || busy}
            className="rounded-lg bg-lpa-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-lpa-ink-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lpa-ink"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

/**
 * Render the Orders screen.
 *
 * @param {object} props - Component props.
 * @param {() => void} props.onExpired - Called when the session has expired.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Orders({ onExpired }) {
  const orderList = useApiList(window.api.listOrders, toOrder, onExpired);
  const orders = orderList.items;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  // {order, busy, error} for the delete awaiting confirmation.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState('');

  const matching = filterOrders(orders, { query, status });
  const shown = paginate(sortRows(matching, sort), page, PAGE_SIZE);
  // Looked up by id so the panel shows the order as it is now, after a reload.
  const openOrder = open && orders.find((order) => order.id === open.id);

  /**
   * Store an order's changed fields, then close the panel and reload.
   *
   * @param {object} order - The order being edited.
   * @param {object} changes - Changed fields, in API names.
   * @returns {Promise<object|null>} What the API refused, or null once stored.
   */
  async function saveOrder(order, changes) {
    const result = await window.api.updateOrder(order.id, changes);
    if (isSessionExpired(result)) {
      onExpired();
      return null;
    }
    const refused = toSaveResult(result, {}, ORDER_FIELDS);
    if (refused) return refused;

    setOpen(null);
    setNotice(`Order ${order.label} was saved.`);
    await orderList.reload();
    return null;
  }

  /**
   * Delete the order awaiting confirmation, keeping the bar open on failure.
   *
   * @returns {Promise<void>}
   */
  async function confirmDelete() {
    const { order } = pendingDelete;
    setPendingDelete((current) => ({ ...current, busy: true, error: null }));
    const result = await window.api.deleteOrder(order.id);
    if (isSessionExpired(result)) {
      onExpired();
      return;
    }
    if (!result.ok || result.status !== 200) {
      setPendingDelete((current) => ({ ...current, busy: false, error: result.error ?? 'It could not be deleted.' }));
      return;
    }
    setPendingDelete(null);
    setNotice(`Order ${order.label} was deleted.`);
    await orderList.reload();
  }

  return (
    <>
      <header className="mb-7">
        <h1 className="mb-1 font-display text-[26px] font-bold">Orders</h1>
        <p className="text-sm text-lpa-subtle">
          {matching.length} {matching.length === 1 ? 'order' : 'orders'}
        </p>
      </header>

      <LoadNotice state={orderList.state} error={orderList.error} onRetry={orderList.reload} noun="orders" />
      <Outcome message={notice} />

      <div className="mb-5 flex items-center gap-3">
        <SearchField
          label="Search orders"
          placeholder="Search orders..."
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <FilterChips
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>

      {openOrder && (
        <OrderPanel
          // Remount per order so the status draft starts from that order.
          key={openOrder.id}
          order={openOrder}
          focus={open.focus}
          onSave={(changes) => saveOrder(openOrder, changes)}
          onClose={() => setOpen(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmBar
          id="delete-order-title"
          confirmLabel="Delete"
          busy={Boolean(pendingDelete.busy)}
          error={pendingDelete.error ?? null}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          Delete order <strong>{pendingDelete.order.label}</strong>? It leaves this list and the dashboard.
        </ConfirmBar>
      )}

      <section aria-label="Orders" className="overflow-hidden rounded-2xl border border-lpa-line bg-lpa-surface">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[13.2%]" />
            <col className="w-[15.8%]" />
            <col className="w-[13.2%]" />
            <col className="w-[21%]" />
            <col className="w-[10.5%]" />
            <col className="w-[13.2%]" />
            <col className="w-[13.1%]" />
          </colgroup>
          <thead className="border-b border-lpa-line bg-lpa-canvas">
            <tr>
              <SortableHeader
                label="Order ID"
                column="id"
                sort={sort}
                onSort={(column) => setSort((current) => nextSort(current, column))}
              />
              <Header>Customer</Header>
              <SortableHeader
                label="Date"
                column="placedOn"
                sort={sort}
                onSort={(column) => setSort((current) => nextSort(current, column))}
              />
              <Header>Items</Header>
              <Header>Total</Header>
              <Header>Status</Header>
              <Header alignRight>Actions</Header>
            </tr>
          </thead>
          <tbody>
            {shown.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-lpa-subtle">
                  No orders match your search.
                </td>
              </tr>
            )}
            {shown.items.map((order) => {
              const items = order.items.join(', ');
              return (
                <tr key={order.id} className="border-b border-lpa-track">
                  <td className="truncate whitespace-nowrap py-4 pl-3 first:pl-6 last:pr-6 font-semibold" title={order.label}>
                    {order.label}
                  </td>
                  <td className="truncate py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle">{order.customer}</td>
                  <td className="whitespace-nowrap py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle">{formatDate(order.placedOn)}</td>
                  {/* Long item lists are cut; the title and the View panel show all. */}
                  <td className="truncate py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle" title={items}>
                    {items}
                  </td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6 font-semibold">{formatMoney(order.total, { alwaysCents: true })}</td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingDelete(null);
                          setOpen({ id: order.id, focus: 'view' });
                        }}
                        aria-label={`View order ${order.label}`}
                        title="View"
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="eye" size={13} className="text-lpa-ink" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingDelete(null);
                          setOpen({ id: order.id, focus: 'status' });
                        }}
                        aria-label={`Update order ${order.label}`}
                        title="Update"
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="edit" size={13} className="text-lpa-accent" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(null);
                          setPendingDelete({ order });
                        }}
                        aria-label={`Delete order ${order.label}`}
                        title="Delete"
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
