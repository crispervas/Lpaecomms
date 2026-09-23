/**
 * @file Which tab a route belongs to.
 *
 * Product pages exist under both /home and /catalog so each tab keeps its own
 * navigation stack: opening a product from Catalog and pressing back returns
 * to the (still filtered) Catalog, not to Home.
 */

/** The tabs that can open a product. */
export type TabBase = '/home' | '/catalog';

/**
 * Find the tab a path belongs to.
 *
 * @param pathname - The current location's path.
 * @returns "/catalog" for the Catalog tab's routes, otherwise "/home".
 */
export function tabBase(pathname: string): TabBase {
  return pathname === '/catalog' || pathname.startsWith('/catalog/') ? '/catalog' : '/home';
}

/**
 * Build a product path inside the current tab.
 *
 * @param pathname - The current location's path.
 * @param id - The product to open.
 * @returns The product route within the same tab.
 */
export function productPath(pathname: string, id: number): string {
  return `${tabBase(pathname)}/product/${id}`;
}
