# Shop → Platform theme restyle, best-in-class marketplace layout

**Date:** 2026-08-03
**Status:** Approved (design), pending implementation plan

## Goal

WorldStreet Shop must read as the same brand as the other WorldStreet web apps
(Academy, Social, Vision, Arcade). Those apps use the **Platform** theme — page
`#0B0B0F`, surface `#15151A`, gold `#FFCC29` accent, Poppins (display) + Public
Sans (UI). Shop currently uses its own espresso + coral mode.

The *palette and type* come from the design system's Platform mode. The *layout*
does **not** copy Academy's dashboard shell; it follows current best-in-class
ecommerce/marketplace patterns (search-centric top nav, filter rail, rich card
grid — the Amazon/Etsy/Jiji/Facebook-Marketplace family), which is the structure
Shop already has.

## 1. Theme switch (foundation)

- `index.html`: `data-ws-theme="shop"` → `data-ws-theme="platform"`. Update the
  explanatory comment.
- `index.html`: replace the Google Fonts link (Space Grotesk + Inter) with
  **Poppins** (display, weights 500/600/700) + **Public Sans** (UI, weights
  400/500/600).
- No token edits: `src/styles/_tokens.scss` (mirror of
  `../design-tokens/tokens.css`) already contains the `[data-ws-theme="platform"]`
  block including `--ws-font-display: Poppins` / `--ws-font-ui: Public Sans`.
- Sweep `_ds.scss` and `_marketplace.scss` for shop-mode assumptions:
  - the `[data-ws-theme='shop-light']` chevron override (`.ws-select`) — keep,
    but verify the default chevron works on platform surfaces;
  - any literal coral / espresso hexes or shop-specific font references;
  - the sanctioned literals (rating-star orange `#F97316`, photo scrim) stay.
- Money and stats keep tabular numerals (`.ws-num`).

## 2. Header — search-first

Sticky topbar, one row: logo · large centered search field with the location
scope ("All Nigeria") integrated into it · Messages icon · **Sell** as the gold
CTA (gold background, near-black text — the page's one solid-gold element) ·
avatar/account.

Below it the category chip row remains: neutral chips on surface, the active
chip gets gold text on a ~13% gold wash (the Academy active-nav treatment).
Coral pill styling is removed.

## 3. Browse page

- **Filter rail (left, desktop):** category, location, condition as today, plus
  a price-range (min/max) control. Groups are collapsible. Facet behavior
  unchanged (attributes appear only under a selected subcategory; state stays in
  the URL). *Note:* the mock API does not yet filter on price — add
  `minPrice`/`maxPrice` handling to `mock-api/server.mjs` (a few lines), and the
  real backend needs the same params when it returns.
- **Applied-filter pills:** Browse already derives removable × pills from the
  URL params — restyle them and extend to the new price filter; no new state
  model.
- **Result header:** title + listing count on the left, a **Sort** select
  (Newest, Price low→high, Price high→low) on the right. The mock's `/listings`
  route already honors `sort=price_asc|price_desc` (default newest) — the client
  just starts sending it from the URL state.
- **Listing cards:** image with condition badge as an overlay chip and a
  save-heart appearing on hover (optimistic/local only — no backend); below:
  price as the strongest line (white, tabular), title one line with ellipsis,
  location + seller name + rating muted. Subtle hairline border; hover lifts the
  card with a faint gold-tinted border. `priceLabel()` / `firstImage()` from
  `utils/listingFormat.ts` remain the formatting path; "Contact for price" is a
  first-class value.
- Skeletons, pagination, and empty states restyled to the platform tokens.

## 4. Remaining surfaces — token sweep only

Listing detail, store page, chat/inbox, auth pages, account, vendor and admin
layouts: recolor onto platform tokens so nothing is left coral/espresso, but no
structural redesign in this pass.

## Out of scope

- No new backend features (saved listings persist only locally, if at all).
- No cart/checkout/order resurrection — Shop stays a classifieds marketplace.
- No Tailwind; SCSS layers stay as they are.
- No structural redesign of vendor/admin/detail pages.

## Ecosystem consequence

The workspace docs (`../CLAUDE.md`, `design-system/` notes) currently assign
Shop the espresso + coral mode. Per the workspace convention (change the system
first, then the app), update those docs to record that Shop now ships on the
Platform theme; the Shop / Shop Light token modes remain in the token package
as legacy/opt-in until removed upstream.

## Error handling & testing

- No behavioral surface changes to the API layer; error paths untouched.
- Gate: `npm run build` (tsc + vite) — the repo has no test runner.
- Visual verification against the mock API (`npm run mock` + `npm run dev`),
  checking Browse, listing detail, store, inbox, auth, vendor dashboard in the
  new theme.
