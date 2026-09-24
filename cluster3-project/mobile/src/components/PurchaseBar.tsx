/**
 * @file Purchase bar pinned under the product page: quantity stepper and the
 * add-to-cart button, whose label shows the price of the chosen quantity.
 */
import { useState } from 'react';
import { IonFooter } from '@ionic/react';
import { useAddToCart } from '../hooks/useAddToCart';
import { clampQuantity, MAX_QUANTITY, type CartProduct } from '../lib/cart';
import { formatPrice } from '../lib/formatPrice';
import './PurchaseBar.css';

/** Props for {@link PurchaseBar}. */
export interface PurchaseBarProps {
  /** The product being viewed, as a cart line snapshot. */
  product: CartProduct;
}

/**
 * Render the purchase bar. Keyed by product in the page, so the quantity
 * starts at 1 for each product.
 *
 * @param props - The product.
 * @returns The footer.
 */
export default function PurchaseBar({ product }: PurchaseBarProps) {
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();

  const step = (delta: number) => setQuantity((current) => clampQuantity(current + delta));

  return (
    <IonFooter className="ion-no-border purchase-bar">
      <div className="purchase-bar__inner">
        <div className="purchase-bar__stepper" role="group" aria-label="Quantity">
          <button
            type="button"
            className="purchase-bar__step"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => step(-1)}
          >
            −
          </button>
          <span className="purchase-bar__quantity" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="purchase-bar__step"
            aria-label="Increase quantity"
            disabled={quantity >= MAX_QUANTITY}
            onClick={() => step(1)}
          >
            +
          </button>
        </div>
        <button type="button" className="purchase-bar__add" onClick={() => addToCart(product, quantity)}>
          Add to cart — {formatPrice(product.priceAud * quantity)}
        </button>
      </div>
    </IonFooter>
  );
}
