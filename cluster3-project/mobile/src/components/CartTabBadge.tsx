/**
 * @file Unit count on the Cart tab. Hidden when the cart is empty.
 */
import { IonBadge } from '@ionic/react';
import { useCart } from '../context/cartContext';

/** Above this the badge reads "99+" so it keeps its size. */
const BADGE_LIMIT = 99;

/**
 * Render the cart badge.
 *
 * @returns The badge, or nothing for an empty cart.
 */
export default function CartTabBadge() {
  const { count } = useCart();
  if (count === 0) return null;

  return (
    <IonBadge className="cart-tab-badge" aria-label={`${count} ${count === 1 ? 'item' : 'items'} in cart`}>
      {count > BADGE_LIMIT ? `${BADGE_LIMIT}+` : count}
    </IonBadge>
  );
}
