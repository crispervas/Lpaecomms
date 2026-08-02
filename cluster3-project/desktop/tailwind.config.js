/**
 * @file Tailwind CSS configuration for the desktop renderer.
 *
 * The content globs must cover every file where a class name can appear. A class
 * used only inside a .jsx file that is not scanned is stripped from the
 * production build and the style vanishes with no error.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
