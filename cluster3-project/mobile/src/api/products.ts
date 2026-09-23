/**
 * @file Product catalogue access for the mobile storefront.
 *
 * Wraps GET /products (documented in bruno/lpaecomms-web/products) and turns
 * its body into typed products. The response comes from an external demo
 * feed, so each item is validated: a malformed item is dropped rather than
 * failing the whole list, and a body without a products array is a failure.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';

/** A product as the storefront displays it. */
export interface Product {
  /** Identifier from the catalogue feed. */
  id: number;
  /** Display name. */
  name: string;
  /** Price, assumed to be Australian dollars (see the Bruno docs). */
  priceAud: number;
  /** Image URL; empty string when the feed has none. */
  imageUrl: string;
}

/**
 * Validate one raw catalogue item. Shared by every module that reads products.
 *
 * @param raw - An element of the response's products array.
 * @returns The typed product, or null when a required field is missing or mistyped.
 */
export function parseProduct(raw: unknown): Product | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, priceAud, imageUrl } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string') return null;
  if (typeof priceAud !== 'number' || !Number.isFinite(priceAud)) return null;

  return { id, name, priceAud, imageUrl: typeof imageUrl === 'string' ? imageUrl : '' };
}

/**
 * Fetch the product catalogue.
 *
 * @returns The result envelope holding the valid products, in API order.
 */
export async function fetchProducts(): Promise<ApiResult<Product[]>> {
  const result = await apiGet<unknown>('/products');
  if (!result.ok) return result;

  const list =
    typeof result.data === 'object' && result.data !== null
      ? (result.data as { products?: unknown }).products
      : undefined;

  if (!Array.isArray(list)) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const products = list.map(parseProduct).filter((p): p is Product => p !== null);
  return { ok: true, status: result.status, data: products, error: null };
}
