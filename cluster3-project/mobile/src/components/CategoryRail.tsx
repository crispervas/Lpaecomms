/**
 * @file Horizontally scrolling "Shop by category" rail on the Home view.
 */
import { CATEGORIES } from '../data/categories';
import './CategoryRail.css';

/**
 * Render the category tiles. Tiles are not links yet: category filtering
 * belongs to the Catalog view, which does not exist.
 *
 * @returns The rail.
 */
export default function CategoryRail() {
  return (
    <ul className="category-rail">
      {CATEGORIES.map((category) => (
        <li key={category.name} className="category-rail__item">
          <span className="category-rail__icon">{category.icon}</span>
          <span className="category-rail__name">{category.name}</span>
        </li>
      ))}
    </ul>
  );
}
