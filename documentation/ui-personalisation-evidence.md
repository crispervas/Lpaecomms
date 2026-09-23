# Personalisation and Customisation — Evidence

This document is the evidence for criteria 56 and 57 against
`documentation/ui-design-plan.md`. Every row and every number below was checked
against the code and the test suite on `feature/web-customisable-ui` while
writing this document; where a figure could not be verified, it is left out
rather than estimated.

---

## Alignment to the design plan (criterion 56)

One row per element the design plan describes, the file it lives in, and how to
see it working.

| Plan section | What was built | File | How to see it |
| --- | --- | --- | --- |
| 2. Customisation vs. personalisation | Two independent cookies: `lpa_prefs` for the visitor's choice, `lpa_recent` for recorded behaviour, with no shared code between them | `src/lib/preferences.js`, `src/lib/recentlyViewed.js` | Clear cookies and reload — `/preferences` still offers all four themes; opening a product still adds to `lpa_recent` regardless of the theme cookie |
| 3. The four themes | `html[data-theme]` blocks redeclaring the custom properties in the token table, with `daylight` as the attribute-less default | `styles/less/abstracts/_palette.less`, `styles/less/abstracts/_themes.less` | Pick a theme on `/preferences`; `<html data-theme="...">` changes and every surface repaints with no reload |
| 4. The text scale | Three `html[data-text-size]` rules scaling the root `font-size` in percent | `styles/less/base/_typography.less` | Pick "Larger" on `/preferences`; the whole page's type grows |
| 5. The `/preferences` page | The full settings page: a native form, server-side validation, `303` redirect on save | `src/views/pages/preferences.ejs`, `src/controllers/preferences.controller.js`, `src/routes/views/preferences.routes.js` | Disable JavaScript, visit `/preferences`, change a theme, submit — the choice persists on reload |
| 5. The header panel | A popover wrapping the same form; applies instantly, saves in the background | `src/views/partials/appearancePanel.ejs`, `src/public/js/appearance.js`, `styles/less/components/_appearance-panel.less` | Open the panel from the header (≥ 640px viewport), change a theme — it applies before the background save completes |
| 5. Shared form component | One form definition included by both surfaces, disambiguated by `idPrefix` | `src/views/components/preferences/appearanceForm.ejs` | View source on `/preferences`: two sets of ids (`theme-page-*`, `theme-panel-*`) for the same four options |
| 6. Radio groups as single tab stops | `.visually-hidden()` inputs behind styled `<label>`s | `styles/less/components/_appearance.less`, `styles/less/abstracts/_mixins.less` | Tab to the theme group; arrow keys move between the four options without leaving the group |
| 6. Selected and focus states | `:checked` and `:focus-visible` sibling selectors on the visible label | `styles/less/components/_appearance.less` | Tab through the options — the focused one shows a ring, the checked one shows an accent border and tint |
| 6. Panel open/closed | `.is-open` state class, `aria-expanded` kept in sync, closes on outside click or Escape | `src/public/js/appearance.js`, `styles/less/components/_appearance-panel.less` | Click the header toggle, then click elsewhere or press Escape — the panel closes both ways |
| 7. Recently viewed | Up to 8 product ids, newest first, deduplicated, written on every product view | `src/lib/recentlyViewed.js`, `src/controllers/productDetail.controller.js` | View several different products, then the home page — "Recently viewed" lists them newest first |
| 7. Picked for you | Dominant-category inference over the history, excluding products already seen | `src/controllers/home.controller.js`, `src/models/product.model.js` (`findByCategoryExcluding`) | View several products in one category, then the home page — "Picked for you" shows other products from it |
| 7. No history, no blocks | Neither section renders when the history cookie is absent or empty | `src/views/components/home/homeRecentlyViewed.ejs`, `src/controllers/home.controller.js` | Clear cookies, load the home page — neither "Recently viewed" nor "Picked for you" appears |
| 8. Accessibility floor per theme | Computed contrast ratios checked against AA (AAA for `contrast`) for every pairing the interface draws | `tests/themeContrast.test.js` | `node --test tests/themeContrast.test.js` — 72 assertions, all passing, across the four themes |

## Measured improvement (criterion 57)

### Three contrast defects, found by measuring the live palette

These were not visible defects — no theme looked broken — they were found by
computing WCAG 2.1 ratios against the values actually shipping in
`styles/less/abstracts/_palette.less`, and confirmed the same way here.

| Defect | Before | After | WCAG clause | Fix |
| --- | --- | --- | --- | --- |
| Secondary text on subtle panels | 4.43:1 | 4.69:1 | 1.4.3 (AA, 4.5:1) | `--muted` darkened to `#676B72` |
| Form input borders | 1.39:1 | 3.45:1 | 1.4.11 (3:1) | new `--border-control` token at `#8E8A7F` |
| Errored input borders | 2.77:1 | 3.48:1 | 1.4.11 (3:1) | `--danger-border` darkened to `#F05252` |

`--subtle` (`#F1F0EC`) is the background of the header search field, the login
panel, the About section and both error pages, so the first defect was not a
rare case. The comment above `@muted-value` in `_palette.less` records that
`--muted` had already been darkened once, checked against `--canvas` only
(4.83:1) and never against `--subtle`, where the old value measured the 4.43:1
above and failed. `--line-strong`, the token the second row's border used
before, is kept for its decorative use (the ghost numeral on the 404 page)
rather than raised, since brightening it there would be a regression, not a
fix — this is why the fix is a new token, `--border-control`, rather than a
change to the token already in use.

### Decisions examined and not acted on

A table where every row passes is weaker evidence than a record of the
judgement calls made along the way. Three were significant enough to record
here.

**The password strength meter's bars.** On `/mashup`, the four-segment strength
meter fills its segments with `--strength-1` through `--strength-4`
(`styles/less/abstracts/_palette.less`). At least three of the four colours
measure under 1.4.11's 3:1 against a white card in `daylight`. They were left
unchanged: `styles/less/pages/_mashup.less` marks the segment bar
`aria-hidden="true"`, and the strength label beside it
(`#mashup-strength-label`, written by `src/public/js/mashup-password.js`)
states the same level in words — "Strength: Weak", "Strength: Strong", and so
on — and that label's text colour does clear AA (`tests/themeContrast.test.js`
checks `strength-1-text` and `strength-4-text` against the surface for exactly
this reason). A graphical object that repeats information already available in
adjacent text is not required to meet a contrast minimum on its own colour;
`themeContrast.test.js`'s own header comment records this exclusion explicitly
rather than leaving it as a silent gap in coverage.

**`POST /preferences` has no CSRF protection.** A cross-site page could
auto-submit a form to this endpoint and change a visitor's theme without their
action; `SameSite=Lax` on the `lpa_prefs` cookie does not by itself guarantee a
cross-site POST is blocked in every case an implementer might assume. This was
weighed and accepted rather than fixed: the endpoint writes into a cookie that
carries two independently whitelisted fields — one of four themes and one of
three text sizes — and holds no session and no personal data
(`src/lib/preferences.js`'s `validatePreferences` rejects anything outside
`THEMES`/`TEXT_SIZES` before a cookie is ever set), reads nothing back to the
attacker, and the worst outcome is a visitor's colours changing, undone in two
clicks on `/preferences`. A CSRF token needs session state to bind itself to,
and this application deliberately has none —
`src/controllers/auth.controller.js` states plainly that there is no user
model, no password hashing and no session. Adding one to protect a colour
preference would mean building a session layer this project does not otherwise
need.

**The largest text size wraps the longest navigation label.** Measured directly
on `/catalog` at the `1024px` container width: across the three text-size
steps, the primary navigation's link height goes 26px → 29px → 50px as
"Contact us" wraps from one line to two at the largest step, while
`document.documentElement.scrollWidth` equals `clientWidth` (1024px) at every
step — there is no page-level horizontal overflow at any size. Forcing
`white-space: nowrap` on `.site-nav__link` was considered and rejected: with
the label unable to wrap, the navigation would have to widen instead, and by
this measurement the header is already at the width the container allows —
trading a two-line label for a possible horizontal scrollbar is the trade the
design exists to avoid. 125% was chosen as the last step where the page stays
usable, not the last step where it stays tidy. The wrap itself is unchanged by
the fix below: "Contact us" still goes from one line to two lines at 125%
(link height 26px → 29px → 50px, confirmed again after the fix) — that trade
is still made, and is still the right one for the reason above.

### The header row's search field, found overflowing and fixed

While measuring the wrap above, the fixed header's own row — not the page —
was found to overflow its box at 125%. `.search` (`styles/less/layout/_header.less`)
had a fixed `width: 14rem`, which grows in step with the root font size the same
way every other rem value does; unlike the nav label, nothing about a disabled,
"Coming soon" search field needs proportionally more room as text grows. At a
1024px viewport:

| | `.site-header__inner` scrollWidth | vs. clientWidth | Login link's right edge | vs. `innerWidth` |
| --- | --- | --- | --- | --- |
| Before, at 125% | 1052px | 1024px | ~1052px | 1024px |
| After, at 125% | 1024px | 1024px | 1004px | 1024px |

The fix: `.search` now takes `flex: 0 1 14rem; min-width: 6rem;` in place of
`width: 14rem`, so it shrinks to make room instead of pushing the row wider
than its container, while a floor keeps its icon and part of its placeholder
visible at every step. Measured after the fix, at a 1024px viewport across all
three text sizes, `.site-header__inner`'s `scrollWidth` equals its
`clientWidth` (1024px) at `normal`, `large` and `larger` alike, and the Login
link's right edge (1008px / 1006px / 1004px across the three steps) stays
inside `innerWidth` (1024px) at every step — the header no longer overflows
itself at any text size. Re-measured at a 1280px viewport for the same three
steps: unchanged behaviour, `.site-header__inner` still centres at its
`1024px` max-width with no overflow, confirming the fix does not regress the
case that already had room to spare. The `sm` breakpoint (640px) — where
`.site-tools` and `.site-nav` give way to the collapsed menu — was re-checked
at a 500px viewport and is unaffected by this change.

### Text scaling result

Confirmed directly on `/catalog` at the `1024px` container width, at each of
the three steps (`normal`, `large`, `larger`):

- **The header.** `@header-height` is expressed in `rem`
  (`styles/less/abstracts/_tokens.less`), so the fixed header bar grows with
  the type it contains rather than clipping it; this is what allows "Contact
  us" to wrap to two lines at 125% instead of being cut off.
- **The product grid.** The grid keeps its four columns at every step (`.lg()`
  in `styles/less/components/_product-grid.less` is a fixed-`px` breakpoint,
  unaffected by root font-size). Cards do not overflow horizontally; each
  card's measured height grows to fit its larger text — 298.5px → 335.8px →
  373.1px for the first catalog card in this check — while its width stays
  effectively unchanged, because the columns are `fr` units, not a fixed pixel
  size.
- **The content column.** `@container-width` is deliberately `1024px`, not
  `64rem` (`styles/less/abstracts/_tokens.less`'s comment explains why): a
  `rem` width would widen the column by a quarter at 125%, which changes the
  layout rather than the text. The measured container width does not move
  across the three steps.
- **The guard.** `tests/textScale.test.js` holds two things: that no
  `font-size` declaration anywhere in `styles/less/` is written in `px` (which
  would silently opt that rule out of the scale), and that the three
  `html`/`html[data-text-size]` rules compile to `100%`, `112.5%` and `125%`.

## Verification

The suite is run from `cluster3-project/web`:

```bash
pnpm test
```

**The Docker daemon was down for this run**, so `tests/health.test.js` cannot
fully pass — one of its two tests requires the database
(`GET /api/v1/health returns 200 and reports the database as connected`) and is
a pre-existing integration test unrelated to this feature. Run today, with
`pnpm build:css` run first:

```
ℹ tests 217
ℹ pass 216
ℹ fail 1
```

The one failure is exactly that database-dependent health check (`503` where
`200` was expected — the database is unreachable, not misbehaving). Excluding
it:

```bash
node --test $(ls tests/*.test.js | grep -v health)
```

```
ℹ tests 215
ℹ pass 215
ℹ fail 0
```

What each named file substantiates:

| Test file | Substantiates |
| --- | --- |
| `tests/themeContrast.test.js` | The three measured ratios above and every other pairing the interface draws, across all four themes (72 assertions) |
| `tests/textScale.test.js` | The three text-size steps compiling to the right percentages, and the absence of any `px` `font-size` in the stylesheet (2 assertions) |
| `tests/preferences.routes.test.js` | The `lpa_prefs` cookie's attributes, the theme/text-size whitelist rejecting an invalid value with `422`, the `returnTo` redirect guard, and the `204` background-save path (13 assertions) |
| `tests/personalisation.test.js` | The dominant-category inference, the empty-history case, and that a failure in either personalisation block never costs the home page its render (5 assertions) |
| `tests/stylesheetTokens.test.js` | The rule that every colour in the compiled stylesheet reaches a custom property — no literal colour escapes the token layer outside `:root` and the theme blocks (4 assertions) |
| `tests/appearanceContract.test.js` | That `THEMES`/`TEXT_SIZES` in `src/lib/preferences.js` name exactly the themes and sizes the stylesheet actually renders, in both directions (2 assertions) |

Three further test files exist from this plan but are not individually named
above because no claim in this document rests on them alone:
`tests/preferences.test.js` (the whitelist and cookie parsing/serialisation at
the unit level), `tests/cookies.test.js` (the `secure` flag and the other
cookie attributes), and `tests/recentlyViewed.test.js` and
`tests/recommendations.test.js` (the history list's ordering/dedupe/truncation
and the catalogue model's `findByIds`/`findByCategoryExcluding`, respectively —
the behaviour `personalisation.test.js` exercises at the controller level).

## Known gaps

An evidence document that hides its gaps is not evidence.

- **`findByCategoryExcluding`'s final `.slice(0, limit)` is correct but not
  covered by a test.** Deleting that line from
  `src/models/product.model.js` and re-running the suite leaves it green: the
  two existing tests both call it with an `excludeIds` set small enough that
  `listByCategory`'s own internal slice already caps the result before the
  final slice can act. In production, `excludeIds` is the visitor's whole
  history — up to eight ids spanning any category — while the call targets one
  dominant category, so most of those ids are usually absent from the fetched
  window and the final slice is the only thing holding the result to the
  limit. The consequence if it ever regressed is the "Picked for you" strip
  rendering more cards than intended — a visual overflow, not data loss or an
  error.
- **`/preferences` has no route to it that survives a narrow viewport or a
  disabled script.** The header's appearance toggle
  (`#appearance-toggle`/`.appearance-toggle`) is `display: none` below the
  `sm` (640px) breakpoint, and no link to `/preferences` exists anywhere else
  in the header's primary navigation, the collapsed mobile navigation
  (`#mobile-nav`), or the footer. On a wide viewport the gap is narrower but
  not closed: the only link to `/preferences` in the entire rendered page is
  the "Open the full settings page" link inside the panel itself
  (`src/views/partials/appearancePanel.ejs`), and that panel is `display: none`
  until `src/public/js/appearance.js` adds `.is-open` — a change only
  JavaScript makes. A visitor on a narrow viewport, or any visitor with
  JavaScript disabled, therefore has no way to discover `/preferences` from the
  interface itself; the page still works correctly for anyone who already has
  its URL.
