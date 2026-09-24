/**
 * @file Cart tab: the first step of the checkout mockup.
 *
 * Shipping and Payment need a signed-in user and a server-side order, which
 * do not exist yet, so the next step is shown but disabled with a note.
 */
import { IonButton, IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react';
import CartLine from '../components/CartLine';
import CartSummary from '../components/CartSummary';
import CheckoutSteps from '../components/CheckoutSteps';
import { useCart } from '../context/cartContext';
import './Cart.css';

/**
 * Render the Cart tab.
 *
 * @returns The cart page.
 */
export default function Cart() {
  const { items, subtotalAud, loaded, setQuantity, remove } = useCart();

  let body = null;
  if (loaded && items.length === 0) {
    body = (
      <div className="cart-page__empty">
        <p className="cart-page__empty-text">Your cart is empty.</p>
        <IonButton routerLink="/catalog" routerDirection="none" className="cart-page__browse">
          Browse the catalog
        </IonButton>
      </div>
    );
  } else if (loaded) {
    body = (
      <>
        <ul className="cart-page__lines">
          {items.map((item) => (
            <CartLine
              key={item.id}
              item={item}
              onQuantity={(quantity) => setQuantity(item.id, quantity)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </ul>
        <CartSummary subtotalAud={subtotalAud} />
        <div className="cart-page__actions">
          <button type="button" className="cart-page__next" disabled aria-describedby="cart-checkout-note">
            Continue to shipping
          </button>
          <p id="cart-checkout-note" className="cart-page__note">
            Checkout is coming soon.
          </p>
        </div>
      </>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="cart-page__toolbar">
          <h1 className="cart-page__title">Checkout</h1>
          <CheckoutSteps current={1} />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="cart-page">{body}</div>
      </IonContent>
    </IonPage>
  );
}
