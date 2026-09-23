/**
 * @file About & Contact page, reached from Home's "Our story" card.
 *
 * Copy follows the web's About and Contact pages, which deliberately depart
 * from the mockup: no team section (its people do not exist) and no invented
 * company history. It lives in the Home tab's stack, so the back button and
 * the Home tab both return to Home.
 */
import { IonContent, IonPage } from '@ionic/react';
import ContactChannels from '../components/ContactChannels';
import ContactForm from '../components/ContactForm';
import PageHeader from '../components/PageHeader';
import StudioMap from '../components/StudioMap';
import './About.css';

/**
 * Render the About & Contact page.
 *
 * @returns The page.
 */
export default function About() {
  return (
    <IonPage>
      <PageHeader title="About & Contact" backHref="/home" />
      <IonContent>
        <div className="about">
          <span className="about__eyebrow">Our mission</span>
          <h1 className="about__headline">The hardware between you and your work should get out of the way.</h1>
          <p className="about__story">
            Lpaecomms sells the peripherals people use all day: keyboards, mice, headsets, webcams, and the
            things around them. The whole catalogue is online, so you can browse it, compare, and decide
            without guessing.
          </p>
          <hr className="about__rule" />
          <h2 className="about__heading">Get in touch</h2>
          <ContactChannels />
          <StudioMap />
          <ContactForm />
        </div>
      </IonContent>
    </IonPage>
  );
}
