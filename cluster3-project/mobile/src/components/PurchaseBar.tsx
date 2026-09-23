/**
 * @file Purchase bar pinned under the product page: quantity stepper and the
 * priced add-to-cart button.
 *
 * Every control is disabled, like the web product page: there is no cart yet,
 * and offering one would promise something the app cannot do. It comes alive
 * with the Cart view.
 */
import { IonFooter } from '@ionic/react';
import { formatPrice } from '../lib/formatPrice';
import './PurchaseBar.css';

/** Props for {@link PurchaseBar}. */
export interface PurchaseBarProps {
  /** Unit price, for the button label. */
  priceAud: number;
}

/**
 * Render the purchase bar.
 *
 * @param props - The unit price.
 * @returns The footer.
 */
export default function PurchaseBar({ priceAud }: PurchaseBarProps) {
  return (
    <IonFooter className="ion-no-border purchase-bar">
      <div className="purchase-bar__inner">
        <div className="purchase-bar__stepper">
          <button type="button" className="purchase-bar__step" aria-label="Decrease quantity" disabled>
            −
          </button>
          <span className="purchase-bar__quantity" aria-label="Quantity">
            1
          </span>
          <button type="button" className="purchase-bar__step" aria-label="Increase quantity" disabled>
            +
          </button>
        </div>
        <button type="button" className="purchase-bar__add" disabled>
          Add to cart — {formatPrice(priceAud)}
        </button>
      </div>
    </IonFooter>
  );
}
