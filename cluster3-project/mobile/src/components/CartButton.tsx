/**
 * @file Round cart button for page headers, opening the Cart tab.
 *
 * The Cart is another tab, so it is opened with no direction: a forward push
 * from a product page would record /cart in that tab's own history, and
 * coming back to the tab would then leave its back button doing nothing.
 */
import { IonButton, IonIcon, useIonRouter } from '@ionic/react';
import { cartOutline } from 'ionicons/icons';

/**
 * Render the cart button.
 *
 * @returns The button.
 */
export default function CartButton() {
  const router = useIonRouter();

  return (
    <IonButton className="page-header__action" aria-label="Cart" onClick={() => router.push('/cart', 'none', 'push')}>
      <IonIcon slot="icon-only" icon={cartOutline} aria-hidden="true" />
    </IonButton>
  );
}
