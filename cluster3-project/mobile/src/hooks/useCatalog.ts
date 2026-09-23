/**
 * @file Paged catalogue state for the Catalog view.
 *
 * Loads the first page for a category, appends further pages on demand, and
 * starts over when the category changes. Every request is tagged with the
 * generation it belongs to, so a slow response for an earlier category or
 * attempt can never overwrite what the view currently shows.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCatalogPage, type CatalogProduct } from '../api/catalog';

/** Products per page; the mockup's page size. */
export const CATALOG_PAGE_SIZE = 6;

/** Lifecycle of the first page. */
export type CatalogStatus = 'loading' | 'ready' | 'error';

/** What {@link useCatalog} returns. */
export interface UseCatalogResult {
  /** State of the first page. */
  status: CatalogStatus;
  /** Every product loaded so far, without repeats. */
  products: CatalogProduct[];
  /** Whether another page exists. */
  hasMore: boolean;
  /** Message when the first page failed, otherwise null. */
  error: string | null;
  /** Whether a further page is being requested. */
  loadingMore: boolean;
  /** Message when the last further page failed, otherwise null. */
  loadMoreError: string | null;
  /** Request the next page; ignored while one is in flight or none remains. */
  loadMore: () => void;
  /** Request the first page again. */
  retry: () => void;
}

interface CatalogState {
  status: CatalogStatus;
  products: CatalogProduct[];
  hasMore: boolean;
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  /**
   * Where the next page starts. Tracked apart from products.length because
   * repeated products are dropped, and the offset must still advance by what
   * the server actually returned.
   */
  nextOffset: number;
}

const INITIAL: CatalogState = {
  status: 'loading',
  products: [],
  hasMore: false,
  error: null,
  loadingMore: false,
  loadMoreError: null,
  nextOffset: 0,
};

/**
 * Append products whose id is not already shown.
 *
 * @param shown - Products already displayed.
 * @param incoming - A newly received page.
 * @returns The combined list; a repeated product keeps its first position.
 */
function appendUnique(shown: CatalogProduct[], incoming: CatalogProduct[]): CatalogProduct[] {
  const seen = new Set(shown.map((product) => product.id));
  return [...shown, ...incoming.filter((product) => !seen.has(product.id))];
}

/**
 * Page through the catalogue for one category.
 *
 * @param category - Category slug, or null for every category.
 * @returns The catalogue state and its actions.
 */
export function useCatalog(category: string | null): UseCatalogResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setRenderedState] = useState<CatalogState>(INITIAL);
  // Mirrors the latest state synchronously, so two taps before a re-render
  // see the first tap's loadingMore and only one request goes out.
  const stateRef = useRef(state);
  const generation = useRef(0);

  const setState = useCallback((next: CatalogState) => {
    stateRef.current = next;
    setRenderedState(next);
  }, []);

  useEffect(() => {
    const current = ++generation.current;
    setState(INITIAL);

    fetchCatalogPage({ category, offset: 0, limit: CATALOG_PAGE_SIZE }).then((result) => {
      if (current !== generation.current) return;
      setState(
        result.ok
          ? {
              ...INITIAL,
              status: 'ready',
              products: result.data.products,
              hasMore: result.data.hasMore,
              nextOffset: result.data.products.length,
            }
          : { ...INITIAL, status: 'error', error: result.error },
      );
    });

    return () => {
      generation.current += 1;
    };
  }, [category, attempt, setState]);

  const loadMore = useCallback(() => {
    const shown = stateRef.current;
    if (shown.status !== 'ready' || !shown.hasMore || shown.loadingMore) return;

    const current = generation.current;
    setState({ ...shown, loadingMore: true, loadMoreError: null });

    fetchCatalogPage({ category, offset: shown.nextOffset, limit: CATALOG_PAGE_SIZE }).then((result) => {
      if (current !== generation.current) return;
      const latest = stateRef.current;
      setState(
        result.ok
          ? {
              ...latest,
              loadingMore: false,
              products: appendUnique(latest.products, result.data.products),
              hasMore: result.data.hasMore,
              nextOffset: latest.nextOffset + result.data.products.length,
            }
          : { ...latest, loadingMore: false, loadMoreError: result.error },
      );
    });
  }, [category, setState]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    status: state.status,
    products: state.products,
    hasMore: state.hasMore,
    error: state.error,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError,
    loadMore,
    retry,
  };
}
