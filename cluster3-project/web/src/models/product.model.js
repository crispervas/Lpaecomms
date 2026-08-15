/**
 * @file Product model.
 *
 * Data access for the product catalogue. Lpaecomms has no product table yet, so
 * the catalogue comes from a public demo feed and this model serves it in three
 * shapes to three different callers: the map mashup's `listWithLocations`, which
 * pairs each product with a store location the feed does not carry; the
 * storefront home page's `listFeatured`, which needs a plain trending grid at
 * a different size; and the catalog page's `listByCategory`, which scopes the
 * same records to one category. Caches the raw feed response for a short TTL,
 * the same way `CurrencyModel` caches rates: it protects the demo feed's quota
 * and, because both mashup scripts call this model's endpoint on every
 * `/mashup` page load, keeps them looking at one consistent catalogue instead
 * of two responses that could disagree. Knows nothing about HTTP responses: it
 * returns products or throws, and the controller decides what a failure means
 * to a client.
 */

/**
 * External catalogue feeding the storefront. Base URL only: the number of
 * products is a per-caller decision (see `#catalogueUrl`), not a property of
 * the feed.
 */
const CATALOGUE_BASE_URL = 'https://api.escuelajs.co/api/v1/products';

/** The mockup's "Trending now" grid holds eight cards. */
const DEFAULT_FEATURED_LIMIT = 8;

/**
 * Category resource on the same feed. Kept as its own base rather than derived
 * from the products URL: they are sibling resources, not one nested in the
 * other, and deriving one from the other would break the moment either moves.
 */
const CATEGORIES_BASE_URL = 'https://api.escuelajs.co/api/v1/categories';

/** The catalog's grid is three rows of four. */
const DEFAULT_CATALOG_LIMIT = 12;

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
 * full catalogue URL (base URL plus the requested size, and which base it was
 * composed from — the products path or a category's path) rather than held
 * per instance. Caching the feed's own JSON, instead of any caller's
 * transformation of it, is what lets `listWithLocations` and `listFeatured`
 * read the same base URL at different sizes without one overwriting the
 * other's shape: each size is its own URL and therefore its own cache entry.
 * Keying by URL is also what lets a test construct a model with an overridden
 * `catalogueBaseUrl` (see the constructor) without ever reading or evicting
 * the production URL's entry, even though the cache itself lives at module
 * scope. Holds whatever a feed URL returns — an array for the list endpoints,
 * a single object for one product — not products specifically.
 * @type {Map<string, {payload: Object|Array<Object>, expiresAt: number}>}
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
 * Extract every usable image URL from the feed's `images` field.
 *
 * The feed is inconsistent: the field is usually an array of URLs, but some
 * records store that array JSON-encoded as a single string, and the encoded
 * form turns up both on its own and as an element of a real array. Parsing it
 * properly, rather than stripping leading/trailing brackets and quotes, is
 * what keeps a second URL in a multi-element JSON string from bleeding into
 * the first — character-stripping only worked by accident for a one-element
 * array.
 *
 * @param {unknown} images - Raw `images` value from the feed.
 * @returns {Array<string>} URLs in feed order; empty when none can be read.
 */
function imageUrls(images) {
  const entries = Array.isArray(images) ? images : [images];

  return entries.flatMap((entry) => {
    if (typeof entry !== 'string') return [];

    // Only a JSON-encoded array looks like this; any other string (a bare URL,
    // malformed JSON) falls through to the entry itself below.
    if (entry.startsWith('[')) {
      try {
        const parsed = JSON.parse(entry);
        if (Array.isArray(parsed)) return parsed.filter((url) => typeof url === 'string');
      } catch {
        // Not actually JSON — treat it as a plain string instead.
      }
    }

    return [entry];
  });
}

/**
 * Extract the first usable image URL from the feed's `images` field.
 *
 * The grids show one image per product; the detail page shows them all. Both
 * read the same parser so the feed's quirks are untangled in one place.
 *
 * @param {unknown} images - Raw `images` value from the feed.
 * @returns {string} A URL, or an empty string when none can be read.
 */
function firstImageUrl(images) {
  return imageUrls(images)[0] ?? '';
}

/**
 * Reads the product catalogue: the mashup's five products paired with store
 * locations, the storefront's featured grid at whatever size it asks for, and
 * the catalog page's list scoped to one category.
 */
export class ProductModel {
  /**
   * @param {string} [catalogueBaseUrl] - Products feed base URL, without a
   *   query string; overridable so tests and other environments are not tied to
   *   one hardcoded host.
   * @param {string} [categoriesBaseUrl] - Category resource base URL, onto
   *   which `listByCategory` composes `/{id}/products`.
   */
  constructor(catalogueBaseUrl = CATALOGUE_BASE_URL, categoriesBaseUrl = CATEGORIES_BASE_URL) {
    /** @type {string} */
    this.catalogueBaseUrl = catalogueBaseUrl;
    /** @type {string} */
    this.categoriesBaseUrl = categoriesBaseUrl;
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
   * Build the feed URL for a given number of products, optionally scoped to one
   * category.
   *
   * Both the size and the category belong in the URL rather than in a filter
   * after the fact: together they are what make each caller's response a
   * distinct cache entry, which is why the home page's eight products, the
   * mashup's five, and each category's twelve can never overwrite one another.
   *
   * @param {number} limit - How many products to request.
   * @param {number|null} [categoryId] - Category to scope to, or null for all.
   * @returns {string} The absolute feed URL.
   */
  #catalogueUrl(limit, categoryId = null) {
    const url = new URL(
      categoryId === null
        ? this.catalogueBaseUrl
        : `${this.categoriesBaseUrl}/${categoryId}/products`,
    );

    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', String(limit));

    return url.toString();
  }

  /**
   * Fetch a feed URL, serving a still-fresh cached copy when there is one.
   *
   * Caches the feed's own JSON rather than any caller's transformation of it:
   * the list methods shape the same records differently, and caching a shaped
   * result would hand one caller another's output. The payload is whatever the
   * URL returns — an array for the list endpoints, a single object for one
   * product — which is why the cached field is named for its role rather than
   * for one of its shapes.
   *
   * @param {string} url - Absolute feed URL.
   * @returns {Promise<Object|Array<Object>>} The feed's parsed JSON.
   * @throws {Error} When the feed is unreachable, times out, or answers a
   *   non-2xx status. A non-2xx error carries the response's `status` as a
   *   property so a caller can tell "this does not exist" from "this could not
   *   be read" without parsing the message.
   */
  async #fetchFromFeed(url) {
    const cached = catalogueCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // fetch only rejects on a network failure: a 4xx/5xx arrives as a resolved
    // response, so without this check an error body would be parsed as products.
    if (!response.ok) {
      const error = new Error(`Catalogue source responded ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();

    // Written only once the fetch succeeded, so a failure can never overwrite —
    // and therefore can never evict — a still-valid entry.
    catalogueCache.set(url, { payload, expiresAt: Date.now() + CACHE_TTL_MS });

    return payload;
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
    const products = await this.#fetchFromFeed(this.#catalogueUrl(STORE_LOCATIONS.length));

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
   * Fetch products for the storefront, optionally scoped to one category.
   *
   * This is the seam the in-house product service will replace: the pages know
   * this shape and nothing about where it came from, so swapping the demo feed
   * means rewriting this method alone.
   *
   * @param {number|null} categoryId - Category to scope to, or null for every
   *   category.
   * @param {number} [limit] - How many products to return.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Products in feed order.
   * @throws {Error} When the feed is unreachable, times out, or answers a
   *   non-2xx status.
   */
  async listByCategory(categoryId, limit = DEFAULT_CATALOG_LIMIT) {
    const products = await this.#fetchFromFeed(this.#catalogueUrl(limit, categoryId));

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

  /**
   * Fetch products for the home page's trending grid.
   *
   * Delegates rather than repeating the unfiltered query, and keeps its own
   * default: the home's trending row is eight cards where the catalog's grid is
   * twelve, so neither page inherits the other's density.
   *
   * @param {number} [limit] - How many products to return.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Products in feed order.
   * @throws {Error} When the feed is unreachable, times out, or answers a
   *   non-2xx status.
   */
  async listFeatured(limit = DEFAULT_FEATURED_LIMIT) {
    return this.listByCategory(null, limit);
  }
}
