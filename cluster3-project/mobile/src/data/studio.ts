/**
 * @file The Lpaecomms studio location, shared by the channel card and the map.
 *
 * Same point as the web contact page (Australia Fair, Southport), so the two
 * platforms never show different places.
 */

/** Where the studio is and how to open it in a maps app. */
export const STUDIO = {
  latitude: -27.9685485,
  longitude: 153.4144003,
  address: 'Australia Fair, Southport QLD',
  // A universal Maps URL: opens the platform's maps app or the browser.
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=-27.9685485%2C153.4144003',
} as const;
