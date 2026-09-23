/**
 * @file State for the product page.
 *
 * A 404 is its own state rather than an error: "this product does not exist"
 * gets a way back to the catalog, not a Retry that can never succeed.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchProduct, type ProductDetail } from '../api/product';

/** Lifecycle of the product request. */
export type ProductDetailStatus = 'loading' | 'ready' | 'notFound' | 'error';

/** What {@link useProductDetail} returns. */
export interface UseProductDetailResult {
  /** Request state. */
  status: ProductDetailStatus;
  /** The product once ready, otherwise null. */
  product: ProductDetail | null;
  /** Message when status is "error", otherwise null. */
  error: string | null;
  /** Request the product again. */
  retry: () => void;
}

type ProductState = Omit<UseProductDetailResult, 'retry'>;

const LOADING: ProductState = { status: 'loading', product: null, error: null };
const NOT_FOUND: ProductState = { status: 'notFound', product: null, error: null };

/**
 * Load one product.
 *
 * @param id - A validated product id, or null when the URL cannot name one.
 * @returns The request state and a retry action.
 */
export function useProductDetail(id: number | null): UseProductDetailResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProductState>(id === null ? NOT_FOUND : LOADING);

  useEffect(() => {
    if (id === null) {
      setState(NOT_FOUND);
      return;
    }

    // A response for a product the page no longer shows must not replace it.
    let current = true;
    setState(LOADING);

    fetchProduct(id).then((result) => {
      if (!current) return;
      if (result.ok) {
        setState({ status: 'ready', product: result.data, error: null });
      } else if (result.status === 404) {
        setState(NOT_FOUND);
      } else {
        setState({ status: 'error', product: null, error: result.error });
      }
    });

    return () => {
      current = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
