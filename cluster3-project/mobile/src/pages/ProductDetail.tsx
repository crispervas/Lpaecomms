/**
 * @file Product page, pushed onto the Home or Catalog tab's stack.
 *
 * Content follows the web product page, which drops what the feed does not
 * have (reviews, compare-at price, variants, specs). The purchase bar shows
 * only once the product is known, and adds to the device cart.
 */
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { cartOutline } from 'ionicons/icons';
import { Link, useLocation, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ProductGallery from '../components/ProductGallery';
import PurchaseBar from '../components/PurchaseBar';
import RelatedProducts from '../components/RelatedProducts';
import RetryNotice from '../components/RetryNotice';
import { parseProductId } from '../api/product';
import { useProductDetail } from '../hooks/useProductDetail';
import { cartProductFromDetail } from '../lib/cart';
import { formatPrice } from '../lib/formatPrice';
import { productPath, tabBase } from '../lib/tabBase';
import './ProductDetail.css';

/**
 * Render the product page.
 *
 * @returns The page.
 */
export default function ProductDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { status, product, error, retry } = useProductDetail(parseProductId(rawId));

  let body;
  if (status === 'loading') {
    body = (
      <div className="product-page__skeleton" aria-hidden="true">
        <div className="product-page__skeleton-media" />
        <span className="product-page__skeleton-bar" />
        <span className="product-page__skeleton-bar product-page__skeleton-bar--short" />
      </div>
    );
  } else if (status === 'notFound') {
    body = (
      <div className="product-page__missing">
        <p className="product-page__missing-text">This product is no longer available.</p>
        <Link to="/catalog" className="product-page__missing-link">
          Browse the catalog
        </Link>
      </div>
    );
  } else if (status === 'error' || !product) {
    body = <RetryNotice message={error ?? ''} onRetry={retry} />;
  } else {
    body = (
      <>
        <ProductGallery key={product.id} imageUrls={product.imageUrls} name={product.name} />
        {product.category.name ? <span className="product-page__badge">{product.category.name}</span> : null}
        <h1 className="product-page__name">{product.name}</h1>
        <p className="product-page__price">{formatPrice(product.priceAud)}</p>
        {product.description ? <p className="product-page__description">{product.description}</p> : null}
        <RelatedProducts
          categorySlug={product.category.slug}
          excludeId={product.id}
          linkTo={(id) => productPath(pathname, id)}
        />
      </>
    );
  }

  return (
    <IonPage>
      <PageHeader
        title="Product"
        backHref={tabBase(pathname)}
        centered
        end={
          <IonButton routerLink="/cart" className="page-header__action" aria-label="Cart">
            <IonIcon slot="icon-only" icon={cartOutline} />
          </IonButton>
        }
      />
      <IonContent>
        <div className="product-page">{body}</div>
      </IonContent>
      {status === 'ready' && product ? <PurchaseBar key={product.id} product={cartProductFromDetail(product)} /> : null}
    </IonPage>
  );
}
