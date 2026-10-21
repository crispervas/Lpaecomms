/**
 * @file Admin Dashboard screen.
 *
 * Built from the "Admin Dashboard" desktop mockup: headline figures, the most
 * recent orders and products per category, all live. The figures come from
 * GET /stats, counted by the database; the recent orders are the newest of
 * the full order list, the same list the Orders screen shows.
 *
 * The mockup's month-over-month deltas are gone — the database keeps no
 * history to compare against — and "Open tickets" became Revenue, since there
 * are no support tickets to count.
 */

import { useEffect, useState } from 'react';

import { toDashboard, toOrder } from '../lib/apiMapping.mjs';
import { barWidths } from '../lib/barWidths.mjs';
import { formatMoney } from '../lib/format.mjs';
import { recentOrders } from '../lib/orderTable.mjs';
import { LoadNotice } from './dataParts.jsx';
import { OrderStatusBadge } from './OrderStatusBadge.jsx';
import { useApiList, useApiResult } from './useApiList.js';

/** "Aug 5, 2026, 2:40 PM", the mockup's timestamp format. */
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** How many orders the "Recent orders" panel lists. */
const RECENT_ORDER_COUNT = 5;

/** What the figures show before the first load: dashes, not zeros. */
const NO_FIGURES = Object.freeze({
  kpis: ['Total users', 'Total orders', 'Products live', 'Revenue'].map((label) => ({ label, value: '—' })),
  categories: [],
});

/** How often the header clock is refreshed, in milliseconds. */
const CLOCK_INTERVAL_MS = 30_000;

/**
 * Track the current time, refreshed often enough for a minute-precision clock.
 *
 * @returns {Date} The time at the latest refresh.
 */
function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}

/**
 * Render a white panel with the mockups' border and radius.
 *
 * @param {object} props - Component props.
 * @param {string} [props.className] - Extra classes, e.g. padding.
 * @param {React.ReactNode} props.children - Panel content.
 * @returns {JSX.Element} The panel.
 */
function Panel({ className = '', children }) {
  return (
    <section className={`rounded-2xl border border-lpa-line bg-lpa-surface ${className}`}>
      {children}
    </section>
  );
}

/**
 * Render the Dashboard.
 *
 * @param {object} props - Component props.
 * @param {(section: string) => void} props.onNavigate - Opens another section;
 *   "View all →" uses it to reach Orders.
 * @param {() => void} props.onExpired - Called when the session has expired.
 * @returns {JSX.Element} The dashboard content, for placement in AdminLayout.
 */
export function Dashboard({ onNavigate, onExpired }) {
  const now = useNow();
  const stats = useApiResult(window.api.getStats, toDashboard, NO_FIGURES, onExpired);
  const orderList = useApiList(window.api.listOrders, toOrder, onExpired);
  const figures = stats.value;
  const widths = barWidths(figures.categories);
  const recent = recentOrders(orderList.items, RECENT_ORDER_COUNT);
  const failed = stats.state === 'error' ? stats : orderList;

  /**
   * Load the figures and the orders again.
   *
   * @returns {Promise<void>}
   */
  async function reloadAll() {
    await Promise.all([stats.reload(), orderList.reload()]);
  }

  return (
    <>
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[26px] font-bold">Dashboard</h1>
          <p className="text-sm text-lpa-subtle">Overview of your store right now.</p>
        </div>
        <time dateTime={now.toISOString()} className="text-[13px] text-lpa-subtle">
          {TIMESTAMP_FORMAT.format(now)}
        </time>
      </header>

      {failed.state === 'error' && (
        <LoadNotice state="error" error={failed.error} onRetry={reloadAll} noun="dashboard figures" />
      )}

      <ul className="mb-7 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {figures.kpis.map((kpi) => (
          <li key={kpi.label} className="rounded-2xl border border-lpa-line bg-lpa-surface p-[22px]">
            <span className="mb-2.5 block text-[13px] text-lpa-subtle">{kpi.label}</span>
            <span className="block font-display text-[28px] font-bold">{kpi.value}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="p-[26px]">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold">Recent orders</h2>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-[13px] font-semibold text-lpa-accent hover:text-lpa-accent-strong"
            >
              View all →
            </button>
          </div>

          <table className="w-full table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[25.6%]" />
              <col className="w-[30.8%]" />
              <col className="w-[25.6%]" />
              <col className="w-[20.5%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-lpa-line text-left text-[11px] uppercase tracking-[0.5px] text-lpa-subtle">
                <th scope="col" className="pb-2.5 font-semibold">Order</th>
                <th scope="col" className="pb-2.5 font-semibold">Customer</th>
                <th scope="col" className="pb-2.5 font-semibold">Total</th>
                <th scope="col" className="pb-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orderList.state === 'ready' && recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-lpa-subtle">
                    No orders yet.
                  </td>
                </tr>
              )}
              {recent.map((order) => (
                <tr key={order.id} className="border-b border-lpa-track">
                  <td className="truncate py-3.5 font-semibold">{order.label}</td>
                  <td className="truncate py-3.5 text-lpa-subtle">{order.customer}</td>
                  <td className="py-3.5 font-semibold">{formatMoney(order.total, { alwaysCents: true })}</td>
                  <td className="py-3.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="p-[26px]">
          <h2 className="mb-6 font-display text-base font-semibold">Products by category</h2>
          {stats.state === 'ready' && figures.categories.length === 0 && (
            <p className="text-[13px] text-lpa-subtle">No categories yet.</p>
          )}
          <ul className="flex flex-col gap-4">
            {figures.categories.map((category, index) => (
              <li key={category.name}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="font-medium">{category.name}</span>
                  <span className="text-lpa-subtle">{category.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-lpa-track" aria-hidden="true">
                  {/* A computed width cannot be a Tailwind class. React sets it
                      through the CSSOM, which the CSP's style-src 'self' allows,
                      unlike a style attribute written into the HTML. */}
                  <div className="h-full rounded bg-lpa-accent" style={{ width: `${widths[index]}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
