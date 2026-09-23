/**
 * @file "You might also like": same-category products under the product
 * page. Renders nothing when there are none, so a heading never promises an
 * empty row.
 */
import { useRelatedProducts } from '../hooks/useRelatedProducts';
import ProductCard from './ProductCard';
import './RelatedProducts.css';

/** Props for {@link RelatedProducts}. */
export interface RelatedProductsProps {
  /** Category slug of the product being viewed; empty for none. */
  categorySlug: string;
  /** Id of the product being viewed. */
  excludeId: number;
  /** Builds the link for a related product, inside the current tab. */
  linkTo: (id: number) => string;
}

/**
 * Render the related products grid.
 *
 * @param props - Category, the product to leave out, and the link builder.
 * @returns The section, or nothing.
 */
export default function RelatedProducts({ categorySlug, excludeId, linkTo }: RelatedProductsProps) {
  const related = useRelatedProducts(categorySlug, excludeId);
  if (related.length === 0) return null;

  return (
    <section className="related-products">
      <h2 className="related-products__heading">You might also like</h2>
      <div className="related-products__grid">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} category={product.category} to={linkTo(product.id)} />
        ))}
      </div>
    </section>
  );
}
