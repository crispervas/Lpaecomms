/**
 * @file Product tile shared by the Home and Catalog grids.
 *
 * The tile links wherever its `to` prop says, or nowhere when it has none.
 * The cart button sits beside the tile body, not inside it, because a button
 * nested in a link is invalid and ambiguous to tap.
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
  /** Category label above the name; omitted when absent or empty. */
  category?: string;
  /** Route the tile opens; the tile is not a link when absent. */
  to?: string;
}

/**
 * Render one product tile.
 *
 * @param props - The product, its optional category label and link target.
 * @returns The tile.
 */
export default function ProductCard({ product, category, to }: ProductCardProps) {
  // The demo feed's image links are often dead; a failed load falls back to
  // the same placeholder block as a product with no image at all.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.imageUrl !== '' && !imageFailed;

  const body = (
    <>
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
      {category ? <span className="product-card__category">{category}</span> : null}
      <span className="product-card__name">{product.name}</span>
      <span className="product-card__price">{formatPrice(product.priceAud)}</span>
    </>
  );

  return (
    <article className="product-card">
      {to ? (
        <Link to={to} className="product-card__body">
          {body}
        </Link>
      ) : (
        <div className="product-card__body">{body}</div>
      )}
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
