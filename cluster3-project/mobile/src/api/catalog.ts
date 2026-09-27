/**
 * @file Paged catalogue access for the mobile Catalog view.
 *
 * Wraps GET /products with `page`, `limit` and an optional `category` code
 * (bruno/lpaecomms-web/products): one page of products plus whether another
 * page exists, read from the API's pagination block. Items are validated with
 * the same rules as the Home products.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';
import { parseProduct, type Product } from './products';

/** A catalogue product, which also names its category. */
export interface CatalogProduct extends Product {
  /** Category name; empty string when the row carries none. */
  category: string;
}

/** One page of the catalogue. */
export interface CatalogPage {
  /** Valid products on this page. */
  products: CatalogProduct[];
  /** Whether a further page exists. */
  hasMore: boolean;
  /** The page the server returned (1-based). */
  page: number;
}

/** Which page to request. */
export interface CatalogQuery {
  /** Category code, or null for every category. */
  category: string | null;
  /** Page number, starting at 1. */
  page: number;
  /** Products per page. */
  limit: number;
}

/**
 * Build the request path for one catalogue page.
 *
 * @param query - Category, page and page size.
 * @returns The path below the API base URL.
 */
export function catalogPath({ category, page, limit }: CatalogQuery): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set('category', category);
  return `/products?${params.toString()}`;
}

/**
 * Validate one API product row as a catalogue product.
 *
 * @param raw - An element of the response's data list.
 * @returns The typed product, or null when a required field is invalid.
 */
function parseCatalogProduct(raw: unknown): CatalogProduct | null {
  const product = parseProduct(raw);
  if (product === null) return null;

  const { category } = raw as { category?: { name?: unknown } | null };
  return { ...product, category: typeof category?.name === 'string' ? category.name : '' };
}

/**
 * Fetch one page of the catalogue.
 *
 * @param query - Category, page and page size.
 * @returns The result envelope holding the page.
 */
export async function fetchCatalogPage(query: CatalogQuery): Promise<ApiResult<CatalogPage>> {
  const result = await apiGet<unknown>(catalogPath(query));
  if (!result.ok) return result;

  const { pagination } = result;
  if (!Array.isArray(result.data) || !pagination) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const products = result.data.map(parseCatalogProduct).filter((p): p is CatalogProduct => p !== null);

  return {
    ok: true,
    status: result.status,
    data: { products, hasMore: pagination.hasNextPage, page: pagination.page },
    pagination,
    error: null,
  };
}
