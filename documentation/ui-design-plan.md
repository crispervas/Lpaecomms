# UI Design Plan — Customisable and Personalised Storefront

**Layer:** `cluster3-project/web` only.
**Status:** describes the interface as built on `feature/web-customisable-ui`. Every
element named here exists in the code cited beside it; nothing here describes a
control that is not implemented.

---

## 1. Purpose and audience

Lpaecomms is a desk-peripherals storefront rendered server-side with EJS. This
plan covers two reader-facing problems the interface was built to answer, each
served by a different mechanism:

1. **A reader who needs larger text or different colours to read the site
   comfortably.** The storefront ships one fixed palette and one fixed type
   size by default; some readers need more contrast, a dark surface, or larger
   type to use it at all. The site answers this with an explicit set of
   controls the reader operates: four colour themes and three text sizes.
2. **A reader who would rather not re-find a product they already looked at.**
   Nobody wants to re-run a search or re-browse a category for something they
   opened five minutes ago. The site answers this without asking anything of
   the reader: it remembers what was opened and surfaces it again, and infers
   a related interest from it.

Both problems are solved inside the same server-rendered pages mobile and
desktop do not share — see `CLAUDE.md`'s architecture note that no UI code
crosses platforms. Everything described below is web-only.

## 2. Customisation and personalisation

The design turns on one distinction, and every control in the interface
belongs to exactly one side of it:

| | Customisation | Personalisation |
| --- | --- | --- |
| Who decides | The visitor, explicitly | The system, from behaviour |
| What it covers | Colour theme, text size | "Recently viewed", "Picked for you" |
| Where it is chosen | `/preferences` page, header panel | Nowhere — there is no control |
| Where it is stored | `lpa_prefs` cookie | `lpa_recent` cookie |
| Governing files | `src/lib/preferences.js`, `src/config/preferences.js` | `src/lib/recentlyViewed.js`, `src/controllers/home.controller.js` |

A theme picker is customisation no matter how well it is built: the visitor
made the choice. A recommendation is personalisation only because nobody was
asked — `lpa_recent` is written automatically by
`src/controllers/productDetail.controller.js` every time a product page
renders, and no page offers a control to add to, edit, or clear it.

## 3. The four themes

Every theme is one `html[data-theme="..."]` block in
`styles/less/abstracts/_themes.less` that redeclares a set of CSS custom
properties; the raw hex values live in `styles/less/abstracts/_palette.less`,
the only file in the project allowed to contain one
(`tests/stylesheetTokens.test.js` enforces this). `daylight` has no block: it
is exactly what `:root` already publishes, so if every other part of this
feature were removed, the site would render exactly as it does today.

| Token | daylight | midnight | forest | contrast |
| --- | --- | --- | --- | --- |
| `--canvas` | `#FAFAF8` | `#0F1114` | `#FAFAF8` | `#FFFFFF` |
| `--surface` | `#FFFFFF` | `#171A1F` | `#FFFFFF` | `#FFFFFF` |
| `--subtle` | `#F1F0EC` | `#1E2227` | `#F1F0EC` | `#F2F2F2` |
| `--ink` | `#14161A` | `#EEF0F3` | `#14161A` | `#000000` |
| `--muted` | `#676B72` | `#A2A9B4` | `#676B72` | `#3A3A3A` |
| `--line` | `#E7E5DF` | `#2A2F36` | `#E7E5DF` | `#767676` |
| `--line-strong` | `#D8D6CF` | `#3A414A` | `#D8D6CF` | `#595959` |
| `--border-control` | `#8E8A7F` | `#6A7480` | `#8E8A7F` | `#000000` |
| `--accent` | `#2F5EFB` | `#7EA0FF` | `#176B4D` | `#0B2F9E` |
| `--accent-strong` | `#1F45D6` | `#A9C0FF` | `#0F5039` | `#061C63` |
| `--tint` | `#EEF1FF` | `#172038` | `#E8F4EE` | `#E8ECFF` |
| `--on-ink` | `#FFFFFF` | `#0F1114` | `#FFFFFF` | `#FFFFFF` |
| `--on-accent` | `#FFFFFF` | `#0B1020` | `#FFFFFF` | `#FFFFFF` |
| `--ink-hover` | `#000000` | `#FFFFFF` | `#000000` | `#1A1A1A` |

Feedback colours (danger, warning, success, and the four password-strength
steps) also carry a value per theme; they are omitted from the table above
because they answer to the same AA/AAA floor rather than illustrating a design
decision of their own.

**Rationale, theme by theme:**

- **daylight** — the storefront's original palette. It is the reference every
  other theme is checked against, and it needs no rationale of its own because
  it is what shipped before this feature existed.
- **midnight** — every surface inverts, so every token in the table above is
  restated. Because the accent turns light against a dark canvas, white text on
  it would disappear; this is why `--on-ink` and `--on-accent` exist as named
  roles rather than being written as `@white`/`@black` in the component rules —
  a theme can answer "what goes on top of this surface" for itself instead of a
  rule assuming a light background.
- **forest** — the surfaces are daylight's; only the accent family moves
  (`--accent`, `--accent-strong`, `--tint`, and the accent's 30%-opacity
  variant). It is deliberately the cheapest theme to add, to demonstrate that a
  variant does not require redesigning every surface.
- **contrast** — pure black text on pure white, and panels are told apart by a
  border rather than a fill (`--subtle` and `--surface` are nearly identical),
  which is the convention a high-contrast theme follows. It is the one theme
  held to AAA (7:1) rather than AA (4.5:1) for text.

**Contrast floor per theme:** `daylight`, `midnight` and `forest` are held to
WCAG 2.1 AA (4.5:1 for text, 3:1 for a border that identifies a control, per
1.4.11); `contrast` is held to AAA (7:1) for text, while its control borders
still answer to the same 3:1 — AAA has no separate non-text threshold.
`tests/themeContrast.test.js` computes every ratio in the compiled palette
against these floors for all four themes; see section 8.

## 4. The text scale

Three steps, selected by `html[data-text-size="..."]` in
`styles/less/base/_typography.less`:

| Step | Attribute value | `html { font-size }` |
| --- | --- | --- |
| Normal | `normal` (default) | `100%` |
| Large | `large` | `112.5%` |
| Larger | `larger` | `125%` |

**Why percentages, not pixels.** `html { font-size: 100% }` scales relative to
whatever the browser's own default is, rather than overwriting it with a fixed
value. A reader who has already raised their browser's default text size keeps
that as the baseline the site's own steps multiply from, instead of the site
silently resetting it to a fixed pixel value. `tests/textScale.test.js`
asserts that no `font-size` declaration anywhere in `styles/less/` is written
in `px`: every one is either `rem` (scaling with the root), `em` or
`inherit` (scaling with its parent), or the root's own `100%` — units that all
move when the root percentage changes, which is what lets raising it scale the
whole page rather than one rule silently sitting outside the scale.

**Why 125% is the ceiling.** The stylesheet's own comment
(`base/_typography.less`) states the reason: past 125%, the fixed header and
the product grid stop holding their shape. This was confirmed directly on
`/catalog` at the `1024px` container width: the primary navigation's tallest
link height goes 26px → 29px → 50px across the three steps as "Contact us"
wraps from one line to two at the largest step. There is **no page-level
horizontal overflow at any step** — `document.documentElement.scrollWidth`
equals `clientWidth` (1024px) at all three sizes. A fourth,
larger step was not added because avoiding that trade-off would require either
forcing the label onto one line (which the design rejected, since a
`white-space: nowrap` fix would widen the navigation instead of wrapping it —
trading a tidy wrap for the overflow the design forbids) or narrowing the
container, which changes the layout rather than the text. 125% is the last
step the implementation offers where the page stays usable, not the last step
where it stays tidy.

A related defect was found while confirming the above — not in the wrap
itself, but in the fixed header's own row, which briefly also exceeded its
1024px box at 125% because `.search`'s width grew in rem lockstep with the
text — and was fixed rather than documented as a trade-off; see the "header
row's search field" entry in `documentation/ui-personalisation-evidence.md`'s
Measured improvement section for the before/after numbers.

## 5. Information architecture

Two surfaces offer the same controls, built from one shared component,
`src/views/components/preferences/appearanceForm.ejs`:

- **`/preferences`** (`src/views/pages/preferences.ejs`,
  `src/controllers/preferences.controller.js`) is the full settings page. It
  is the only surface that works with no JavaScript at all: the form is a
  native `<form method="post" action="/preferences">`, and a submission is
  validated, stored in the `lpa_prefs` cookie, and answered with a `303`
  redirect back to where the visitor asked to return
  (`isSafeReturnPath` in `src/lib/preferences.js` restricts that return
  address to the site itself).
- **The header panel** (`src/views/partials/appearancePanel.ejs`) is a popover
  opened from a button in the site header. It wraps the identical form
  component and applies a choice to the page immediately — before the network
  round trip completes — using `src/public/js/appearance.js`, then persists it
  in the background with a `fetch` call the controller answers with a bare
  `204` rather than a redirect it would be pointless to follow.

**Why one component serves both.** `appearanceForm.ejs` is included by both
the page and the panel with no differences in the options it offers. One
definition of "what themes and sizes exist" means the two surfaces cannot drift
into offering different choices — a risk `tests/appearanceContract.test.js`
also guards from the other direction, by checking that the whitelist in
`src/lib/preferences.js` and the blocks the stylesheet actually renders name
the same themes and sizes. The one structural accommodation the sharing
requires is `idPrefix`: on the `/preferences` page, the page's own copy of the
form and the header panel's copy (which `layouts/base.ejs` includes on every
page) are both present in the same document at once, and `idPrefix` keeps
their radio input `id`s from colliding.

## 6. Interaction and states

- **Radio groups as a single tab stop.** Each theme and each text size is a
  radio input, not a button, inside one `<fieldset>`. A radio group is one stop
  in the tab order; the arrow keys move between its options. This follows the
  documented HTML/ARIA semantics of a native radio group — the specification's
  behaviour, not a result observed with actual assistive technology in this
  project — which is why it is listed as a documented-but-untested semantic
  rather than a measurement in section 8.
- **The inputs are off-screen, not hidden.** `.appearance__input` applies the
  project's `.visually-hidden()` mixin (clipped to a 1px box, not
  `display: none`), which keeps each input focusable and in the tab order while
  its associated `<label>` — styled as the visible card — carries the
  appearance.
- **Selected state.** `.appearance__input:checked + .appearance__option` gives
  the selected label an accent border and a tinted background
  (`styles/less/components/_appearance.less`).
- **Focus state.** `.appearance__input:focus-visible + .appearance__option`
  draws the focus ring on the visible label, not on the off-screen input,
  since a ring on an invisible element would not be seen.
- **Panel open and closed.** `.appearance-panel` is `display: none` by default;
  `src/public/js/appearance.js` toggles the `.is-open` state class on click,
  closes the panel on an outside click or <kbd>Escape</kbd>, and keeps
  `aria-expanded` on the toggle button in sync. The script writes only state
  attributes and state classes — `document.documentElement.dataset.theme`, the
  state classes above — never a colour or a layout value, matching the
  repository rule that browser scripts hold no styling of their own.
- **What happens with JavaScript disabled.** The `/preferences` page's own
  form works exactly as described above: no script is required for a
  submission to be validated, stored, and redirected. The header panel's
  behaviour is different: with no script to add `.is-open`, the panel stays
  `display: none` and the toggle button does nothing when clicked. The panel
  contains the only link to `/preferences` in the rendered page (there is no
  such link in the header's primary navigation, the mobile navigation, or the
  footer), so with JavaScript disabled a visitor who does not already know the
  URL has no way to discover the settings page from the interface itself. This
  is recorded as a known gap in `documentation/ui-personalisation-evidence.md`.

## 7. The personalisation model

`src/lib/recentlyViewed.js` and `src/controllers/home.controller.js` build two
blocks from one signal, with no visitor-facing control over either:

- **What is recorded.** Every time `src/controllers/productDetail.controller.js`
  renders a product page for an id that resolves, it records that id at the
  front of the `lpa_recent` cookie. Re-viewing a product moves it to the front
  rather than adding a second entry — the list is what a visitor is interested
  in, not a tally of clicks.
- **For how long.** The cookie is stored with the same one-year, `httpOnly`,
  `SameSite=Lax` attributes as the appearance cookie
  (`src/config/cookies.js`'s `persistentCookieOptions()`), so it survives
  browser restarts but never leaves the browser as a server-side record — there
  is no user account for it to belong to.
- **How much.** At most eight ids, newest first, each appearing once
  (`RECENT_LIMIT` in `src/lib/recentlyViewed.js`); reading the cookie also
  drops anything unreadable and de-duplicates before truncating, so a
  hand-edited or repeat-heavy cookie cannot crowd out the visitor's real
  history.
- **What is inferred from it.** `src/controllers/home.controller.js` resolves
  the recorded ids to products, finds the category that appears most often
  among them (ties favour the more recently viewed product), and asks the
  catalogue for other products in that category, excluding every product
  already in the history. This is the "Picked for you" block — an inference,
  not a replay, which is the distinction personalisation is built on.
- **What a visitor with no history sees.** Neither block renders. An empty
  "Picked for you" section would promise a service the system is not
  providing; the home page instead shows nothing where the blocks would be,
  the same way it shows nothing rather than an error when the mechanism that
  builds them fails.

## 8. Accessibility commitments

Every theme is held to WCAG 2.1 AA for text (4.5:1) and to WCAG 1.4.11's 3:1
for any border that identifies a control — a text input's outline, an outlined
button — with `contrast` held to AAA (7:1) for text on top of that. These
floors are not asserted; they are computed. `tests/themeContrast.test.js`
parses the raw values out of `styles/less/abstracts/_palette.less`, resolves
each theme's effective palette the same way the stylesheet does (a theme
overrides the tokens it names and inherits the rest from `:root`), and checks
the pairings enumerated in that file — 18 hand-maintained entries covering
body text, secondary text, link text, button labels, input borders, error
borders, and feedback messages — against the floor that theme answers to.
Every theme currently passes every listed pairing; section 8's floor is what a
change to any theme's palette is checked against going forward, not a
one-time measurement. The guarantee covers exactly those 18 combinations, not
every foreground-on-background combination the stylesheet can produce: a new
component rule that pairs an existing colour in a new way is not covered until
its pairing is added to the list.
