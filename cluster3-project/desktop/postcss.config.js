/**
 * @file PostCSS pipeline for the renderer stylesheet.
 *
 * Vite runs this automatically for any CSS it processes; Tailwind needs no
 * separate build script in this package.
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
