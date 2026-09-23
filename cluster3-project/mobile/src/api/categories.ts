/**
 * @file Product categories for the mobile storefront.
 *
 * Wraps GET /categories (bruno/lpaecomms-web/categories). Each category is
 * validated: one missing a field is dropped rather than failing the list.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';

/** A category the catalog can filter by. */
export interface CatalogCategory {
  /** Feed identifier. */
  id: number;
  /** Display name. */
  name: string;
  /** URL-safe identifier; the value of the catalog's `category` parameter. */
  slug: string;
}

/**
 * Validate one raw category.
 *
 * @param raw - An element of the response's categories array.
 * @returns The typed category, or null when a field is missing or mistyped.
 */
function parseCategory(raw: unknown): CatalogCategory | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, slug } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string' || typeof slug !== 'string' || slug === '') {
    return null;
  }

  return { id, name, slug };
}

/**
 * Fetch the categories that currently hold products.
 *
 * @returns The result envelope holding the valid categories, in API order.
 */
export async function fetchCategories(): Promise<ApiResult<CatalogCategory[]>> {
  const result = await apiGet<unknown>('/categories');
  if (!result.ok) return result;

  const list =
    typeof result.data === 'object' && result.data !== null
      ? (result.data as { categories?: unknown }).categories
      : undefined;

  if (!Array.isArray(list)) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const categories = list.map(parseCategory).filter((c): c is CatalogCategory => c !== null);
  return { ok: true, status: result.status, data: categories, error: null };
}
