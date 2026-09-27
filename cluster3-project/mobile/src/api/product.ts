/**
 * @file One product for the mobile product page.
 *
 * Wraps GET /products/:id (bruno/lpaecomms-web/products/get-product.bru).
 * The id comes from the URL, so it is checked before any request: a path
 * that cannot name a product is "not found" without asking the server.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';

/** A product as the detail page shows it. */
export interface ProductDetail {
  /** Feed identifier. */
  id: number;
  /** Display name. */
  name: string;
  /** Category name and slug; empty strings when the product has none. */
  category: { name: string; slug: string };
  /** Price, assumed AUD. */
  priceAud: number;
  /** Description; empty when the feed has none. */
  description: string;
  /** Every image URL, feed order; may be empty. */
  imageUrls: string[];
}

/** A plain positive integer: no sign, decimal point or exponent. */
const PLAIN_INTEGER = /^\d+$/;

/**
 * Read a product id from a URL segment.
 *
 * @param raw - The `:id` route parameter.
 * @returns The id, or null when the segment cannot name a product.
 */
export function parseProductId(raw: string | undefined): number | null {
  if (raw === undefined || !PLAIN_INTEGER.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

/**
 * Validate the API product row in a response's data.
 *
 * @param raw - The response's `data`.
 * @returns The typed product, or null when a required field is invalid.
 */
function parseProductDetail(raw: unknown): ProductDetail | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, price, description, category, img } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string') return null;
  if (typeof price !== 'number' || !Number.isFinite(price)) return null;

  const { name: categoryName, code: slug } =
    typeof category === 'object' && category !== null ? (category as Record<string, unknown>) : {};

  return {
    id,
    name,
    category: {
      name: typeof categoryName === 'string' ? categoryName : '',
      slug: typeof slug === 'string' ? slug : '',
    },
    priceAud: price,
    description: typeof description === 'string' ? description : '',
    imageUrls: Array.isArray(img) ? img.filter((url): url is string => typeof url === 'string') : [],
  };
}

/**
 * Fetch one product.
 *
 * @param id - A product id, already validated with {@link parseProductId}.
 * @returns The result envelope; a 404 means the product does not exist.
 */
export async function fetchProduct(id: number): Promise<ApiResult<ProductDetail>> {
  const result = await apiGet<unknown>(`/products/${id}`);
  if (!result.ok) return result;

  const product = parseProductDetail(result.data);
  if (product === null) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  return { ok: true, status: result.status, data: product, pagination: null, error: null };
}
