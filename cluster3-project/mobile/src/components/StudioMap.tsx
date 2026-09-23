/**
 * @file Embedded map of the studio (Leaflet + OpenStreetMap tiles).
 *
 * Runs inside the Capacitor WebView on iOS and Android like in a browser, with
 * no API key and no native project changes. Tiles need a connection; offline
 * the box stays blank and the studio card's "Open in Maps" link still works.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STUDIO } from '../data/studio';
import './StudioMap.css';

const ZOOM = 16;

/**
 * Render the studio map.
 *
 * @returns The map container.
 */
export default function StudioMap() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const position: L.LatLngExpression = [STUDIO.latitude, STUDIO.longitude];
    const map = L.map(container.current, { zoomControl: false, scrollWheelZoom: false }).setView(position, ZOOM);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // A vector marker: Leaflet's default pin is an image the bundler would not
    // resolve. Its colours come from CSS (.studio-map__marker), not from here.
    L.circleMarker(position, { radius: 9, className: 'studio-map__marker' }).addTo(map);

    // Ionic slides the page in, so Leaflet can measure the box mid-animation
    // and leave grey gaps; re-measure once the transition has settled.
    const timer = window.setTimeout(() => map.invalidateSize(), 400);

    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, []);

  return (
    <div
      ref={container}
      className="studio-map"
      role="img"
      aria-label={`Map showing the Lpaecomms studio at ${STUDIO.address}`}
    />
  );
}
