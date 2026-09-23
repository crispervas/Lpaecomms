/**
 * @file Placeholder page for tabs whose views are not built yet.
 *
 * Lets the tab shell navigate end to end today; each tab replaces it with
 * its real page in that view's own spec.
 */
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import './ComingSoonPage.css';

/** Props for {@link ComingSoonPage}. */
export interface ComingSoonPageProps {
  /** Page title shown in the toolbar and the body. */
  title: string;
}

/**
 * Render a titled "coming soon" page.
 *
 * @param props - The page title.
 * @returns The placeholder page.
 */
export default function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="coming-soon__toolbar-title">{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="coming-soon">
          <h1 className="coming-soon__title">{title}</h1>
          <p className="coming-soon__text">This section is coming soon.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
