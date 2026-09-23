/**
 * @file Horizontally scrolling category filter for the Catalog view.
 *
 * "All" is always present, so the filter stays usable even when the
 * category list failed to load.
 */
import { useEffect, useRef } from 'react';
import type { CatalogCategory } from '../api/categories';
import './CategoryChips.css';

/** Props for {@link CategoryChips}. */
export interface CategoryChipsProps {
  /** Categories to offer after "All". */
  categories: CatalogCategory[];
  /** Selected slug, or null for "All". */
  active: string | null;
  /** Called with the tapped slug, or null for "All". */
  onSelect: (slug: string | null) => void;
}

/**
 * Class list for one chip.
 *
 * @param selected - Whether the chip is the active filter.
 * @returns The class attribute value.
 */
function chipClass(selected: boolean): string {
  return selected ? 'category-chips__chip is-active' : 'category-chips__chip';
}

/**
 * Render the filter chips.
 *
 * @param props - Categories, the active slug and the selection callback.
 * @returns The chip row.
 */
export default function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  const row = useRef<HTMLDivElement>(null);

  // A filter opened from a link, or restored after a tab switch, can sit past
  // the right edge of the row; bring it into view so the user sees what is
  // applied. `nearest` leaves an already-visible chip where it is.
  useEffect(() => {
    row.current
      ?.querySelector('.is-active')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [active, categories]);

  return (
    <div ref={row} className="category-chips" role="group" aria-label="Filter by category">
      <button type="button" className={chipClass(active === null)} aria-pressed={active === null} onClick={() => onSelect(null)}>
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className={chipClass(active === category.slug)}
          aria-pressed={active === category.slug}
          onClick={() => onSelect(category.slug)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
