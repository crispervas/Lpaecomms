/**
 * @file Owns the device cart: reads it from storage once, saves every change.
 *
 * Storage is @capacitor/preferences — native storage on iOS and Android,
 * localStorage in the browser — which survives WebView storage eviction.
 */
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { cartReducer, cartTotals, parseStoredCart, serialiseCart, type CartProduct } from '../lib/cart';
import { CART_STORAGE_KEY, CartContext, type CartContextValue } from './cartContext';

/**
 * Provide the cart to everything below it.
 *
 * @param props - The app subtree.
 * @returns The provider.
 */
export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    Preferences.get({ key: CART_STORAGE_KEY })
      .then(({ value }) => {
        if (current) dispatch({ type: 'hydrate', stored: parseStoredCart(value) });
      })
      .catch(() => {
        // Unreadable storage: start with an empty cart rather than fail the app.
      })
      .finally(() => {
        if (current) setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    // Saving before the stored cart is read would overwrite it with the
    // empty initial state.
    if (!loaded) return;
    Preferences.set({ key: CART_STORAGE_KEY, value: serialiseCart(items) }).catch(() => {
      // A failed save leaves the in-memory cart intact; the next change retries.
    });
  }, [items, loaded]);

  const add = useCallback((product: CartProduct, quantity = 1) => dispatch({ type: 'add', product, quantity }), []);
  const setQuantity = useCallback((id: number, quantity: number) => dispatch({ type: 'setQuantity', id, quantity }), []);
  const remove = useCallback((id: number) => dispatch({ type: 'remove', id }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<CartContextValue>(
    () => ({ items, ...cartTotals(items), loaded, add, setQuantity, remove, clear }),
    [items, loaded, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
