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
    extend: {},
  },
  plugins: [],
};
