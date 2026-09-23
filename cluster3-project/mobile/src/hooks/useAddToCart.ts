/**
 * @file Add to cart with feedback.
 *
 * Every add confirms itself with a short toast offering "View cart", so the
 * user knows it worked without being taken away from what they were browsing.
 */
import { useCallback } from 'react';
import { useIonRouter, useIonToast } from '@ionic/react';
import { useCart } from '../context/cartContext';
import type { CartProduct } from '../lib/cart';

/**
 * Get an add-to-cart action.
 *
 * @returns A function adding `quantity` (default 1) units of a product.
 */
export function useAddToCart(): (product: CartProduct, quantity?: number) => void {
  const { add } = useCart();
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  return useCallback(
    (product: CartProduct, quantity = 1) => {
      add(product, quantity);
      presentToast({
        message: 'Added to cart',
        duration: 2000,
        // Top, so it never covers the purchase bar or the tab bar.
        position: 'top',
        buttons: [
          {
            text: 'View cart',
            // The cart is another tab: "none" switches tabs without a slide.
            handler: () => router.push('/cart', 'none', 'push'),
          },
        ],
      });
    },
    [add, presentToast, router],
  );
}
