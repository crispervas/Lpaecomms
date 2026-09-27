/**
 * @file Sample figures shown by the Dashboard preview.
 *
 * The API has no users, orders, tickets or per-category counts yet, so the
 * Dashboard renders the desktop mockup's figures, labelled as a preview. Its
 * recent orders come from data/orders.mjs, shared with the Orders screen.
 * Replace these with calls through window.api once the endpoints exist; the
 * screen only depends on the shapes below.
 */

/**
 * Products per category. Their sum is the "Products live" figure, so the two
 * panels can never disagree.
 *
 * @type {ReadonlyArray<{name: string, count: number}>}
 */
export const SAMPLE_CATEGORIES = Object.freeze([
  { name: 'Keyboards', count: 42 },
  { name: 'Mice', count: 34 },
  { name: 'Headsets', count: 29 },
  { name: 'Monitors', count: 24 },
  { name: 'Webcams', count: 18 },
  { name: 'Docks', count: 39 },
]);

/**
 * Headline figures. `trend` says whether the change is good news, which is
 * not always the direction of the number: fewer open tickets would be good.
 * The mockup colours "-3 vs last week" as bad news, and so does this data.
 *
 * @type {ReadonlyArray<{label: string, value: number, delta: string, trend: 'up'|'down'}>}
 */
export const SAMPLE_KPIS = Object.freeze([
  { label: 'Total users', value: 8412, delta: '+4.2% this month', trend: 'up' },
  { label: 'Total orders', value: 2930, delta: '+1.8% this month', trend: 'up' },
  {
    label: 'Products live',
    value: SAMPLE_CATEGORIES.reduce((sum, category) => sum + category.count, 0),
    delta: '+6 new',
    trend: 'up',
  },
  { label: 'Open tickets', value: 14, delta: '-3 vs last week', trend: 'down' },
]);
