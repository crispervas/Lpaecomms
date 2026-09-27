/**
 * @file Product categories for the mobile storefront.
 *
 * Wraps GET /categories (bruno/lpaecomms-web/categories). The API's `code` is
 * the URL-safe identifier, exposed here as `slug`, the name the catalog's
 * `category` parameter already uses. Each category is validated: one missing a
 * field is dropped rather than failing the list.
 */
import { apiGet, MESSAGES, type ApiResult } from './client';

/** A category the catalog can filter by. */
export interface CatalogCategory {
  /** Category id. */
  id: number;
  /** Display name. */
  name: string;
  /** URL-safe identifier (the API's `code`); the value of the catalog's `category` parameter. */
  slug: string;
}

/** Enough to hold every category in one request; the store has a handful. */
const CATEGORY_LIMIT = 100;

/**
 * Validate one API category row.
 *
 * @param raw - An element of the response's data list.
 * @returns The typed category, or null when a field is missing or mistyped.
 */
function parseCategory(raw: unknown): CatalogCategory | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { id, name, code } = raw as Record<string, unknown>;
  if (typeof id !== 'number' || typeof name !== 'string' || typeof code !== 'string' || code === '') {
    return null;
  }

  return { id, name, slug: code };
}

/**
 * Fetch every category, alphabetically.
 *
 * @returns The result envelope holding the valid categories, in API order.
 */
export async function fetchCategories(): Promise<ApiResult<CatalogCategory[]>> {
  const result = await apiGet<unknown>(`/categories?limit=${CATEGORY_LIMIT}&sort=name&order=asc`);
  if (!result.ok) return result;

  if (!Array.isArray(result.data)) {
    return { ok: false, status: result.status, data: null, error: MESSAGES.unreadable };
  }

  const categories = result.data.map(parseCategory).filter((c): c is CatalogCategory => c !== null);
  return { ok: true, status: result.status, data: categories, pagination: result.pagination, error: null };
}
