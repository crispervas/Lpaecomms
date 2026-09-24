/**
 * @file Cart totals. Shipping is not charged yet: it is worked out by the
 * checkout, which does not exist, so the total is an estimate before shipping.
 */
import { formatPrice } from '../lib/formatPrice';
import './CartSummary.css';

/** Props for {@link CartSummary}. */
export interface CartSummaryProps {
  /** Sum of the cart lines. */
  subtotalAud: number;
}

/**
 * Render the totals.
 *
 * @param props - The subtotal.
 * @returns The summary.
 */
export default function CartSummary({ subtotalAud }: CartSummaryProps) {
  return (
    <dl className="cart-summary">
      <div className="cart-summary__row">
        <dt>Subtotal</dt>
        <dd>{formatPrice(subtotalAud)}</dd>
      </div>
      <div className="cart-summary__row">
        <dt>Shipping</dt>
        <dd>Calculated at checkout</dd>
      </div>
      <div className="cart-summary__row cart-summary__row--total">
        <dt>Estimated total</dt>
        <dd>{formatPrice(subtotalAud)}</dd>
      </div>
    </dl>
  );
}
