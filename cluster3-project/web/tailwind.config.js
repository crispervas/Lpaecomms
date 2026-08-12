/**
 * @file Tailwind CSS configuration for the web platform.
 *
 * The `content` globs MUST include the EJS view paths: Tailwind scans these
 * files for class names and removes any class it does not find from the
 * production build. The browser scripts are scanned too, because some states
 * are styled at runtime (a map that failed to load, a password strength
 * level) and those class names exist nowhere else.
 *
 * Classes assembled dynamically by concatenation are invisible to this scan in
 * either kind of file, so always write complete class names.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./src/views/**/*.ejs', './src/public/js/**/*.js'],
  theme: {
    extend: {
      // Palette lifted from the home mockup. Named by role rather than by hue
      // so a later brand change is one edit here, not a sweep through every
      // template.
      colors: {
        canvas: '#FAFAF8',
        surface: '#FFFFFF',
        subtle: '#F1F0EC',
        ink: '#14161A',
        // The mockup uses #9A9C9A for small secondary text. It measures 2.65:1
        // against the canvas and fails WCAG AA, so those elements use `muted`
        // (4.76:1) instead — a difference barely visible next to the mockup.
        muted: '#6B6F76',
        line: { DEFAULT: '#E7E5DF', strong: '#D8D6CF' },
        accent: { DEFAULT: '#2F5EFB', strong: '#1F45D6' },
        tint: '#EEF1FF',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
