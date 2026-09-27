/**
 * @file Sample content shown by the Settings preview.
 *
 * No settings, shipping, admin-role, template or activity endpoints exist yet,
 * so every Settings tab except the live REST API row of System status reads
 * the desktop mockup's content from here. Replace these with calls through
 * window.api once the database is connected; the screen only depends on the
 * shapes below.
 */

/**
 * The store's public details.
 *
 * @type {Readonly<{name: string, email: string, phone: string}>}
 */
export const SAMPLE_STORE_INFO = Object.freeze({
  name: 'LPA Ecomms',
  email: 'support@lpaecomms.com',
  phone: '+1 (415) 555-0148',
});

/**
 * Delivery methods offered at checkout, cheapest first. Prices are dollars.
 *
 * @type {ReadonlyArray<Readonly<{id: string, name: string, eta: string, price: number}>>}
 */
export const SAMPLE_SHIPPING_OPTIONS = Object.freeze(
  [
    { id: 'ship-standard', name: 'Standard', eta: '5-7 business days', price: 6 },
    { id: 'ship-express', name: 'Express', eta: '2-3 business days', price: 14 },
    { id: 'ship-overnight', name: 'Overnight', eta: '1 business day', price: 28 },
  ].map((option) => Object.freeze(option)),
);

/**
 * People with access to this console and what they do. Sam and Rina are the
 * Admin accounts in ./users.mjs; Kwame joined after that list was drawn.
 *
 * @type {ReadonlyArray<Readonly<{name: string, email: string, role: string}>>}
 */
export const SAMPLE_ADMIN_TEAM = Object.freeze(
  [
    { name: 'Sam Ortiz', email: 'sam.ortiz@lpaecomms.com', role: 'Owner' },
    { name: 'Rina Alvarez', email: 'rina.alvarez@lpaecomms.com', role: 'Engineering' },
    { name: 'Kwame Osei', email: 'kwame.osei@lpaecomms.com', role: 'Support' },
  ].map((admin) => Object.freeze(admin)),
);

/**
 * Transactional emails the store sends.
 *
 * @type {ReadonlyArray<Readonly<{id: string, name: string, description: string}>>}
 */
export const SAMPLE_EMAIL_TEMPLATES = Object.freeze(
  [
    { id: 'tpl-order-confirmation', name: 'Order confirmation', description: 'Sent right after checkout' },
    { id: 'tpl-shipping-update', name: 'Shipping update', description: 'Sent when an order ships' },
    { id: 'tpl-password-reset', name: 'Password reset', description: 'Sent on forgot password' },
    { id: 'tpl-welcome', name: 'Welcome email', description: 'Sent on new account signup' },
  ].map((template) => Object.freeze(template)),
);

/**
 * Recent admin actions, newest first. `when` is display text copied from the
 * mockup; a real log would store timestamps and format them relative to now.
 *
 * @type {ReadonlyArray<Readonly<{id: string, text: string, when: string}>>}
 */
export const SAMPLE_ACTIVITY = Object.freeze(
  [
    { id: 'log-5', text: 'Sam Ortiz updated shipping rate for Express', when: 'Today, 1:42 PM' },
    { id: 'log-4', text: 'Rina Alvarez blocked user marcus.lee@email.com', when: 'Today, 11:05 AM' },
    { id: 'log-3', text: 'New product "Aria 87 Wireless" published', when: 'Yesterday, 4:18 PM' },
    { id: 'log-2', text: 'Kwame Osei invited as Support admin', when: 'Aug 2, 2026' },
    { id: 'log-1', text: 'Store contact email updated', when: 'Jul 30, 2026' },
  ].map((entry) => Object.freeze(entry)),
);

/**
 * Services other than the REST API, whose health this client cannot measure
 * yet. The REST API row is live and comes from the main process instead.
 *
 * @type {ReadonlyArray<Readonly<{name: string, state: 'operational'|'degraded'|'down'}>>}
 */
export const SAMPLE_SERVICES = Object.freeze(
  [
    { name: 'Storefront', state: 'operational' },
    { name: 'Payments gateway', state: 'operational' },
    { name: 'Email delivery', state: 'degraded' },
    { name: 'Search index', state: 'operational' },
  ].map((service) => Object.freeze(service)),
);
