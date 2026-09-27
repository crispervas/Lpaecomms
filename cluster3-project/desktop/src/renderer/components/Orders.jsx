/**
 * @file Admin Orders screen.
 *
 * Built from the "Admin Orders" desktop mockup: search, status filter, a
 * sortable and paged table, and per-row View and Update status actions. It is
 * a preview — the API has no orders endpoint yet — so it works on the
 * in-memory list App holds: a status change lasts for the rest of the session,
 * shows on the Dashboard too, and goes nowhere else.
 *
 * The mockup draws no order detail or status form, so both row actions open
 * one panel above the table: View lands on its summary, Update status on its
 * status picker.
 */

import { useEffect, useRef, useState } from 'react';

import { formatDate, formatMoney } from '../lib/format.mjs';
import { ORDER_STATUSES, filterOrders } from '../lib/orderTable.mjs';
import { PAGE_SIZE, paginate, sortRows } from '../lib/table.mjs';
import { Icon } from './Icon.jsx';
import { OrderStatusBadge, orderStatusLabel } from './OrderStatusBadge.jsx';
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

/** The status chips: every status plus "All". */
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: orderStatusLabel(status) })),
];

/**
 * Render the order panel: a summary and a status picker.
 *
 * @param {object} props - Component props.
 * @param {{id: string, customer: string, placedOn: string,
 *   items: ReadonlyArray<string>, total: number, status: string}} props.order -
 *   The order on show.
 * @param {'view'|'status'} props.focus - Which part receives focus on open.
 * @param {(status: string) => void} props.onSave - Called with a new status.
 * @param {() => void} props.onClose - Called when the panel is dismissed.
 * @returns {JSX.Element} The panel.
 */
function OrderPanel({ order, focus, onSave, onClose }) {
  const [draft, setDraft] = useState(order.status);
  const headingRef = useRef(null);
  const selectRef = useRef(null);

  // Land keyboard users where the action they chose continues.
  useEffect(() => {
    (focus === 'status' ? selectRef : headingRef).current?.focus();
  }, [focus, order.id]);

  /**
   * Save the chosen status.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    onSave(draft);
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
          Order {order.id}
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
        <dt className="text-lpa-subtle">Customer</dt>
        <dd className="font-semibold">{order.customer}</dd>
        <dt className="text-lpa-subtle">Date</dt>
        <dd>{formatDate(order.placedOn)}</dd>
        <dt className="text-lpa-subtle">Items</dt>
        <dd>
          <ul>
            {order.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </dd>
        <dt className="text-lpa-subtle">Total</dt>
        <dd className="font-semibold">{formatMoney(order.total)}</dd>
      </dl>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 border-t border-lpa-track pt-5">
        <label htmlFor="order-status" className="text-[13px] font-semibold">
          Status
        </label>
        <select
          id="order-status"
          ref={selectRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="rounded-lg border border-lpa-control bg-lpa-surface px-3 py-2 text-[13px] focus:border-lpa-accent focus:outline-none focus:ring-2 focus:ring-lpa-accent/40"
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {orderStatusLabel(status)}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={draft === order.status}
            className="rounded-lg bg-lpa-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-lpa-ink-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lpa-ink"
          >
            Save status
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
 * @param {ReadonlyArray<{id: string, customer: string, placedOn: string,
 *   items: ReadonlyArray<string>, total: number, status: string}>} props.orders
 *   - Every order.
 * @param {(id: string, status: string) => void} props.onUpdateStatus - Sets an
 *   order's status.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Orders({ orders, onUpdateStatus }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const matching = filterOrders(orders, { query, status });
  const shown = paginate(sortRows(matching, sort), page, PAGE_SIZE);
  // Looked up by id so the panel shows the order as it is now, after a save.
  const openOrder = open && orders.find((order) => order.id === open.id);

  return (
    <>
      <header className="mb-7">
        <h1 className="mb-1 font-display text-[26px] font-bold">Orders</h1>
        <p className="text-sm text-lpa-subtle">
          {matching.length} {matching.length === 1 ? 'order' : 'orders'}
        </p>
      </header>

      <PreviewNote>Preview — sample orders. Status changes last until you sign out.</PreviewNote>

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
          onSave={(next) => {
            onUpdateStatus(openOrder.id, next);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
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
                  <td className="whitespace-nowrap py-4 pl-3 first:pl-6 last:pr-6 font-semibold">{order.id}</td>
                  <td className="truncate py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle">{order.customer}</td>
                  <td className="whitespace-nowrap py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle">{formatDate(order.placedOn)}</td>
                  {/* Long item lists are cut; the title and the View panel show all. */}
                  <td className="truncate py-4 pl-3 first:pl-6 last:pr-6 text-lpa-subtle" title={items}>
                    {items}
                  </td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6 font-semibold">{formatMoney(order.total)}</td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-4 pl-3 first:pl-6 last:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen({ id: order.id, focus: 'view' })}
                        aria-label={`View order ${order.id}`}
                        title="View"
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="eye" size={13} className="text-lpa-ink" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen({ id: order.id, focus: 'status' })}
                        aria-label={`Update status of order ${order.id}`}
                        title="Update status"
                        className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                      >
                        <Icon name="edit" size={13} className="text-lpa-accent" />
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
