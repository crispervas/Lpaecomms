/**
 * @file Scales counts into bar widths for the Dashboard's category chart.
 *
 * Kept in .mjs so `node --test` can load it, like describeHealth.mjs.
 */

/**
 * Express each count as a percentage of the largest one.
 *
 * Scaling to the largest count, rather than to the total, makes the longest
 * bar fill its track: with six categories, shares of the total would all sit
 * in the left third and be hard to compare.
 *
 * @param {ReadonlyArray<{count: number}>} items - Items with non-negative counts.
 * @returns {number[]} One whole percentage (0–100) per item, in input order;
 *   all zeros when every count is zero.
 */
export function barWidths(items) {
  const largest = Math.max(0, ...items.map((item) => item.count));
  if (largest === 0) return items.map(() => 0);
  return items.map((item) => Math.round((item.count / largest) * 100));
}
