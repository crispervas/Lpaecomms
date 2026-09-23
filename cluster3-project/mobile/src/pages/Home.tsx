/**
 * @file Home tab: the storefront landing view from the mobile mockup.
 *
 * Sections, top to bottom: brand header, hero, category rail, trending
 * products, story banner. Only "Trending now" talks to the API; if that
 * request fails the section shows its own error and the rest of the page is
 * unaffected.
 */
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonToolbar } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import CategoryRail from '../components/CategoryRail';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import RetryNotice from '../components/RetryNotice';
import StoryCard from '../components/StoryCard';
import { useProducts } from '../hooks/useProducts';
import './Home.css';

/** The mockup's trending grid is two rows of two. */
const TRENDING_COUNT = 4;

/**
 * Render the "Trending now" grid for the current request state.
 *
 * @returns The grid, its skeleton, an empty message or an error with retry.
 */
function TrendingGrid() {
  const { status, products, error, retry } = useProducts();

  if (status === 'error') {
    return <RetryNotice message={error ?? ''} onRetry={retry} />;
  }

  if (status === 'ready' && products.length === 0) {
    return <p className="home__notice-text">No products yet.</p>;
  }

  return (
    <div className="home__grid">
      {status === 'loading'
        ? Array.from({ length: TRENDING_COUNT }, (_, i) => <ProductCardSkeleton key={i} />)
        : products.slice(0, TRENDING_COUNT).map((p) => <ProductCard key={p.id} product={p} to={`/home/product/${p.id}`} />)}
    </div>
  );
}

/**
 * Render the Home tab.
 *
 * @returns The home page.
 */
export default function Home() {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="home__toolbar">
          <span slot="start" className="home__brand">
            LPA
          </span>
          <IonButtons slot="end">
            {/* Search has no view yet; the catalog is where it will live. */}
            <IonButton routerLink="/catalog" className="home__icon-button" aria-label="Search">
              <IonIcon slot="icon-only" icon={searchOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <section className="home__hero">
          <img className="home__hero-image" src="/img/hero-product.png" alt="" />
          <span className="home__eyebrow">New Arrivals</span>
          <h1 className="home__headline">Peripherals engineered for focus.</h1>
          <IonButton routerLink="/catalog" className="home__cta">
            Shop trending
          </IonButton>
        </section>

        <section className="home__section home__section--bleed">
          <h2 className="home__heading home__heading--padded">Shop by category</h2>
          <CategoryRail />
        </section>

        <section className="home__section">
          <div className="home__section-head">
            <h2 className="home__heading">Trending now</h2>
            <Link to="/catalog" className="home__view-all">
              View all →
            </Link>
          </div>
          <TrendingGrid />
        </section>

        <section className="home__section">
          <StoryCard />
        </section>
      </IonContent>
    </IonPage>
  );
}
