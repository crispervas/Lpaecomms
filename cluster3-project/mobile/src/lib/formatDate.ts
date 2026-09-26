/**
 * @file Calendar-date formatting for order history.
 */

const FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/**
 * Format a calendar date the way the mockups show it.
 *
 * @param isoDate - A date as "YYYY-MM-DD".
 * @returns The date as e.g. "Jul 12, 2026".
 * @throws {RangeError} If the input is not a valid date.
 */
export function formatDate(isoDate: string): string {
  // A bare ISO date parses as UTC midnight; formatting in UTC keeps it from
  // sliding to the previous day in time zones west of Greenwich.
  return FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}
