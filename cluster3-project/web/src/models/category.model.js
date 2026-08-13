/**
 * @file Category model.
 *
 * Data access for the product categories the catalog filters by. Lpaecomms has
 * no category table yet, so the list comes from the same public demo feed the
 * products do. That feed accepts writes from anyone, so its category list
 * accumulates entries created by strangers; this model keeps only the ones that
 * actually hold products, which is what keeps the storefront's filter bar free
 * of other people's test data. Caches the result for a short TTL, the same way
 * `CurrencyModel` caches rates and `ProductModel` caches the catalogue. Knows
 * nothing about HTTP responses: it returns categories or throws, and the
 * controller decides what a failure means to a client.
 *
 * This is the seam the in-house category service will replace: rewrite
 * `listCategories` and nothing above it changes.
 */

/** Category resource on the external demo feed. */
const CATEGORIES_BASE_URL = 'https://api.escuelajs.co/api/v1/categories';

/** Give up on a slow feed rather than holding a request open indefinitely. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Budget for one emptiness probe — far shorter than `REQUEST_TIMEOUT_MS`. A
 * probe that cannot answer this fast fails open anyway (see `#hasProducts`),
 * so waiting the list read's full 5s would only hold the page open for the
 * worst case to reach an answer it was always going to reach for free.
 */
const PROBE_TIMEOUT_MS = 1000;

/** Five minutes, matching the catalogue's policy for the same third party. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Upper bound on how many categories one `listCategories` call will probe.
 * The feed is publicly writable and its category list can grow without
 * limit, so probing every entry would turn a stranger's junk into a few
 * hundred parallel requests at one origin, all timing out and all failing
 * open. 20 comfortably clears the five categories the seeded feed actually
 * carries.
 */
const MAX_PROBED_CATEGORIES = 20;

/**
 * Filtered category lists, shared by every `CategoryModel` instance and keyed
 * by base URL rather than held per instance, so a test constructing a model
 * with an overridden URL never reads or evicts the production entry.
 * @type {Map<string, {categories: Array<{id: number, name: string, slug: string}>, expiresAt: number}>}
 */
const categoryCache = new Map();

/**
 * Reads the catalogue's categories and hides the ones with nothing in them.
 */
export class CategoryModel {
  /**
   * @param {string} [categoriesBaseUrl] - Category resource URL; overridable so
   *   tests and other environments are not tied to one hardcoded host.
   */
  constructor(categoriesBaseUrl = CATEGORIES_BASE_URL) {
    /** @type {string} */
    this.categoriesBaseUrl = categoriesBaseUrl;
  }

  /**
   * Discard every cached category list.
   *
   * Production never needs this: a still-valid entry is never evicted early. It
   * exists as a seam for tests, whose differing `fetch` stubs would otherwise
   * observe an earlier test's cached list.
   *
   * @returns {void}
   */
  static clearCache() {
    categoryCache.clear();
  }

  /**
   * List the categories that currently hold at least one product.
   *
   * @returns {Promise<Array<{id: number, name: string, slug: string}>>} A
   *   fresh array each call — never the cache's own array — in feed order,
   *   junk and empty ones removed.
   * @throws {Error} When the category list is unreachable, times out, or
   *   answers a non-2xx status. A failing probe never throws — see `#hasProducts`.
   */
  async listCategories() {
    const cached = categoryCache.get(this.categoriesBaseUrl);
    if (cached && cached.expiresAt > Date.now()) {
      // A copy, not the cache's own array: a caller that sorted or otherwise
      // mutated it in place would corrupt what every other request sees for
      // the rest of the TTL window.
      return cached.categories.slice();
    }

    const response = await fetch(this.categoriesBaseUrl, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // fetch only rejects on a network failure: a 4xx/5xx arrives as a resolved
    // response, so without this check an error body would be read as categories.
    if (!response.ok) {
      throw new Error(`Category source responded ${response.status}`);
    }

    const raw = await response.json();

    // Bounded before a single probe fires: the feed is publicly writable, so
    // an unbounded list would mean an unbounded fan-out of parallel requests
    // at one third-party origin.
    const candidates = raw.slice(0, MAX_PROBED_CATEGORIES);

    // Probed in parallel: the answers are independent, and a serial loop would
    // multiply the page's cold-start latency by the number of categories.
    const populated = await Promise.all(candidates.map((category) => this.#hasProducts(category.id)));

    const categories = candidates
      .filter((_, index) => populated[index])
      .map(({ id, name, slug }) => ({ id, name, slug }));

    // Written only once the list was read, so a failure can never overwrite a
    // still-valid entry.
    categoryCache.set(this.categoriesBaseUrl, {
      categories,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return categories.slice();
  }

  /**
   * Ask whether a category holds any product at all.
   *
   * Requests a single record because the count is irrelevant: the only question
   * is whether the category is worth offering as a filter.
   *
   * Returns true on any failure rather than propagating it — a network
   * failure, a non-2xx status, or a 200 whose body is not the array the feed
   * is supposed to send back. Only a well-formed array can actually answer
   * "no products"; anything else is a probe that could not answer, and
   * dropping a legitimate category because one request happened to fail, or
   * answered with something unreadable, would silently shrink the catalog's
   * navigation during a network blip. Showing one empty category is the
   * smaller harm.
   *
   * @param {number} categoryId - Feed id of the category to probe. The feed
   *   supplies this value, so it is coerced to `Number` before it reaches the
   *   URL rather than trusted as already being one.
   * @returns {Promise<boolean>} True when the category holds products, or when
   *   the probe could not answer.
   */
  async #hasProducts(categoryId) {
    const url = `${this.categoriesBaseUrl}/${Number(categoryId)}/products?offset=0&limit=1`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      if (!response.ok) return true;

      const products = await response.json();
      // A non-array body cannot mean "no products" — it means the probe
      // could not answer, which keeps the category rather than dropping it.
      if (!Array.isArray(products)) return true;

      return products.length > 0;
    } catch {
      return true;
    }
  }
}
