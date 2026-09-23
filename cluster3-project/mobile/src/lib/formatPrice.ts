/**
 * @file Price formatting for the storefront.
 *
 * The API reports prices as plain numbers assumed to be Australian dollars.
 * The mockups show whole prices without cents ("$149"), so cents appear only
 * when the amount actually has them.
 */

const WHOLE = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const FRACTIONAL = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an AUD amount for display.
 *
 * @param amount - Price in Australian dollars.
 * @returns The price with a dollar sign, e.g. "$149" or "$19.50".
 */
export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? WHOLE.format(amount) : FRACTIONAL.format(amount);
}
