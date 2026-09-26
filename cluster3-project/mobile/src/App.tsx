/**
 * @file Application shell for the mobile storefront.
 *
 * Wires Ionic's global CSS, the design tokens, and the bottom tab bar from
 * the mockups. Each tab owns its own navigation stack (IonTabs), so later
 * views plug in by replacing a tab's page rather than touching the shell.
 */
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { cartOutline, gridOutline, homeOutline, personOutline } from 'ionicons/icons';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Account from './pages/Account';
import About from './pages/About';
import ProductDetail from './pages/ProductDetail';
import CartProvider from './context/CartProvider';
import CartTabBadge from './components/CartTabBadge';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* No dark palette import: the mockups define a light theme only. */

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

/**
 * Root component: router, tab outlet and bottom tab bar.
 *
 * @returns The application.
 */
const App: React.FC = () => (
  <IonApp>
    <CartProvider>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/home" element={<Home />} />
            <Route path="/home/about" element={<About />} />
            <Route path="/home/product/:id" element={<ProductDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/account" element={<Account />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon aria-hidden="true" icon={homeOutline} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="catalog" href="/catalog">
              <IonIcon aria-hidden="true" icon={gridOutline} />
              <IonLabel>Catalog</IonLabel>
            </IonTabButton>
            <IonTabButton tab="cart" href="/cart">
              <IonIcon aria-hidden="true" icon={cartOutline} />
              <IonLabel>Cart</IonLabel>
              <CartTabBadge />
            </IonTabButton>
            <IonTabButton tab="login" href="/login">
              <IonIcon aria-hidden="true" icon={personOutline} />
              <IonLabel>Login</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </CartProvider>
  </IonApp>
);

export default App;
