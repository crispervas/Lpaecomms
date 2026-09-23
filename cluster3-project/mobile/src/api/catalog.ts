/**
 * @file Paged catalogue access for the mobile Catalog view.
 *
 * Wraps GET /catalog (bruno/lpaecomms-web/catalog): one page of products,
 * optionally for one category, plus whether another page exists. Items are
 * validated with the same rules as the Home products.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';
import { parseProduct, type Product } from './products';

/** A catalogue product, which also names its category. */
export interface CatalogProduct extends Product {
  /** Category name; empty when the feed has none. */
  category: string;
}

/** One page of the catalogue. */
export interface CatalogPage {
  /** The page's valid products, in API order. */
  products: CatalogProduct[];
  /** Whether another page exists after this one. */
  hasMore: boolean;
}

/** Which page to request. */
export interface CatalogQuery {
  /** Category slug, or null for every category. */
  category: string | null;
  /** Products to skip. */
  offset: number;
  /** Page size. */
  limit: number;
}

/**
 * Build the request path for one catalogue page.
 *
 * @param query - Category, offset and page size.
 * @returns The path below the API base URL.
 */
export function catalogPath({ category, offset, limit }: CatalogQuery): string {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (category) params.set('category', category);
  return `/catalog?${params.toString()}`;
}

/**
 * Validate one raw catalogue item.
 *
 * @param raw - An element of the response's products array.
 * @returns The typed product, or null when a required field is invalid.
 */
function parseCatalogProduct(raw: unknown): CatalogProduct | null {
  const product = parseProduct(raw);
  if (product === null) return null;

  const { category } = raw as { category?: unknown };
  return { ...product, category: typeof category === 'string' ? category : '' };
}

/**
 * Fetch one page of the catalogue.
 *
 * @param query - Category, offset and page size.
 * @returns The result envelope holding the page.
 */
export async function fetchCatalogPage(query: CatalogQuery): Promise<ApiResult<CatalogPage>> {
  const result = await apiGet<unknown>(catalogPath(query));
  if (!result.ok) return result;

  const body =
    typeof result.data === 'object' && result.data !== null
      ? (result.data as { products?: unknown; hasMore?: unknown })
      : {};

  if (!Array.isArray(body.products) || typeof body.hasMore !== 'boolean') {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const products = body.products
    .map(parseCatalogProduct)
    .filter((p): p is CatalogProduct => p !== null);

  return { ok: true, status: result.status, data: { products, hasMore: body.hasMore }, error: null };
}
