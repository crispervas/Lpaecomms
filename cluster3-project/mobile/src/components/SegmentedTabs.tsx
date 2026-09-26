/**
 * @file Segmented switch between two or more views of one page, as in the
 * mockups' Log in / Sign up and Profile / Orders controls.
 */
import './SegmentedTabs.css';

/** One choice in the switch. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Props for {@link SegmentedTabs}. */
export interface SegmentedTabsProps<T extends string> {
  /** The choices, in display order. */
  options: SegmentedOption<T>[];
  /** The choice showing. */
  value: T;
  /** Called with the chosen value. */
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Account". */
  label: string;
  /** Extra class for the page's own spacing. */
  className?: string;
}

/**
 * Render the switch.
 *
 * @param props - Choices, current value, change handler and accessible name.
 * @returns The segmented control.
 */
export default function SegmentedTabs<T extends string>({ options, value, onChange, label, className }: SegmentedTabsProps<T>) {
  return (
    <div className={className ? `segmented-tabs ${className}` : 'segmented-tabs'} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'segmented-tabs__tab is-active' : 'segmented-tabs__tab'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
