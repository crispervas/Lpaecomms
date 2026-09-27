/**
 * @file Store locations.
 *
 * Lpaecomms stores on the Gold Coast, paired by index with the products the
 * map mashup shows. The catalogue carries no coordinates, so the pairing lives
 * here; the mashup page renders this list into the map element so the browser
 * script needs no second endpoint.
 */

/**
 * Stores in display order.
 * @type {ReadonlyArray<{store: string, latitude: number, longitude: number}>}
 */
export const STORE_LOCATIONS = Object.freeze([
  { store: 'Surfers Paradise', latitude: -28.0023, longitude: 153.4145 },
  { store: 'Broadbeach', latitude: -28.0296, longitude: 153.429 },
  { store: 'Southport', latitude: -27.9676, longitude: 153.4009 },
  { store: 'Burleigh Heads', latitude: -28.0916, longitude: 153.4494 },
  { store: 'Coolangatta', latitude: -28.169, longitude: 153.535 },
]);
