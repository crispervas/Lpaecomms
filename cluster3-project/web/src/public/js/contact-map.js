/**
 * @file Contact page map (Leaflet).
 *
 * Renders an interactive map on the Contact page marking Lpaecomms' location.
 * Loaded after Leaflet's script (see the base layout), so the global `L` is
 * available. Defensive by design: if the map container is absent or Leaflet did
 * not load, it does nothing, so including this script on other pages is
 * harmless.
 */

(() => {
  const container = document.getElementById('contact-map');

  // Bail out unless we are on a page with the map container and Leaflet loaded.
  if (!container || typeof L === 'undefined') return;

  // Lpaecomms location as [latitude, longitude].
  // TODO: replace with the real store/office coordinates.
  const LOCATION = [-27.9685485,153.4144003]; // Placeholder: It is Australia Fair.
  const ZOOM = 17;

  const map = L.map(container).setView(LOCATION, ZOOM);

  // OpenStreetMap raster tiles. Attribution is required by their usage policy.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Single marker for the location, with a popup opened by default.
  L.marker(LOCATION)
    .addTo(map)
    .bindPopup('<strong>Lpaecomms</strong><br />Come and visit us here.')
    .openPopup();
})();
