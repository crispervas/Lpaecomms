/**
 * @file React state for the product catalogue.
 *
 * Turns the one-shot fetchProducts() call into the three states a view
 * renders (loading, ready, error) plus a retry action, so pages never deal
 * with promises or result envelopes directly.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchProducts, type Product } from '../api/products';

/** Lifecycle of the catalogue request. */
export type ProductsStatus = 'loading' | 'ready' | 'error';

/** What {@link useProducts} returns. */
export interface UseProductsResult {
  /** Current request state. */
  status: ProductsStatus;
  /** The products; empty unless status is "ready". */
  products: Product[];
  /** User-facing error message when status is "error", otherwise null. */
  error: string | null;
  /** Request the catalogue again. */
  retry: () => void;
}

type ProductsState = Omit<UseProductsResult, 'retry'>;

const LOADING: ProductsState = { status: 'loading', products: [], error: null };

/**
 * Load the product catalogue on mount.
 *
 * @returns The request state and a retry action.
 */
export function useProducts(): UseProductsResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProductsState>(LOADING);

  useEffect(() => {
    // A result that lands after unmount (or after a newer retry) must not
    // overwrite the state the view is currently showing.
    let current = true;
    setState(LOADING);

    fetchProducts().then((result) => {
      if (!current) return;
      setState(
        result.ok
          ? { status: 'ready', products: result.data, error: null }
          : { status: 'error', products: [], error: result.error },
      );
    });

    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
