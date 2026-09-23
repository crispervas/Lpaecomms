/**
 * @file Header for pages pushed onto a tab's stack: a round back button, a
 * title, and an optional action on the right.
 */
import type { ReactNode } from 'react';
import { IonBackButton, IonButtons, IonHeader, IonToolbar } from '@ionic/react';
import './PageHeader.css';

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** Page title. */
  title: string;
  /** Where back goes when there is no history (e.g. a deep link). */
  backHref: string;
  /** Optional action on the right, e.g. a cart button. */
  end?: ReactNode;
  /** Centre the title between the two buttons, as on the product page. */
  centered?: boolean;
}

/**
 * Render the page header.
 *
 * @param props - Title, fallback back target, optional end action and alignment.
 * @returns The header.
 */
export default function PageHeader({ title, backHref, end, centered = false }: PageHeaderProps) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar className={centered ? 'page-header page-header--centered' : 'page-header'}>
        <IonButtons slot="start">
          <IonBackButton defaultHref={backHref} text="" className="page-header__back" />
        </IonButtons>
        <span className="page-header__title">{title}</span>
        {end ? <IonButtons slot="end">{end}</IonButtons> : null}
      </IonToolbar>
    </IonHeader>
  );
}
