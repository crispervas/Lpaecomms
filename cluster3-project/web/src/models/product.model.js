/**
 * @file Product model.
 *
 * Data access for the product catalogue. Lpaecomms has no product table yet, so
 * the catalogue comes from a public demo feed and this model serves it in two
 * shapes to two different callers: the map mashup's `listWithLocations`, which
 * pairs each product with a store location the feed does not carry, and the
 * storefront home page's `listFeatured`, which needs a plain trending grid at
 * a different size. Caches the raw feed response for a short TTL, the same way
 * `CurrencyModel` caches rates: it protects the demo feed's quota and, because
 * both mashup scripts call this model's endpoint on every `/mashup` page load,
 * keeps them looking at one consistent catalogue instead of two responses that
 * could disagree. Knows nothing about HTTP responses: it returns products or
 * throws, and the controller decides what a failure means to a client.
 */

/**
 * External catalogue feeding the storefront. Base URL only: the number of
 * products is a per-caller decision (see `#catalogueUrl`), not a property of
 * the feed.
 */
const CATALOGUE_BASE_URL = 'https://api.escuelajs.co/api/v1/products';

/** The mockup's "Trending now" grid holds eight cards. */
const DEFAULT_FEATURED_LIMIT = 8;

/** Give up on a slow feed rather than holding a request open indefinitely. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Five minutes: long enough to collapse a single `/mashup` page load's two
 * independent `GET /api/v1/products` calls (the map and the currency
 * converter each fetch it) into one upstream call, and to keep both mashups
 * looking at the same catalogue instead of two responses that could disagree
 * if the feed changed in between — short enough that the demo still looks
 * live, matching the policy `CurrencyModel` already applies to its own
 * third-party quota.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Raw feed responses, shared by every `ProductModel` instance and keyed by the
 * full catalogue URL (base URL plus the requested size) rather than held per
 * instance. Caching the feed's own JSON, instead of any caller's
 * transformation of it, is what lets `listWithLocations` and `listFeatured`
 * read the same base URL at different sizes without one overwriting the
 * other's shape: each size is its own URL and therefore its own cache entry.
 * Keying by URL is also what lets a test construct a model with an overridden
 * `catalogueBaseUrl` (see the constructor) without ever reading or evicting
 * the production URL's entry, even though the cache itself lives at module
 * scope.
 * @type {Map<string, {products: Array<Object>, expiresAt: number}>}
 */
const catalogueCache = new Map();

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
 * Reads the product catalogue: the mashup's five products paired with store
 * locations, and the storefront's featured grid at whatever size it asks for.
 */
export class ProductModel {
  /**
   * @param {string} [catalogueBaseUrl] - Feed base URL, without a query string;
   *   overridable so tests and other environments are not tied to one
   *   hardcoded host.
   */
  constructor(catalogueBaseUrl = CATALOGUE_BASE_URL) {
    /** @type {string} */
    this.catalogueBaseUrl = catalogueBaseUrl;
  }

  /**
   * Discard every cached catalogue response.
   *
   * Production never needs this: a still-valid entry is never evicted early.
   * It exists as a seam for tests — a suite that stubs `fetch` differently
   * from one test to the next would otherwise observe an earlier test's
   * cached response for the same URL, since the cache outlives any single
   * `ProductModel` instance.
   *
   * @returns {void}
   */
  static clearCache() {
    catalogueCache.clear();
  }

  /**
   * Build the feed URL for a given number of products.
   *
   * The size belongs in the URL rather than in a slice after the fact: it is
   * what makes each caller's response a distinct cache entry, which is why the
   * home page's eight products and the mashup's five can never overwrite one
   * another.
   *
   * @param {number} limit - How many products to request.
   * @returns {string} The absolute feed URL.
   */
  #catalogueUrl(limit) {
    const url = new URL(this.catalogueBaseUrl);
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', String(limit));
    return url.toString();
  }

  /**
   * Fetch the raw feed response, serving a still-fresh cached copy when there
   * is one.
   *
   * Caches the feed's own JSON rather than any caller's transformation of it:
   * `listWithLocations` and `listFeatured` shape the same records differently,
   * and caching a shaped result would hand one caller the other's output.
   *
   * @param {number} limit - How many products to request.
   * @returns {Promise<Array<Object>>} Raw feed records.
   * @throws {Error} When the feed is unreachable, times out, or answers non-2xx.
   */
  async #fetchCatalogue(limit) {
    const url = this.#catalogueUrl(limit);

    const cached = catalogueCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.products;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // fetch only rejects on a network failure: a 4xx/5xx arrives as a resolved
    // response, so without this check an error body would be parsed as products.
    if (!response.ok) {
      throw new Error(`Catalogue source responded ${response.status}`);
    }

    const products = await response.json();

    // Written only once the fetch succeeded, so a failure can never overwrite —
    // and therefore can never evict — a still-valid entry.
    catalogueCache.set(url, { products, expiresAt: Date.now() + CACHE_TTL_MS });

    return products;
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
    const products = await this.#fetchCatalogue(STORE_LOCATIONS.length);

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

  /**
   * Fetch products for the storefront, without store locations.
   *
   * This is the seam the in-house product service will replace: the home page
   * knows this shape and nothing about where it came from, so swapping the demo
   * feed means rewriting this method alone.
   *
   * @param {number} [limit] - How many products to return.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Products in feed order.
   * @throws {Error} When the feed is unreachable, times out, or answers a
   *   non-2xx status.
   */
  async listFeatured(limit = DEFAULT_FEATURED_LIMIT) {
    const products = await this.#fetchCatalogue(limit);

    return products.slice(0, limit).map((product) => ({
      id: product.id,
      name: product.title,
      // Empty string rather than undefined: the card omits the line instead of
      // printing "undefined" when the feed carries no category.
      category: product.category?.name ?? '',
      priceAud: product.price,
      imageUrl: firstImageUrl(product.images),
    }));
  }
}
