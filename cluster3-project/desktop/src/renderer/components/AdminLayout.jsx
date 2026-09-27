/**
 * @file Signed-in frame shared by every admin screen.
 *
 * Draws the sidebar from the desktop mockups — brand, section navigation and
 * the signed-in administrator — and places the current screen beside it.
 * Sections whose screens are not built yet stay in the navigation, so the frame
 * matches the mockups, but are marked unavailable instead of leading nowhere.
 */

import { initialsOf } from '../lib/userTable.mjs';
import { Icon } from './Icon.jsx';

/**
 * Sections in sidebar order. `ready` turns on as each screen is built.
 *
 * @type {ReadonlyArray<{key: string, label: string, ready: boolean}>}
 */
export const SECTIONS = Object.freeze([
  { key: 'dashboard', label: 'Dashboard', ready: true },
  { key: 'users', label: 'Users', ready: true },
  { key: 'orders', label: 'Orders', ready: true },
  // Not in the mockups: categories and products, added ahead of the database.
  { key: 'catalog', label: 'Catalog', ready: true },
  { key: 'settings', label: 'Settings', ready: false },
]);

/**
 * Pick a navigation item's classes from its state.
 *
 * Written out in full per branch: Tailwind's scanner cannot see a class name
 * assembled from a variable.
 *
 * @param {boolean} isCurrent - Whether the item is the screen on show.
 * @returns {string} The item's state classes.
 */
function navItemClass(isCurrent) {
  return isCurrent
    ? 'bg-lpa-tint text-lpa-accent'
    : 'text-lpa-subtle hover:bg-lpa-track hover:text-lpa-ink aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent aria-disabled:hover:text-lpa-subtle';
}

/**
 * Render the sidebar and the current screen.
 *
 * @param {object} props - Component props.
 * @param {string} props.current - Key of the section on show, from SECTIONS.
 * @param {(key: string) => void} props.onNavigate - Called with a ready
 *   section's key when it is chosen.
 * @param {{name: string, role: string}} props.admin - The signed-in
 *   administrator.
 * @param {() => void} props.onSignOut - Called when the administrator signs out.
 * @param {React.ReactNode} props.children - The current screen.
 * @returns {JSX.Element} The two-column admin frame.
 */
export function AdminLayout({ current, onNavigate, admin, onSignOut, children }) {
  return (
    <div className="flex min-h-screen bg-lpa-canvas font-sans text-lpa-ink antialiased">
      <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col border-r border-lpa-line bg-lpa-surface px-4 py-6">
        <div className="mb-7 flex items-center gap-2.5 px-3 py-2">
          <div
            aria-hidden="true"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-lpa-ink font-display text-xs font-bold text-white"
          >
            LPA
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-bold">LPA Ecomms</span>
            <span className="text-[10px] tracking-[1px] text-lpa-subtle">ADMIN</span>
          </div>
        </div>

        <nav aria-label="Admin sections" className="flex flex-col gap-1">
          {SECTIONS.map(({ key, label, ready }) => {
            const isCurrent = key === current;
            return (
              <button
                key={key}
                type="button"
                // aria-disabled rather than disabled keeps the item focusable,
                // so a keyboard user still hears that the section exists.
                aria-disabled={!ready || undefined}
                aria-current={isCurrent ? 'page' : undefined}
                title={ready ? undefined : `${label} is coming soon`}
                onClick={() => ready && !isCurrent && onNavigate(key)}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-[11px] text-left text-sm font-semibold ${navItemClass(isCurrent)}`}
              >
                <Icon name={key} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 border-t border-lpa-line p-3">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-lpa-ink text-[11px] font-semibold text-white"
          >
            {initialsOf(admin.name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold">{admin.name}</div>
            <div className="text-[11px] text-lpa-subtle">{admin.role}</div>
          </div>
          {/* Not in the mockup, which has no way out of the session. */}
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-lpa-subtle hover:bg-lpa-track hover:text-lpa-ink"
          >
            <Icon name="signOut" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-12 py-9">{children}</main>
    </div>
  );
}
