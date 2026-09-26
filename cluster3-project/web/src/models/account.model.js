/**
 * @file Account model.
 *
 * Supplies the signed-in person and their order history to the Account page.
 *
 * **There is no user or order data behind this yet.** Authentication and an
 * orders table do not exist, so the model returns the mockup's sample account,
 * the same person the mobile Account preview shows. The methods are async and
 * return copies so the controller already depends on the shape a database-backed
 * model will have: replacing this file is the whole migration.
 */

/**
 * @typedef {Object} AccountProfile
 * @property {string} firstName - Given name.
 * @property {string} lastName - Family name.
 * @property {string} email - Contact and sign-in address.
 * @property {string} phone - Phone number as the person typed it.
 * @property {string} passwordChangedOn - Last password change as "YYYY-MM-DD".
 */

/**
 * @typedef {'delivered'|'in-transit'|'cancelled'} OrderStatus
 */

/**
 * @typedef {Object} OrderSummary
 * @property {string} number - Order number, e.g. "LPA-10248".
 * @property {string} title - Name of the order's main item.
 * @property {string} placedOn - Order date as "YYYY-MM-DD".
 * @property {OrderStatus} status - Where the order is in its journey.
 * @property {number} totalAud - Order total in Australian dollars.
 */

/** The mockup's person. */
const SAMPLE_PROFILE = {
  firstName: 'Jordan',
  lastName: 'Kim',
  email: 'jordan.kim@email.com',
  phone: '+1 (415) 555-0148',
  passwordChangedOn: '2026-06-26',
};

/** The mockup's order history, newest first. */
const SAMPLE_ORDERS = [
  { number: 'LPA-10248', title: 'Aria 87 Mechanical', placedOn: '2026-07-12', status: 'delivered', totalAud: 149 },
  { number: 'LPA-10201', title: 'Cadence Pro ANC', placedOn: '2026-06-28', status: 'delivered', totalAud: 189 },
  { number: 'LPA-10176', title: 'Nexus 12-in-1 Dock', placedOn: '2026-06-03', status: 'in-transit', totalAud: 99 },
  { number: 'LPA-10122', title: 'Glide X Wireless', placedOn: '2026-05-19', status: 'cancelled', totalAud: 79 },
];

/**
 * Read access to the current account.
 */
export class AccountModel {
  /**
   * Fetch the signed-in person's profile.
   *
   * @returns {Promise<AccountProfile>} A copy the caller may change freely.
   */
  async getProfile() {
    return { ...SAMPLE_PROFILE };
  }

  /**
   * Fetch the signed-in person's orders, newest first.
   *
   * @returns {Promise<OrderSummary[]>} Copies the caller may change freely.
   */
  async listOrders() {
    return SAMPLE_ORDERS.map((order) => ({ ...order }));
  }
}
