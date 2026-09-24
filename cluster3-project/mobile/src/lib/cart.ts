/**
 * @file The device cart as plain data.
 *
 * Every rule about what a cart may hold lives here as pure functions — the
 * quantity limits, merging repeated adds, totals, and reading back what was
 * stored — so React only wires them up and tests need no rendering.
 */
import type { ProductDetail } from '../api/product';

/** Most units of one product a cart line may hold. */
export const MAX_QUANTITY = 99;

/** One cart line: what the product looked like when added, and how many. */
export interface CartItem {
  /** Product id from the catalogue. */
  id: number;
  /** Name when last added. */
  name: string;
  /** Unit price when last added, assumed AUD. The future checkout re-prices on the server. */
  priceAud: number;
  /** Image URL; empty when there is none. */
  imageUrl: string;
  /** Units, 1 to {@link MAX_QUANTITY}. */
  quantity: number;
}

/** The product part of a line: everything but the quantity. */
export type CartProduct = Omit<CartItem, 'quantity'>;

/** Changes the cart accepts. */
export type CartAction =
  | { type: 'add'; product: CartProduct; quantity: number }
  | { type: 'setQuantity'; id: number; quantity: number }
  | { type: 'remove'; id: number }
  | { type: 'clear' }
  | { type: 'hydrate'; stored: CartItem[] };

/**
 * Keep a quantity within the allowed range.
 *
 * @param quantity - Any number, e.g. current quantity plus a step.
 * @returns A whole number from 1 to {@link MAX_QUANTITY}.
 */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

/**
 * Apply one change to the cart.
 *
 * @param items - Current lines.
 * @param action - The change.
 * @returns The new lines; the input is never mutated.
 */
export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const existing = items.find((item) => item.id === product.id);
      if (!existing) {
        return [...items, { ...product, quantity: clampQuantity(action.quantity) }];
      }
      // The latest name, price and image replace the old snapshot.
      return items.map((item) =>
        item.id === product.id ? { ...product, quantity: clampQuantity(item.quantity + action.quantity) } : item,
      );
    }
    case 'setQuantity':
      return items.map((item) => (item.id === action.id ? { ...item, quantity: clampQuantity(action.quantity) } : item));
    case 'remove':
      return items.filter((item) => item.id !== action.id);
    case 'clear':
      return [];
    case 'hydrate':
      // Lines added while the stored cart was still loading are replayed on
      // top of it, so an early tap is neither lost nor overwrites the store.
      return items.reduce(
        (merged, item) => cartReducer(merged, { type: 'add', product: item, quantity: item.quantity }),
        action.stored,
      );
  }
}

/** Unit count and subtotal of a cart. */
export interface CartTotals {
  /** Units across all lines. */
  count: number;
  /** Sum of unit price × quantity, rounded to the cent. */
  subtotalAud: number;
}

/**
 * Total a cart.
 *
 * Sums in whole cents so repeated float additions cannot drift.
 *
 * @param items - Cart lines.
 * @returns Units and subtotal.
 */
export function cartTotals(items: CartItem[]): CartTotals {
  let count = 0;
  let cents = 0;
  for (const item of items) {
    count += item.quantity;
    cents += Math.round(item.priceAud * 100) * item.quantity;
  }
  return { count, subtotalAud: cents / 100 };
}

/**
 * Validate one stored line.
 *
 * @param raw - An element of the stored array.
 * @returns The line, or null when it cannot be trusted.
 */
function toCartItem(raw: unknown): CartItem | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, priceAud, imageUrl, quantity } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string') return null;
  if (typeof priceAud !== 'number' || !Number.isFinite(priceAud) || priceAud < 0) return null;
  if (typeof quantity !== 'number') return null;

  return { id, name, priceAud, imageUrl: typeof imageUrl === 'string' ? imageUrl : '', quantity: clampQuantity(quantity) };
}

/**
 * Read a stored cart.
 *
 * Storage outlives app versions and can be damaged, so anything unreadable
 * yields an empty cart and bad lines are dropped rather than failing the app.
 *
 * @param raw - The stored string, or null when nothing was stored.
 * @returns The valid lines, duplicates merged.
 */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.reduce<CartItem[]>((items, entry) => {
    const line = toCartItem(entry);
    return line ? cartReducer(items, { type: 'add', product: line, quantity: line.quantity }) : items;
  }, []);
}

/**
 * Write a cart for storage.
 *
 * @param items - Cart lines.
 * @returns The string {@link parseStoredCart} reads back.
 */
export function serialiseCart(items: CartItem[]): string {
  return JSON.stringify(items);
}

/**
 * Take the cart snapshot of a product page's product.
 *
 * @param product - The product being viewed.
 * @returns Its cart line fields; the first image stands for the product.
 */
export function cartProductFromDetail(product: ProductDetail): CartProduct {
  return {
    id: product.id,
    name: product.name,
    priceAud: product.priceAud,
    imageUrl: product.imageUrls[0] ?? '',
  };
}
