/**
 * @file Order status pill, shared by the Dashboard and the Orders screen.
 */

/**
 * Label and classes per order status, written out in full because Tailwind's
 * scanner cannot see a class name assembled from a variable.
 */
const ORDER_STATUS = {
  pending: { label: 'Pending', className: 'bg-lpa-warning-soft text-lpa-warning' },
  shipped: { label: 'Shipped', className: 'bg-lpa-tint text-lpa-accent' },
  delivered: { label: 'Delivered', className: 'bg-lpa-success-soft text-lpa-success' },
  cancelled: { label: 'Cancelled', className: 'bg-lpa-negative-soft text-lpa-negative' },
};

/**
 * Display name of an order status.
 *
 * @param {'pending'|'shipped'|'delivered'|'cancelled'} status - The status.
 * @returns {string} The label, e.g. "Pending".
 */
export function orderStatusLabel(status) {
  return ORDER_STATUS[status].label;
}

/**
 * Render an order's status as a coloured pill.
 *
 * @param {object} props - Component props.
 * @param {'pending'|'shipped'|'delivered'|'cancelled'} props.status - The status.
 * @returns {JSX.Element} The pill.
 */
export function OrderStatusBadge({ status }) {
  const { label, className } = ORDER_STATUS[status];
  return (
    <span className={`inline-block rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}
