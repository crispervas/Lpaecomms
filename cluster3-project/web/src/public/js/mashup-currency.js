/**
 * @file Mashups page currency converter.
 *
 * Mashup 2: combines the Lpaecomms catalogue with live exchange rates. Both
 * come from this application's own REST API — /api/v1/products and
 * /api/v1/convert — which is the same contract the mobile and desktop clients
 * use. The provider key stays server-side; this script never sees it.
 *
 * Defensive by design: if the card is not on the page it does nothing.
 */

(() => {
  const productSelect = document.getElementById('mashup-product');
  const currencySelect = document.getElementById('mashup-currency');
  const basePriceOutput = document.getElementById('mashup-base-price');
  const convertedOutput = document.getElementById('mashup-converted-price');
  const status = document.getElementById('mashup-convert-status');

  if (!productSelect || !currencySelect || !basePriceOutput || !convertedOutput || !status) return;

  /** Prices from the catalogue are quoted in AUD. */
  const BASE_CURRENCY = 'AUD';

  /** Long enough that holding a key down does not fan out one call per keystroke. */
  const DEBOUNCE_MS = 300;

  /** @type {Array<{id: number, name: string, priceAud: number}>} */
  let products = [];

  /** @type {number|undefined} */
  let debounceTimer;

  /**
   * Bumped at the start of every `refresh` call. A response has no fixed
   * order relative to others — a later request can resolve before an earlier
   * one — so each call captures the id and checks it back against this
   * counter before writing to the DOM; a stale call recognises itself as
   * stale and stays quiet.
   * @type {number}
   */
  let latestRequestId = 0;

  /**
   * Format an amount in a given currency using the browser's own rules.
   *
   * @param {number} amount - Amount to format.
   * @param {string} currency - ISO 4217 code.
   * @returns {string} Localised amount, e.g. "$92.34" or "£49.00".
   */
  const formatMoney = (amount, currency) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);

  /**
   * The product currently chosen, if any.
   *
   * @returns {{id: number, name: string, priceAud: number}|undefined} The selection.
   */
  const selectedProduct = () =>
    products.find((product) => String(product.id) === productSelect.value);

  /**
   * Request a conversion and render it, or degrade to the base price.
   *
   * A failed conversion still shows a price: an unavailable third-party rate is
   * not a reason to leave a customer looking at an empty field.
   *
   * Switching currencies quickly can make an earlier request's response
   * arrive after a later one's — the network makes no ordering promise — so
   * every path that writes to the DOM after an `await` first confirms this is
   * still the most recent call. Bumping the counter before the early returns
   * below also means a stale in-flight response cannot repaint a selection
   * the user has since cleared.
   *
   * @returns {Promise<void>}
   */
  const refresh = async () => {
    const requestId = ++latestRequestId;
    const product = selectedProduct();

    if (!product) {
      basePriceOutput.textContent = '—';
      convertedOutput.textContent = '—';
      status.textContent = 'Choose a product to see its price converted.';
      return;
    }

    basePriceOutput.textContent = formatMoney(product.priceAud, BASE_CURRENCY);
    const target = currencySelect.value;

    // AUD is the base currency: converting it into itself is a known answer, so
    // the round trip is skipped entirely.
    if (target === BASE_CURRENCY) {
      convertedOutput.textContent = formatMoney(product.priceAud, BASE_CURRENCY);
      status.textContent = 'Showing the base price in AUD.';
      return;
    }

    status.textContent = 'Converting…';

    try {
      const query = new URLSearchParams({
        have: BASE_CURRENCY,
        want: target,
        amount: String(product.priceAud),
      });
      const response = await fetch(`/api/v1/convert?${query}`);

      // A newer call already started (and may have finished) while this one
      // was in flight: rendering now would overwrite its result with a stale
      // one, so this call yields instead.
      if (requestId !== latestRequestId) return;

      if (!response.ok) throw new Error(`Conversion responded ${response.status}`);

      const result = await response.json();

      // Parsing the body is itself asynchronous, so the selection could have
      // moved on again during that wait — checked once more right before the
      // write it guards.
      if (requestId !== latestRequestId) return;

      convertedOutput.textContent = formatMoney(result.converted, result.want);
      status.textContent = `Rate ${result.rate.toFixed(4)} ${BASE_CURRENCY}/${result.want}${
        result.cached ? ' (cached)' : ''
      }.`;
    } catch {
      // A stale failure is just as capable of overwriting a fresh result as a
      // stale success, so the failure path is guarded too.
      if (requestId !== latestRequestId) return;

      convertedOutput.textContent = formatMoney(product.priceAud, BASE_CURRENCY);
      status.textContent = 'Live rates are unavailable — showing the price in AUD.';
    }
  };

  /**
   * Run `refresh` once the user stops changing the selection.
   *
   * @returns {void}
   */
  const scheduleRefresh = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, DEBOUNCE_MS);
  };

  productSelect.addEventListener('change', scheduleRefresh);
  currencySelect.addEventListener('change', scheduleRefresh);

  fetch('/api/v1/products')
    .then((response) => {
      if (!response.ok) throw new Error(`Products endpoint responded ${response.status}`);
      return response.json();
    })
    .then((loaded) => {
      products = loaded;
      productSelect.replaceChildren();

      const placeholder = new Option('Choose a product', '');
      placeholder.disabled = true;
      placeholder.selected = true;
      productSelect.append(placeholder);

      // new Option() sets textContent, so a product name from the external feed
      // is inserted as text and can never be parsed as markup.
      for (const product of products) {
        productSelect.append(new Option(product.name, String(product.id)));
      }
    })
    .catch(() => {
      productSelect.replaceChildren(new Option('Products unavailable', ''));
      status.textContent = 'The product catalogue is unavailable right now.';
    });
})();
