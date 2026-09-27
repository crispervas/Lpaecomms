/**
 * @file Product catalogue access for the mobile storefront.
 *
 * Wraps GET /products (documented in bruno/lpaecomms-web/products) and turns
 * the API's product rows into the shape the storefront displays. Each item is
 * validated: a malformed item is dropped rather than failing the whole list,
 * and a response whose data is not a list is a failure.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';

/** A product as the storefront displays it. */
export interface Product {
  /** Product id. */
  id: number;
  /** Display name. */
  name: string;
  /** Price in Australian dollars (the API's `price`). */
  priceAud: number;
  /** First image URL; empty string when the product has none. */
  imageUrl: string;
}

/**
 * Validate one API product row. Shared by every module that reads products.
 *
 * @param raw - An element of the response's data list.
 * @returns The display product, or null when a required field is missing or mistyped.
 */
export function parseProduct(raw: unknown): Product | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, price, img } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string') return null;
  if (typeof price !== 'number' || !Number.isFinite(price)) return null;

  const imageUrl = Array.isArray(img) && typeof img[0] === 'string' ? img[0] : '';
  return { id, name, priceAud: price, imageUrl };
}

/**
 * Fetch the first page of the product catalogue.
 *
 * @returns The result envelope holding the valid products, in API order.
 */
export async function fetchProducts(): Promise<ApiResult<Product[]>> {
  const result = await apiGet<unknown>('/products');
  if (!result.ok) return result;

  if (!Array.isArray(result.data)) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const products = result.data.map(parseProduct).filter((p): p is Product => p !== null);
  return { ok: true, status: result.status, data: products, pagination: result.pagination, error: null };
}
