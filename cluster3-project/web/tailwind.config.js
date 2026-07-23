/**
 * @file Tailwind CSS configuration for the web platform.
 *
 * The `content` globs MUST include the EJS view paths: Tailwind scans these
 * files for class names and removes any class it does not find from the
 * production build. Classes assembled dynamically in server code are invisible
 * to this scan, so always write complete class names in the templates.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./src/views/**/*.ejs'],
  theme: {
    extend: {},
  },
  plugins: [],
};
