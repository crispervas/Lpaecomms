/**
 * @file Product model.
 *
 * Data access for the product catalogue. Lpaecomms has no product table yet, so
 * the catalogue comes from a public demo feed and the store locations — which
 * that feed does not carry — are merged in here. Knows nothing about HTTP
 * responses: it returns products or throws, and the controller decides what a
 * failure means to a client.
 */

/** External catalogue feeding the mashups. Five products is the demo size. */
const CATALOGUE_URL = 'https://api.escuelajs.co/api/v1/products?offset=0&limit=5';

/** Give up on a slow feed rather than holding a request open indefinitely. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Lpaecomms store locations on the Gold Coast, assigned to products by index.
 * The external feed carries no coordinates, and the map mashup needs one point
 * per product, so the pairing lives here rather than being invented downstream.
 */
const STORE_LOCATIONS = [
  { store: 'Surfers Paradise', latitude: -28.0023, longitude: 153.4145 },
  { store: 'Broadbeach', latitude: -28.0296, longitude: 153.429 },
  { store: 'Southport', latitude: -27.9676, longitude: 153.4009 },
  { store: 'Burleigh Heads', latitude: -28.0916, longitude: 153.4494 },
  { store: 'Coolangatta', latitude: -28.169, longitude: 153.535 },
];

/**
 * Extract a usable image URL from the feed's `images` field.
 *
 * The feed is inconsistent: the field is usually an array of URLs, but some
 * records store that array JSON-encoded as a single string. Parsing it
 * properly, rather than stripping leading/trailing brackets and quotes, is
 * what keeps a second URL in a multi-element JSON string from bleeding into
 * the first — character-stripping only worked by accident for a one-element
 * array.
 *
 * @param {unknown} images - Raw `images` value from the feed.
 * @returns {string} A URL, or an empty string when none can be read.
 */
function firstImageUrl(images) {
  const raw = Array.isArray(images) ? images[0] : images;
  if (typeof raw !== 'string') return '';

  // Only a JSON-encoded array looks like this; any other string (a bare URL,
  // malformed JSON) falls through to the `return raw` fallback below.
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
    } catch {
      // Not actually JSON — treat it as a plain string instead.
    }
  }

  return raw;
}

/**
 * Reads the product catalogue and pairs each product with a store location.
 */
export class ProductModel {
  /**
   * @param {string} [catalogueUrl] - Feed URL; overridable so tests and other
   *   environments are not tied to one hardcoded host.
   */
  constructor(catalogueUrl = CATALOGUE_URL) {
    /** @type {string} */
    this.catalogueUrl = catalogueUrl;
  }

  /**
   * Fetch the catalogue and merge each product with its store location.
   *
   * @returns {Promise<Array<{id: number, name: string, priceAud: number, imageUrl: string, store: string, latitude: number, longitude: number}>>}
   *   Products in display order, at most one per known store location.
   * @throws {Error} When the feed is unreachable, times out, or answers a
   *   non-2xx status.
   */
  async listWithLocations() {
    const response = await fetch(this.catalogueUrl, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // fetch only rejects on a network failure: a 4xx/5xx arrives as a resolved
    // response, so without this check an error body would be parsed as products.
    if (!response.ok) {
      throw new Error(`Catalogue source responded ${response.status}`);
    }

    const products = await response.json();

    // Never return more products than there are locations: a product without a
    // place on the map is not something the mashup can display.
    return products.slice(0, STORE_LOCATIONS.length).map((product, index) => ({
      id: product.id,
      name: product.title,
      priceAud: product.price,
      imageUrl: firstImageUrl(product.images),
      ...STORE_LOCATIONS[index],
    }));
  }
}
