/**
 * @file The sample account shown by the Account preview.
 *
 * Authentication and an orders API do not exist yet, so the Account tab
 * renders the mockup's person and order history, labelled as a preview.
 * Replace these with API calls once the endpoints exist; the page only
 * depends on the shapes below.
 */

/** The signed-in person. */
export interface AccountProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Where an order is in its journey. */
export type OrderStatus = 'delivered' | 'in-transit';

/** One past order, summarised by its main item. */
export interface OrderSummary {
  /** Stable key for the list. */
  id: string;
  /** Name of the main item. */
  title: string;
  /** Category of the main item, matching a name in data/categories. */
  category: string;
  /** Order date as "YYYY-MM-DD". */
  placedOn: string;
  status: OrderStatus;
}

/** The mockup's person. */
export const SAMPLE_PROFILE: AccountProfile = {
  firstName: 'Jordan',
  lastName: 'Kim',
  email: 'jordan.kim@email.com',
  phone: '+1 (415) 555-0148',
};

/** The mockup's order history, newest first. */
export const SAMPLE_ORDERS: OrderSummary[] = [
  { id: 'mo1', title: 'Aria 87 Mechanical', category: 'Keyboards', placedOn: '2026-07-12', status: 'delivered' },
  { id: 'mo2', title: 'Cadence Pro ANC', category: 'Headsets', placedOn: '2026-06-28', status: 'delivered' },
  { id: 'mo3', title: 'Nexus 12-in-1 Dock', category: 'Docks', placedOn: '2026-06-03', status: 'in-transit' },
];
