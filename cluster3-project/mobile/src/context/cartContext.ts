/**
 * @file The cart's React context and the hook that reads it.
 *
 * Kept apart from CartProvider.tsx so the component file exports only a
 * component (fast refresh needs that).
 */
import { createContext, useContext } from 'react';
import type { CartItem, CartProduct } from '../lib/cart';

/** Preferences key the cart is stored under. */
export const CART_STORAGE_KEY = 'lpa.cart';

/** What the cart offers to the app. */
export interface CartContextValue {
  /** Current lines. */
  items: CartItem[];
  /** Units across all lines. */
  count: number;
  /** Sum of the lines, rounded to the cent. */
  subtotalAud: number;
  /** Whether the stored cart has been read (or failed to be). */
  loaded: boolean;
  /** Add units of a product; merges into an existing line. */
  add: (product: CartProduct, quantity?: number) => void;
  /** Set a line's quantity (kept within 1–99). */
  setQuantity: (id: number, quantity: number) => void;
  /** Remove a line. */
  remove: (id: number) => void;
  /** Empty the cart. */
  clear: () => void;
}

/** The cart context; null outside a CartProvider. */
export const CartContext = createContext<CartContextValue | null>(null);

/**
 * Read the cart.
 *
 * @returns The cart state and actions.
 * @throws {Error} When used outside a CartProvider — a silent empty cart
 *   there would hide a wiring mistake.
 */
export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside a CartProvider.');
  return value;
}
