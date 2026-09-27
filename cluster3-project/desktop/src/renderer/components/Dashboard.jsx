/**
 * @file Admin Dashboard screen.
 *
 * Built from the "Admin Dashboard" desktop mockup: headline figures, the most
 * recent orders and products per category. It is a preview — the API has no
 * users, orders or statistics endpoints yet — so it renders the sample figures
 * in data/dashboard.mjs and says so on screen. Its recent orders are the
 * newest of the orders App holds, so a status changed on the Orders screen
 * shows here too.
 */

import { useEffect, useState } from 'react';

import { SAMPLE_CATEGORIES, SAMPLE_KPIS } from '../data/dashboard.mjs';
import { barWidths } from '../lib/barWidths.mjs';
import { formatMoney } from '../lib/format.mjs';
import { recentOrders } from '../lib/orderTable.mjs';
import { OrderStatusBadge } from './OrderStatusBadge.jsx';
import { PreviewNote } from './tableParts.jsx';

/** "Aug 5, 2026, 2:40 PM", the mockup's timestamp format. */
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

/** How many orders the "Recent orders" panel lists. */
const RECENT_ORDER_COUNT = 5;

/**
 * Trend colour per KPI direction, written out in full because Tailwind's
 * scanner cannot see a class name assembled from a variable.
 */
const TREND_CLASS = {
  up: 'text-lpa-success',
  down: 'text-lpa-negative',
};

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
 * @param {ReadonlyArray<{id: string, customer: string, placedOn: string,
 *   total: number, status: string}>} props.orders - Every order.
 * @param {(section: string) => void} props.onNavigate - Opens another section;
 *   "View all →" uses it to reach Orders.
 * @returns {JSX.Element} The dashboard content, for placement in AdminLayout.
 */
export function Dashboard({ orders, onNavigate }) {
  const now = useNow();
  const widths = barWidths(SAMPLE_CATEGORIES);

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

      <PreviewNote>Preview — these figures are sample data until the admin API exists.</PreviewNote>

      <ul className="mb-7 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {SAMPLE_KPIS.map((kpi) => (
          <li key={kpi.label} className="rounded-2xl border border-lpa-line bg-lpa-surface p-[22px]">
            <span className="mb-2.5 block text-[13px] text-lpa-subtle">{kpi.label}</span>
            <span className="mb-2 block font-display text-[28px] font-bold">
              {NUMBER_FORMAT.format(kpi.value)}
            </span>
            <span className={`text-xs font-semibold ${TREND_CLASS[kpi.trend]}`}>{kpi.delta}</span>
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
              {recentOrders(orders, RECENT_ORDER_COUNT).map((order) => (
                <tr key={order.id} className="border-b border-lpa-track">
                  <td className="py-3.5 font-semibold">{order.id}</td>
                  <td className="truncate py-3.5 text-lpa-subtle">{order.customer}</td>
                  <td className="py-3.5 font-semibold">{formatMoney(order.total)}</td>
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
          <ul className="flex flex-col gap-4">
            {SAMPLE_CATEGORIES.map((category, index) => (
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
