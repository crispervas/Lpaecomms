/**
 * @file Catalog tab: every product, filterable by category, a page at a time.
 *
 * The active category lives in the URL (`/catalog?category=<slug>`) so a
 * filter can be linked to. Categories and products load independently: a
 * failed category list leaves "All" working.
 */
import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react';
import { useLocation, useNavigate } from 'react-router-dom';
import CategoryChips from '../components/CategoryChips';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import RetryNotice from '../components/RetryNotice';
import { CATALOG_PAGE_SIZE, useCatalog } from '../hooks/useCatalog';
import { useCategories } from '../hooks/useCategories';
import './Catalog.css';

/**
 * Render the results area for one category.
 *
 * @param props - The category slug, or null for every category.
 * @returns Skeletons, an error, an empty message, or the grid with its pager.
 */
function CatalogResults({ category }: { category: string | null }) {
  const { status, products, hasMore, error, loadingMore, loadMoreError, loadMore, retry } = useCatalog(category);

  if (status === 'loading') {
    return (
      <div className="catalog__grid">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return <RetryNotice message={error ?? ''} onRetry={retry} />;
  }

  if (products.length === 0) {
    return <p className="catalog__message">No products in this category.</p>;
  }

  return (
    <>
      <p className="catalog__count">
        Showing {products.length} {products.length === 1 ? 'product' : 'products'}
      </p>
      <div className="catalog__grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            category={product.category}
            to={`/catalog/product/${product.id}`}
          />
        ))}
      </div>
      {loadMoreError ? <p className="catalog__message catalog__message--spaced">{loadMoreError}</p> : null}
      {hasMore ? (
        <button type="button" className="catalog__more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Show more products'}
        </button>
      ) : null}
    </>
  );
}

/**
 * Render the Catalog tab.
 *
 * @returns The catalog page.
 */
export default function Catalog() {
  const location = useLocation();
  const navigate = useNavigate();
  const categories = useCategories();
  const onCatalog = location.pathname === '/catalog';
  const [category, setCategory] = useState<string | null>(null);

  // IonTabs keeps this page mounted while other tabs are shown, and the
  // location then belongs to those tabs. Reading the filter only while the
  // Catalog route is current keeps a chosen category across tab switches.
  useEffect(() => {
    if (onCatalog) setCategory(new URLSearchParams(location.search).get('category') || null);
  }, [onCatalog, location.search]);

  const select = (slug: string | null) => {
    navigate({ pathname: '/catalog', search: slug ? `?category=${encodeURIComponent(slug)}` : '' }, { replace: true });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="catalog__toolbar">
          <h1 className="catalog__title">All products</h1>
        </IonToolbar>
        <CategoryChips categories={categories} active={category} onSelect={select} />
      </IonHeader>
      <IonContent>
        <div className="catalog__body">
          <CatalogResults category={category} />
        </div>
      </IonContent>
    </IonPage>
  );
}
