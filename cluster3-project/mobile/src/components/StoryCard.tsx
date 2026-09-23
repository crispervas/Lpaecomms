/**
 * @file "Our story" banner at the foot of the Home view. Inert until the
 * About view exists; it becomes a link in that view's spec.
 */
import './StoryCard.css';

/**
 * Render the story banner.
 *
 * @returns The banner.
 */
export default function StoryCard() {
  return (
    <div className="story-card">
      <div>
        <div className="story-card__title">Our story</div>
        <div className="story-card__subtitle">Learn about LPA Ecomms</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    </div>
  );
}
