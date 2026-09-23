/**
 * @file Product tile for the Home "Trending now" grid.
 *
 * The tile links to the Catalog tab until a product detail view exists. The
 * cart button sits beside the link, not inside it, because a button nested
 * in a link is invalid and ambiguous to tap.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/products';
import { formatPrice } from '../lib/formatPrice';
import './ProductCard.css';

/** Props for {@link ProductCard}. */
export interface ProductCardProps {
  /** The product to show. */
  product: Product;
}

/**
 * Render one product tile.
 *
 * @param props - The product.
 * @returns The tile.
 */
export default function ProductCard({ product }: ProductCardProps) {
  // The demo feed's image links are often dead; a failed load falls back to
  // the same placeholder block as a product with no image at all.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.imageUrl !== '' && !imageFailed;

  return (
    <article className="product-card">
      <Link to="/catalog" className="product-card__link">
        <div className="product-card__media">
          {showImage ? (
            <img
              className="product-card__image"
              src={product.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="product-card__placeholder" aria-hidden="true" />
          )}
        </div>
        <span className="product-card__name">{product.name}</span>
        <span className="product-card__price">{formatPrice(product.priceAud)}</span>
      </Link>
      {/* Inert until the cart exists; aria-disabled keeps it focusable and announced. */}
      <button type="button" className="product-card__cart" aria-label={`Add ${product.name} to cart`} aria-disabled="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6h15l-1.5 9h-12z" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
      </button>
    </article>
  );
}
