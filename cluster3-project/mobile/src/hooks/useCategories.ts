/**
 * @file Category list for the Catalog filter chips.
 *
 * Failure is deliberately silent: without categories the Catalog still works
 * under "All", so a broken category list must not block the page.
 */
import { useEffect, useState } from 'react';
import { fetchCategories, type CatalogCategory } from '../api/categories';

/**
 * Load the categories once on mount.
 *
 * @returns The categories; empty while loading or when the request failed.
 */
export function useCategories(): CatalogCategory[] {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    let current = true;
    fetchCategories().then((result) => {
      if (current && result.ok) setCategories(result.data);
    });
    return () => {
      current = false;
    };
  }, []);

  return categories;
}
