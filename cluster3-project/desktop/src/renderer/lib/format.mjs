/**
 * @file Date and money formats used across the admin screens.
 *
 * Every screen formats through here so a date or a price reads the same
 * wherever it appears. Formats follow the desktop mockups.
 */

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

const WHOLE_MONEY_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const CENTS_MONEY_FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Format a calendar date the way the mockups show it.
 *
 * Read as UTC so the date never shifts with the machine's time zone.
 *
 * @param {string} isoDate - A date as "YYYY-MM-DD".
 * @returns {string} The date as "Jul 12, 2026".
 */
export function formatDate(isoDate) {
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * Format an amount the way the mockups show it.
 *
 * Whole amounts drop the cents, as every mockup price does; any other amount
 * shows both digits, so "$139.50" never reads as "$139.5" or rounds to "$140".
 *
 * @param {number} amount - Dollars.
 * @returns {string} The amount as "$1,149" or "$139.50".
 */
export function formatMoney(amount) {
  return (Number.isInteger(amount) ? WHOLE_MONEY_FORMAT : CENTS_MONEY_FORMAT).format(amount);
}
