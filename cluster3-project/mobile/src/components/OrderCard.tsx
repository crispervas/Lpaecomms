/**
 * @file One row of the Account tab's order history: the main item, when it
 * was ordered, and where it is now.
 */
import { CATEGORIES } from '../data/categories';
import type { OrderStatus, OrderSummary } from '../data/account';
import { formatDate } from '../lib/formatDate';
import './OrderCard.css';

const STATUS_LABEL: Record<OrderStatus, string> = { delivered: 'Delivered', 'in-transit': 'In transit' };

/** Props for {@link OrderCard}. */
export interface OrderCardProps {
  order: OrderSummary;
}

/**
 * Render an order row. The thumbnail is the item's category glyph: orders
 * carry no product image until an orders API exists.
 *
 * @param props - The order to show.
 * @returns The list item.
 */
export default function OrderCard({ order }: OrderCardProps) {
  const glyph = CATEGORIES.find((category) => category.name === order.category)?.icon ?? null;

  return (
    <li className="order-card">
      <span className="order-card__thumb">{glyph}</span>
      <div className="order-card__body">
        <p className="order-card__title">{order.title}</p>
        <p className="order-card__date">
          <time dateTime={order.placedOn}>{formatDate(order.placedOn)}</time>
        </p>
      </div>
      <span className={`order-card__status order-card__status--${order.status}`}>{STATUS_LABEL[order.status]}</span>
    </li>
  );
}
