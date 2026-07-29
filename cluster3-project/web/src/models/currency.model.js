/**
 * @file Currency model.
 *
 * Data access for exchange rates. Calls API Ninjas from the server so the API
 * key never reaches the browser — that is the whole reason this proxy exists.
 * Caches rates in process to stay inside the provider's free-plan limits.
 * Knows nothing about HTTP responses: it returns a conversion or throws.
 */

/** Provider endpoint for a single conversion. */
const PROVIDER_URL = 'https://api.api-ninjas.com/v1/convertcurrency';

/**
 * Currencies the store supports. Deliberately narrower than the provider's
 * list: these are the currencies Lpaecomms transacts in, and a whitelist keeps
 * an arbitrary query parameter from reaching a paid third party.
 */
const SUPPORTED_CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR'];

/** One hour, matching the documented cache policy. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Give up on a slow provider rather than holding a request open. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Round to cents.
 *
 * @param {number} value - Raw amount.
 * @returns {number} The amount rounded to two decimal places.
 */
const roundToCents = (value) => Math.round(value * 100) / 100;

/**
 * Converts amounts between the store's supported currencies.
 */
export class CurrencyModel {
  /**
   * @param {string|null} apiKey - Provider API key, or null when unconfigured.
   */
  constructor(apiKey) {
    /** @type {string|null} */
    this.apiKey = apiKey;
    /**
     * Rates keyed `HAVE:WANT`. The rate is cached rather than a converted
     * total, so every amount for a currency pair reuses one upstream call.
     * @type {Map<string, {rate: number, expiresAt: number}>}
     */
    this.rateCache = new Map();
  }

  /**
   * The currencies this model accepts.
   *
   * @returns {string[]} Upper-case ISO 4217 codes.
   */
  static get supportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Whether a provider key is available.
   *
   * @returns {boolean} True when conversions can be performed.
   */
  get isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Convert an amount between two currencies.
   *
   * @param {string} have - Source currency code, upper case.
   * @param {string} want - Target currency code, upper case.
   * @param {number} amount - Positive amount in the source currency.
   * @returns {Promise<{rate: number, converted: number, cached: boolean}>}
   *   The rate used, the converted amount in cents precision, and whether the
   *   rate came from the cache.
   * @throws {Error} When the provider is unreachable, times out, answers a
   *   non-2xx status, returns no usable amount, or returns a zero or negative
   *   amount (which would derive a zero or negative rate — not a usable rate,
   *   and one that must never be cached).
   */
  async convert(have, want, amount) {
    // An identity conversion has a known answer; calling a paid API for it
    // would only add latency and a failure mode.
    if (have === want) {
      return { rate: 1, converted: roundToCents(amount), cached: true };
    }

    const cacheKey = `${have}:${want}`;
    const cached = this.rateCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return { rate: cached.rate, converted: roundToCents(amount * cached.rate), cached: true };
    }

    const url = `${PROVIDER_URL}?have=${have}&want=${want}&amount=${amount}`;
    const response = await fetch(url, {
      headers: { 'X-Api-Key': this.apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // The status is recorded for the server log; the controller decides what
      // a client is told, which is never "your key is wrong".
      throw new Error(`Currency provider responded ${response.status}`);
    }

    const payload = await response.json();
    const converted = Number(payload.new_amount);

    // A zero or negative amount is rejected alongside a non-finite one: any of
    // the three would derive a zero, negative, or NaN rate, and that rate would
    // then sit in the cache for a full hour answering every request for this
    // pair with a bogus conversion instead of surfacing the provider's fault.
    if (!Number.isFinite(converted) || converted <= 0) {
      throw new Error('Currency provider returned no usable amount');
    }

    const rate = converted / amount;
    this.rateCache.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS });

    return { rate, converted: roundToCents(converted), cached: false };
  }
}
