/**
 * @file Tailwind CSS configuration for the desktop renderer.
 *
 * The content globs must cover every file where a class name can appear. A class
 * used only inside a .jsx file that is not scanned is stripped from the
 * production build and the style vanishes with no error.
 *
 * The `lpa` palette and the two font families come from the desktop mockups and
 * match the web's _palette.less and mobile's variables.css. This is the only
 * place the admin screens take a colour from: components use `lpa-*` classes,
 * never a hex literal.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{js,jsx,mjs}'],
  theme: {
    extend: {
      colors: {
        lpa: {
          canvas: '#FAFAF8',
          surface: '#FFFFFF',
          ink: '#14161A',
          'ink-hover': '#2A2D33',
          line: '#E7E5DF',
          // The mockup draws inputs with #E7E5DF, which measures 1.2:1 against
          // white. WCAG 1.4.11 wants 3:1 for a control's boundary, so fields use
          // the web's @border-control instead.
          control: '#8E8A7F',
          subtle: '#6B6F76',
          placeholder: '#B3B1A9',
          accent: '#2F5EFB',
          'accent-strong': '#1F45D6',
          danger: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
