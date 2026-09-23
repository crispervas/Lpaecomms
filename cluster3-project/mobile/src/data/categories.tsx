/**
 * @file The fixed "Shop by category" list from the mockup.
 *
 * The API has no categories endpoint yet, so the Home rail uses this static
 * list. Replace it with an API call once one exists; nothing else depends on
 * where the list comes from.
 */
import type { ReactNode } from 'react';

/** A category tile on the Home rail. */
export interface Category {
  /** Display name. */
  name: string;
  /** Stroke-only SVG glyph, inheriting colour from the tile. */
  icon: ReactNode;
}

/**
 * Wrap mockup glyph paths in the shared 24px stroke SVG.
 *
 * @param paths - The glyph's shapes.
 * @returns The SVG element.
 */
function glyph(paths: ReactNode): ReactNode {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {paths}
    </svg>
  );
}

/** The six categories shown on the Home rail, in mockup order. */
export const CATEGORIES: Category[] = [
  {
    name: 'Keyboards',
    icon: glyph(<><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="7" y1="15" x2="17" y2="15" /></>),
  },
  {
    name: 'Mice',
    icon: glyph(<><rect x="7" y="3" width="10" height="18" rx="5" /><line x1="12" y1="3" x2="12" y2="10" /></>),
  },
  {
    name: 'Headsets',
    icon: glyph(
      <>
        <path d="M4 13v3a2 2 0 002 2h1v-6H6a2 2 0 00-2 1z" />
        <path d="M20 13v3a2 2 0 01-2 2h-1v-6h1a2 2 0 012 1z" />
        <path d="M4 13a8 8 0 0116 0" />
      </>,
    ),
  },
  {
    name: 'Monitors',
    icon: glyph(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="12" y1="16" x2="12" y2="20" />
      </>,
    ),
  },
  {
    name: 'Webcams',
    icon: glyph(<><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>),
  },
  {
    name: 'Docks',
    icon: glyph(
      <>
        <rect x="4" y="9" width="16" height="7" rx="1.5" />
        <line x1="8" y1="16" x2="8" y2="18" />
        <line x1="16" y1="16" x2="16" y2="18" />
      </>,
    ),
  },
];
