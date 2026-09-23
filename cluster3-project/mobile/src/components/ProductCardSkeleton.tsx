/**
 * @file Loading stand-in for a ProductCard, sized identically so the grid
 * does not jump when the real products arrive.
 */
import './ProductCard.css';

/**
 * Render a product tile placeholder.
 *
 * @returns The skeleton tile.
 */
export default function ProductCardSkeleton() {
  return (
    <div className="product-card is-loading" aria-hidden="true">
      <div className="product-card__media product-card__placeholder" />
      <span className="product-card__bar" />
      <span className="product-card__bar product-card__bar--short" />
    </div>
  );
}
