/**
 * @file Mashups page map (Leaflet).
 *
 * Mashup 1: plots the Lpaecomms catalogue on an OpenStreetMap base layer, one
 * marker per product, using the same /api/v1/products endpoint the mobile and
 * desktop clients call. Loaded after Leaflet's own script (see the base
 * layout), so the global `L` is available. Defensive by design: if the
 * container is absent or Leaflet did not load it does nothing, so including it
 * on another page is harmless.
 */

(() => {
  const container = document.getElementById('mashup-map');

  // Bail out unless we are on a page with the map container and Leaflet loaded.
  if (!container || typeof L === 'undefined') return;

  /** Gold Coast, shown until the products arrive and reframe the map. */
  const FALLBACK_VIEW = [-28.0023, 153.4145];
  const FALLBACK_ZOOM = 11;

  const priceFormatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  });

  /**
   * Escape text for safe interpolation into popup HTML.
   *
   * Product names come from a third-party feed, so they are untrusted input.
   * Leaflet's bindPopup takes raw HTML, which would execute anything the feed
   * contained.
   *
   * @param {string} value - Untrusted text.
   * @returns {string} The same text with HTML metacharacters escaped.
   */
  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /**
   * Build the popup markup for one product.
   *
   * @param {{name: string, priceAud: number, imageUrl: string, store: string}} product - Product to render.
   * @returns {string} Popup HTML.
   */
  const popupHtml = (product) => `
    <div style="display:flex;gap:8px;align-items:center">
      ${product.imageUrl
        ? `<img src="${escapeHtml(product.imageUrl)}" alt="" width="80" height="80"
             style="width:80px;height:80px;object-fit:cover;border-radius:6px" />`
        : ''}
      <div>
        <strong>${escapeHtml(product.name)}</strong><br />
        ${priceFormatter.format(product.priceAud)}<br />
        <span style="color:#64748b">${escapeHtml(product.store)}</span>
      </div>
    </div>`;

  /**
   * Replace the map with a plain message, keeping the card and page intact.
   *
   * @param {string} message - Text shown in place of the map.
   * @returns {void}
   */
  const showNotice = (message) => {
    map.remove();
    container.className =
      'flex h-[320px] w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-center text-sm text-amber-800 md:h-[420px]';
    container.textContent = message;
  };

  // A view must be set before any tiles or markers are added; fitBounds
  // replaces it once the real coordinates arrive.
  const map = L.map(container).setView(FALLBACK_VIEW, FALLBACK_ZOOM);

  // OpenStreetMap raster tiles. Attribution is required by their usage policy.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  fetch('/api/v1/products')
    .then((response) => {
      if (!response.ok) throw new Error(`Products endpoint responded ${response.status}`);
      return response.json();
    })
    // The endpoint answers { products: [...] }, not a bare array, so a
    // pagination field or similar metadata can be added later without
    // changing the response's root type.
    .then(({ products }) => {
      if (!products.length) {
        showNotice('No products are available to show on the map right now.');
        return;
      }

      const markers = products.map((product) =>
        L.marker([product.latitude, product.longitude]).bindPopup(popupHtml(product)),
      );

      // Fitting the markers' bounds beats a hardcoded centre and zoom: the
      // frame follows the data instead of having to be corrected when it moves.
      const group = L.featureGroup(markers).addTo(map);
      map.fitBounds(group.getBounds().pad(0.2));
    })
    .catch(() => {
      showNotice('Product locations are unavailable right now.');
    });
})();
