/**
 * @file One cart line: image, name, line total, quantity stepper and remove.
 */
import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { MAX_QUANTITY, type CartItem } from '../lib/cart';
import { formatPrice } from '../lib/formatPrice';
import './CartLine.css';

/** Props for {@link CartLine}. */
export interface CartLineProps {
  /** The line. */
  item: CartItem;
  /** Called with the new quantity. */
  onQuantity: (quantity: number) => void;
  /** Called to take the line out of the cart. */
  onRemove: () => void;
}

/**
 * Render a cart line.
 *
 * @param props - The line and its actions.
 * @returns The list item.
 */
export default function CartLine({ item, onQuantity, onRemove }: CartLineProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <li className="cart-line">
      <div className="cart-line__media">
        {item.imageUrl && !imageFailed ? (
          <img className="cart-line__image" src={item.imageUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <div className="cart-line__placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="cart-line__info">
        <span className="cart-line__name">{item.name}</span>
        <span className="cart-line__total">{formatPrice(item.priceAud * item.quantity)}</span>
      </div>
      <div className="cart-line__stepper" role="group" aria-label={`Quantity of ${item.name}`}>
        <button
          type="button"
          className="cart-line__step"
          aria-label="Decrease quantity"
          disabled={item.quantity <= 1}
          onClick={() => onQuantity(item.quantity - 1)}
        >
          −
        </button>
        <span className="cart-line__quantity">{item.quantity}</span>
        <button
          type="button"
          className="cart-line__step"
          aria-label="Increase quantity"
          disabled={item.quantity >= MAX_QUANTITY}
          onClick={() => onQuantity(item.quantity + 1)}
        >
          +
        </button>
      </div>
      <button type="button" className="cart-line__remove" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        <IonIcon icon={trashOutline} aria-hidden="true" />
      </button>
    </li>
  );
}
