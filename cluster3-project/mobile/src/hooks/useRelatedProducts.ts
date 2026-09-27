/**
 * @file "You might also like" products for the product page.
 *
 * Reads the same category through GET /catalog. Failure is silent: related
 * products are an extra, so losing them costs the section, never the page.
 */
import { useEffect, useState } from 'react';
import { fetchCatalogPage, type CatalogProduct } from '../api/catalog';

/** How many related products the page shows. */
export const RELATED_COUNT = 4;

/**
 * Load products from the same category, without the one being viewed.
 *
 * @param categorySlug - The viewed product's category slug; empty for none.
 * @param excludeId - The viewed product's id.
 * @returns Up to {@link RELATED_COUNT} products; empty while loading or on failure.
 */
export function useRelatedProducts(categorySlug: string, excludeId: number): CatalogProduct[] {
  const [related, setRelated] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    setRelated([]);
    if (!categorySlug) return;

    let current = true;
    // One extra, because the viewed product may be among them.
    fetchCatalogPage({ category: categorySlug, page: 1, limit: RELATED_COUNT + 1 }).then((result) => {
      if (!current || !result.ok) return;
      setRelated(result.data.products.filter((product) => product.id !== excludeId).slice(0, RELATED_COUNT));
    });

    return () => {
      current = false;
    };
  }, [categorySlug, excludeId]);

  return related;
}
