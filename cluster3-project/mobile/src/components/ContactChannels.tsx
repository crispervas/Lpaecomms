/**
 * @file "Get in touch" cards: email, phone and studio, each opening the app
 * that handles it. Details match the web contact page.
 */
import type { ReactNode } from 'react';
import { STUDIO } from '../data/studio';
import './ContactChannels.css';

interface Channel {
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
  external?: boolean;
}

/**
 * Wrap glyph paths in the shared 15px stroke SVG from the mockup.
 *
 * @param paths - The glyph's shapes.
 * @returns The SVG element.
 */
function glyph(paths: ReactNode): ReactNode {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {paths}
    </svg>
  );
}

const CHANNELS: Channel[] = [
  {
    label: 'Email support',
    value: 'support@lpaecomms.com',
    href: 'mailto:support@lpaecomms.com',
    icon: glyph(<><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></>),
  },
  {
    label: 'Phone',
    value: '+61 7 5500 0148',
    href: 'tel:+61755000148',
    icon: glyph(
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 3a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.2-1.3a2 2 0 012.1-.5c1 .3 2 .5 3 .7a2 2 0 011.7 2z" />,
    ),
  },
  {
    label: 'Studio · Open in Maps',
    value: STUDIO.address,
    href: STUDIO.mapsUrl,
    external: true,
    icon: glyph(<><path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>),
  },
];

/**
 * Render the contact channel cards.
 *
 * @returns The card list.
 */
export default function ContactChannels() {
  return (
    <ul className="contact-channels">
      {CHANNELS.map((channel) => (
        <li key={channel.label}>
          <a
            className="contact-channels__card"
            href={channel.href}
            {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <span className="contact-channels__icon">{channel.icon}</span>
            <span>
              <span className="contact-channels__label">{channel.label}</span>
              <span className="contact-channels__value">{channel.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
