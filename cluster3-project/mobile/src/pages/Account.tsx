/**
 * @file Account preview, pushed onto the Login tab by a valid sign-in.
 *
 * Follows Mobile Account in the mockups: the person's card, then a Profile /
 * Orders switch. Authentication and the profile and orders APIs do not exist
 * yet, so it shows the sample person from data/account and says so; signing
 * out just returns to the form.
 */
import { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import OrderCard from '../components/OrderCard';
import ProfileForm from '../components/ProfileForm';
import SegmentedTabs, { type SegmentedOption } from '../components/SegmentedTabs';
import { SAMPLE_ORDERS, SAMPLE_PROFILE } from '../data/account';
import { initials } from '../lib/profileRules';
import './Account.css';

type AccountView = 'profile' | 'orders';

const VIEWS: SegmentedOption<AccountView>[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'orders', label: 'Orders' },
];

/**
 * Render the Account preview.
 *
 * @returns The page.
 */
export default function Account() {
  const [view, setView] = useState<AccountView>('profile');
  const router = useIonRouter();
  const profile = SAMPLE_PROFILE;

  const signOut = () => {
    // Opened by a deep link there is no Login page underneath to pop back to.
    if (router.canGoBack()) router.goBack();
    else router.push('/login', 'back', 'replace');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="account__toolbar">
          <div className="account__heading">
            <h1 className="account__title">Account</h1>
            <button type="button" className="account__sign-out" onClick={signOut}>
              Sign out
            </button>
          </div>

          <div className="account__person">
            <span className="account__avatar" aria-hidden="true">
              {initials(profile.firstName, profile.lastName)}
            </span>
            <div className="account__identity">
              <p className="account__name">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="account__email">{profile.email}</p>
            </div>
          </div>

          <SegmentedTabs options={VIEWS} value={view} onChange={setView} label="Account sections" className="account__tabs" />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="account">
          <p className="account__preview">Sample account: sign-in is a preview until authentication exists.</p>

          {view === 'profile' ? (
            <ProfileForm initial={{ firstName: profile.firstName, email: profile.email, phone: profile.phone }} />
          ) : (
            <ul className="account__orders" aria-label="Orders">
              {SAMPLE_ORDERS.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
