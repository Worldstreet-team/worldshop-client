# Shop → Platform Theme Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move WorldStreet Shop onto the Platform theme (near-black `#0B0B0F`, gold `#FFCC29`, Poppins + Public Sans) and polish Browse to best-in-class marketplace patterns (search-first header, sort, price filter, save-heart cards).

**Architecture:** The app is fully token-driven SCSS (`ws-*` classes reading `var(--ws-*)`), and the token mirror `src/styles/_tokens.scss` already ships a `[data-ws-theme="platform"]` block including font variables. So the recolor is one attribute flip in `index.html` plus a font-link swap; everything else is targeted feature work on Browse/Header/ListingCard and a visual sweep.

**Tech Stack:** React 18 + TypeScript + Vite, SCSS layers (`_tokens` → `_base` → `_ds` → `_marketplace`), zero-dependency mock API (`mock-api/`), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-08-03-platform-theme-restyle-design.md`

## Global Constraints

- No raw hex in components; only `var(--ws-*)` values. Sanctioned literals: rating-star orange `#F97316`, photo-overlay badge (`rgba(0,0,0,0.72)` + `#FFFFFF`), inbox unread count white-on-danger.
- Do NOT edit `src/styles/_tokens.scss` (generated mirror of `../design-tokens/tokens.css`).
- Icons are `lucide-react` only.
- Money/stats keep tabular numerals (`.ws-num`, existing `.ws-price`).
- Price formatting only via `priceLabel()` / `firstImage()` from `src/utils/listingFormat.ts`. `ON_REQUEST` ("Contact for price") is a legitimate value.
- Browse filter state lives in the URL; any filter change except paging resets `page` (the existing `setParam` handles this).
- Error handling convention: normalize with `toApiError(err, fallback)` (no new API error paths are added by this plan).
- No test runner exists. The automated gate for every task is `npm run build` (tsc + vite). Visual checks run against the mock: `npm run mock` (port 8787) + `npm run dev` (port 5173).
- Conventional Commits.

---

### Task 1: Theme flip — platform palette + fonts

**Files:**
- Modify: `index.html` (whole file is 33 lines)
- Modify: `src/styles/_ds.scss:32-34`, `:61` (stale font comments only)
- Modify: `src/components/marketplace/ListingCard.tsx:10-12` (stale comment only)

**Interfaces:**
- Produces: the app renders with `--ws-brand-primary: #FFCC29`, `--ws-bg-page: #0B0B0F`, `--ws-font-display: Poppins`, `--ws-font-ui: Public Sans`. All later tasks assume this theme is active.

- [ ] **Step 1: Flip the theme attribute and comment in `index.html`**

Replace lines 2–5:

```html
<!-- data-ws-theme selects the palette in src/styles/_tokens.scss. Shop ships
     on the Platform theme shared with Academy/Social/Vision/Arcade: near-black
     #0B0B0F + gold #FFCC29, Poppins + Public Sans. The legacy "shop" (espresso
     + coral) and "shop-light" (paper) modes remain in the token file. -->
<html lang="en" data-ws-theme="platform">
```

- [ ] **Step 2: Update `theme-color` meta**

Line 14: `content="#FAF9F5"` → `content="#0B0B0F"`.

- [ ] **Step 3: Swap the font link**

Replace lines 19–25 (comment + link; keep the two preconnect lines):

```html
  <!-- Platform theme pairing from the design system: Poppins display,
       Public Sans UI. Weights are exactly the ones the type ramp uses. -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Public+Sans:wght@400;500;600&display=swap"
    rel="stylesheet" />
```

- [ ] **Step 4: Update the `.ws-select` chevron color**

The chevron is a data-URI SVG that cannot read a CSS variable, so its stroke is
spelled out per theme (`_ds.scss` ~line 265, comment above it says to keep it in
sync). It currently encodes Shop Dark's `--ws-text-muted` `#ABA398`; platform's
is `#8E8E97`. In the `background-image` URL change `stroke='%23ABA398'` →
`stroke='%238E8E97'`, and update the comment sentence "this is text/muted for
Shop Dark, overridden below for Shop Light" → "this is text/muted for Platform,
overridden below for the legacy Shop Light mode".

- [ ] **Step 5: Fix stale font comments**

`src/styles/_ds.scss` — line 32-34 comment block: change to

```scss
// Platform resolves display → Poppins, ui → Public Sans (see _tokens.scss).
```

(delete the "Space Grotesk has no ExtraBold/SemiBold…" sentence). Line 61 comment: change to `// Price is a display-face moment: Poppins Bold 16.`

`src/components/marketplace/ListingCard.tsx` line 11: change "price Space Grotesk Bold 16" → "price display-face Bold 16".

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS (comments, one data-URI, and HTML only — this is a smoke check).

- [ ] **Step 7: Visual spot-check**

With `npm run mock` and `npm run dev` running, open `http://localhost:5173/`. Expected: near-black page, gold active category chip, gold-tinted filter pills, Poppins headings. No coral anywhere on Browse. (The `.ws-select` chevron must be visible on the dark surface — it already was on shop-dark; the `shop-light` override in `_ds.scss:269` is unused and stays.)

- [ ] **Step 8: Commit**

```bash
git add index.html src/styles/_ds.scss src/components/marketplace/ListingCard.tsx
git commit -m "feat(theme): move Shop onto the Platform theme (gold, Poppins/Public Sans)"
```

---

### Task 2: Header — gold Sell CTA, location scope inside the search pill

**Files:**
- Modify: `src/components/layout/Header.tsx:114-160`
- Modify: `src/styles/_marketplace.scss:164-188` (`.ws-topbar__location`)

**Interfaces:**
- Consumes: existing `setLocation(value)` and `submitSearch` handlers in Header.tsx (unchanged).
- Produces: markup where `.ws-topbar__location` lives inside `form.ws-search` as its trailing segment; the Sell link uses `ws-btn--primary`.

- [ ] **Step 1: Move the location select into the search form**

In `Header.tsx`, delete the `<label className="ws-chip ws-topbar__location">…</label>` block from `.ws-topbar__actions` (lines 126–136) and place it inside the search form, after the `<input>`:

```tsx
          <form className="ws-search ws-topbar__search" onSubmit={submitSearch} role="search">
            <Search size={18} aria-hidden />
            <input
              type="search"
              value={searchBox}
              onChange={(e) => setSearchBox(e.target.value)}
              placeholder="Search phones, cars, furniture…"
              aria-label="Search the marketplace"
            />
            <label className="ws-topbar__location">
              <MapPin size={16} aria-hidden />
              <select
                value={activeState}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Filter by location"
              >
                <option value="">All Nigeria</option>
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </form>
```

Note the `ws-chip` class is dropped from the label.

- [ ] **Step 2: Make Sell the gold primary CTA**

Line 157: `ws-btn--secondary` → `ws-btn--primary` (gold background, near-black text via `--ws-brand-on-primary`).

- [ ] **Step 3: Restyle `.ws-topbar__location` as a search-pill segment**

In `_marketplace.scss`, replace the `.ws-topbar__location` block (lines 164–188) with:

```scss
// The location scope lives inside the search pill (marketplace convention:
// one field answers "what, where"). A hairline separates it from the query.
.ws-topbar__location {
  display: none;
  align-items: center;
  gap: var(--ws-space-1);
  flex: none;
  padding-left: var(--ws-space-3);
  border-left: 1px solid var(--ws-border-hairline);
  color: var(--ws-text-muted);

  @media (min-width: $bp-md) { display: inline-flex; }

  svg { color: var(--ws-text-subtle); }

  select {
    appearance: none;
    border: 0;
    background: transparent;
    font-family: var(--ws-font-ui);
    font-weight: 500;
    font-size: 13px;
    color: inherit;
    cursor: pointer;
    max-width: 108px;
    &:focus { outline: none; }
  }

  &:focus-within { color: var(--ws-text-primary); }
}
```

- [ ] **Step 4: Build + visual check**

Run: `npm run build` → PASS. In the browser: one search pill containing query + "All Nigeria" segment; Sell is gold; picking a state from inside the pill still updates the URL (`?state=…`) and the Browse results.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/styles/_marketplace.scss
git commit -m "feat(header): gold Sell CTA, location scope inside the search pill"
```

---

### Task 3: Browse — sort select

**Files:**
- Modify: `src/pages/marketplace/Browse.tsx:43-48` (params), `:121-148` (query effect), `:264-285` (head row)
- Modify: `src/styles/_marketplace.scss` (`.ws-browse__head` area, after line ~200)

**Interfaces:**
- Consumes: mock `/listings` already honors `sort=price_asc|price_desc`, default newest (`mock-api/server.mjs:176-179`). Real backend must match.
- Produces: URL param `sort` (`''` = newest); it participates in `setParam` like every other filter.

- [ ] **Step 1: Read `sort` from the URL and send it**

After line 47 (`const page = …`) add:

```tsx
  const sort = params.get('sort') ?? '';
```

In the query effect (line ~125), after `if (search) query.search = search;` add:

```tsx
    if (sort) query.sort = sort;
```

and add `sort` to the effect dependency array (line 148).

- [ ] **Step 2: Add the select to the result header**

Wrap the existing filter-toggle button (lines 275–284) together with a new sort select in a controls div — replace the button with:

```tsx
            <div className="ws-browse__controls">
              <select
                className="ws-select ws-select--sm"
                value={sort}
                onChange={(e) => setParam({ sort: e.target.value || null })}
                aria-label="Sort listings"
              >
                <option value="">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>

              <button
                type="button"
                className="ws-btn ws-btn--sm ws-btn--secondary ws-browse__filtertoggle"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="browse-filters"
              >
                <SlidersHorizontal size={16} aria-hidden />
                Filters{activeTokens.length > 0 && ` (${activeTokens.length})`}
              </button>
            </div>
```

Sort deliberately does NOT get an active-filter pill: it narrows nothing, it only reorders.

- [ ] **Step 3: Styles**

In `_marketplace.scss` near the `.ws-browse__head` rules add:

```scss
.ws-browse__controls {
  display: flex;
  align-items: center;
  gap: var(--ws-space-2);
}
```

In `_ds.scss`, after the `.ws-select` block (starts line 255; `.ws-select` extends `.ws-field`, which sets height 52px and width 100% — both need overriding for an inline control):

```scss
// Compact select for inline controls (sort, per-page) rather than forms.
.ws-select--sm {
  height: 36px;
  width: auto;
  font-size: 13px;
  padding-block: 0;
}
```

- [ ] **Step 4: Build + verify**

`npm run build` → PASS. In the browser: pick "Price: low to high" → URL gains `?sort=price_asc`, order changes (mock sorts by `basePrice`), page resets to 1. Back button restores previous order.

- [ ] **Step 5: Commit**

```bash
git add src/pages/marketplace/Browse.tsx src/styles/_marketplace.scss src/styles/_ds.scss
git commit -m "feat(browse): sort select (newest, price asc/desc) wired to URL state"
```

---

### Task 4: Price-range filter (mock + rail + pill)

**Files:**
- Modify: `mock-api/server.mjs:152-183` (`GET /listings`)
- Modify: `src/pages/marketplace/Browse.tsx` (params, query effect, `activeTokens`, filter rail)
- Modify: `src/styles/_marketplace.scss` (filter rail styles, near `.ws-filters__group`)

**Interfaces:**
- Produces: URL params `minPrice` / `maxPrice` (naira integers); mock filters on them. **Real backend must implement the same params when it returns** (recorded in spec).

- [ ] **Step 1: Teach the mock to filter on price**

In `mock-api/server.mjs`, after the `attr.` loop (line ~174) and before the sort block, insert:

```js
  // Price range. A RANGE listing matches if [basePrice, maxPrice] overlaps the
  // requested window; ON_REQUEST listings have no price to compare, so any
  // price filter excludes them.
  const minPrice = q.minPrice ? Number(q.minPrice) : null;
  const maxPrice = q.maxPrice ? Number(q.maxPrice) : null;
  if (minPrice != null || maxPrice != null) {
    rows = rows.filter((l) => {
      if (l.basePrice == null) return false;
      const lo = l.basePrice;
      const hi = l.maxPrice ?? l.basePrice;
      if (minPrice != null && hi < minPrice) return false;
      if (maxPrice != null && lo > maxPrice) return false;
      return true;
    });
  }
```

- [ ] **Step 2: Verify the mock by hand**

Run: `curl "http://localhost:8787/api/v1/listings?minPrice=1000000&maxPrice=2000000"` (mock running).
Expected: only listings whose price window overlaps ₦1,000,000–₦2,000,000; no `ON_REQUEST` items.

- [ ] **Step 3: Read the params and send them in Browse**

In `Browse.tsx` after `const sort = …` add:

```tsx
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
```

In the query effect add (plus both names in the dependency array):

```tsx
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;
```

- [ ] **Step 4: Price group in the filter rail**

Local draft state so typing doesn't refetch per keystroke — commit on submit/blur. Add near the other `useState` calls:

```tsx
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  // Keep drafts in sync when the URL changes from elsewhere (pills, back button).
  useEffect(() => { setPriceDraft({ min: minPrice, max: maxPrice }); }, [minPrice, maxPrice]);
```

and a commit handler:

```tsx
  const applyPrice = () => {
    setParam({ minPrice: priceDraft.min.trim() || null, maxPrice: priceDraft.max.trim() || null });
  };
```

In the `filters` JSX, after the Condition group (line ~227), insert:

```tsx
      <div className="ws-filters__group">
        <span className="ws-filters__legend">Price (₦)</span>
        <form
          className="ws-pricerange"
          onSubmit={(e) => { e.preventDefault(); applyPrice(); }}
        >
          <input
            className="ws-field ws-num"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min"
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
            onBlur={applyPrice}
            aria-label="Minimum price"
          />
          <span aria-hidden>–</span>
          <input
            className="ws-field ws-num"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max"
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
            onBlur={applyPrice}
            aria-label="Maximum price"
          />
          {/* Hidden submit so Enter applies the range. */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </div>
```

(`.ws-field` is the DS text-field class, `_ds.scss:232` — height 52px, full width; `min-width: 0` in the SCSS below lets two share the rail's width.)

- [ ] **Step 5: Active-filter pill for price**

In `activeTokens` (line ~155), after the condition entry add:

```tsx
    if (minPrice || maxPrice) {
      const fmt = (v: string) => `₦${Number(v).toLocaleString('en-NG')}`;
      const label =
        minPrice && maxPrice ? `${fmt(minPrice)} – ${fmt(maxPrice)}`
        : minPrice ? `From ${fmt(minPrice)}`
        : `Under ${fmt(maxPrice)}`;
      out.push({ key: 'price', label, clear: () => setParam({ minPrice: null, maxPrice: null }) });
    }
```

Add `minPrice, maxPrice` to the memo dependency array.

- [ ] **Step 6: Styles**

In `_marketplace.scss`, near the `.ws-filters__group` rules:

```scss
.ws-pricerange {
  display: flex;
  align-items: center;
  gap: var(--ws-space-2);
  color: var(--ws-text-subtle);

  input { min-width: 0; }
  // Spinners fight the compact rail width.
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { appearance: none; margin: 0; }
  input[type='number'] { -moz-appearance: textfield; }
}
```

- [ ] **Step 7: Build + verify**

`npm run build` → PASS. Browser: set Min 1000000 / Max 2000000 → URL carries both, results narrow, a `₦1,000,000 – ₦2,000,000` pill appears; clicking its × clears both fields and refetches; "Contact for price" listings drop out while a price filter is set.

- [ ] **Step 8: Commit**

```bash
git add mock-api/server.mjs src/pages/marketplace/Browse.tsx src/styles/_marketplace.scss
git commit -m "feat(browse): price-range filter (URL-backed, mock support, filter pill)"
```

---

### Task 5: ListingCard — price-first hierarchy, save-heart, hover lift

**Files:**
- Create: `src/utils/savedListings.ts`
- Modify: `src/components/marketplace/ListingCard.tsx`
- Modify: `src/styles/_marketplace.scss` (`.ws-pcard` block — grep `ws-pcard` for its location)

**Interfaces:**
- Produces: `savedListings.has(id: string): boolean`, `savedListings.toggle(id: string): boolean` (returns new saved state). localStorage-backed, key `ws:saved-listings`, value JSON string array. No backend, per spec.

- [ ] **Step 1: Saved-listings util**

Create `src/utils/savedListings.ts`:

```ts
/**
 * Local-only saved listings. The spec keeps hearts optimistic/local until a
 * backend exists, so this is a plain localStorage set — no store, no events.
 * A failed read (private mode, quota) degrades to "nothing saved".
 */
const KEY = 'ws:saved-listings';

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export const savedListings = {
  has(id: string): boolean {
    return read().has(id);
  },
  toggle(id: string): boolean {
    const set = read();
    const nowSaved = !set.has(id);
    if (nowSaved) set.add(id);
    else set.delete(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch {
      // Storage unavailable: the heart still toggles for this render.
    }
    return nowSaved;
  },
};
```

- [ ] **Step 2: Card — heart + price-first body**

Rewrite the body of `ListingCard.tsx` (keep the doc comment, imports get `Heart` from lucide and `useState` from react):

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff, MapPin, Star } from 'lucide-react';
import type { Listing, PublicStore } from '@/services/storeService';
import { firstImage, priceLabel } from '@/utils/listingFormat';
import { savedListings } from '@/utils/savedListings';
```

Inside the component add:

```tsx
  const [saved, setSaved] = useState(() => savedListings.has(listing.id));
```

In the media div, after the badges block, add the heart (it sits inside a `<Link>`, so it must suppress navigation):

```tsx
          <button
            type="button"
            className={`ws-pcard__save${saved ? ' is-saved' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved(savedListings.toggle(listing.id));
            }}
          >
            <Heart size={16} aria-hidden />
          </button>
```

In the body, swap title and price so price leads:

```tsx
        <div className="ws-pcard__body">
          <div className="ws-price">{priceLabel(listing)}</div>
          <h3 className="ws-pcard__title">{listing.name}</h3>
```

(location and seller lines unchanged below).

- [ ] **Step 3: Card styles — heart, hover lift**

In `_marketplace.scss` inside/next to the `.ws-pcard` block add:

```scss
// Save-heart: revealed on hover (always visible once saved, and on touch
// devices where hover doesn't exist).
.ws-pcard__save {
  position: absolute;
  top: var(--ws-space-2);
  right: var(--ws-space-2);
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--ws-radius-pill);
  // Sits on photography — theme-independent, same rule as .ws-badge--ink.
  background: rgba(0, 0, 0, 0.55);
  color: #FFFFFF;
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease, background-color 120ms ease;

  @media (hover: none) { opacity: 1; }

  &:hover { background: rgba(0, 0, 0, 0.75); }

  &.is-saved {
    opacity: 1;
    color: var(--ws-brand-primary);
    svg { fill: currentColor; }
  }
}

.ws-plink:hover .ws-pcard__save,
.ws-pcard__save:focus-visible { opacity: 1; }
```

(The card's hover scope is the `.ws-plink` link wrapper, not `.ws-pcard` itself — match the existing pattern at `_marketplace.scss:334`.)

Then amend the existing `.ws-pcard` hover (`_marketplace.scss:323-338`). It currently lightens the background and firms the border with `--ws-text-subtle`, under a "Never scale" comment. Keep the no-scale rule; add a translate lift and swap the border firm-up to a gold tint — replace the hover block with:

```scss
  // Hover lifts 2px (translate, never scale) onto the raised step with a
  // faint brand tint on the border.
  .ws-plink:hover & {
    background: var(--ws-bg-raised);
    border-color: color-mix(in srgb, var(--ws-brand-primary) 33%, var(--ws-border-hairline));
    transform: translateY(-2px);
  }
```

and extend the card's `transition` list (line 331) to `transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;`.

`.ws-pcard__media` already has `position: relative` (`_marketplace.scss:340`), so the heart anchors without changes.

- [ ] **Step 4: Build + verify**

`npm run build` → PASS. Browser: hover a card → slight lift, gold-tinted border, heart fades in; click heart → fills gold, stays visible, card does NOT navigate; reload → still saved. Click elsewhere on card → navigates to the listing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/savedListings.ts src/components/marketplace/ListingCard.tsx src/styles/_marketplace.scss
git commit -m "feat(cards): price-first hierarchy, local save-heart, hover lift"
```

---

### Task 6: Collapsible filter groups

**Files:**
- Modify: `src/pages/marketplace/Browse.tsx:169-251` (the `filters` JSX)
- Modify: `src/styles/_marketplace.scss` (`.ws-filters__group` / `.ws-filters__legend` — grep for location)

**Interfaces:**
- Produces: each filter group is a native `<details open>` with a `<summary>` legend. No state, no JS.

- [ ] **Step 1: Convert groups to `<details>`**

In the `filters` JSX, change every

```tsx
      <div className="ws-filters__group">
        <span className="ws-filters__legend">Category</span>
```

to

```tsx
      <details className="ws-filters__group" open>
        <summary className="ws-filters__legend">Category</summary>
```

with matching `</details>` closers. Apply to all five: Category, Location, Condition, Price (from Task 4), and the mapped attribute facets.

- [ ] **Step 2: Style the summary**

In `_marketplace.scss`, extend the legend rule (merge with what exists):

```scss
.ws-filters__legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  list-style: none;
  &::-webkit-details-marker { display: none; }

  // Chevron flips when the group is closed.
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-right: 1.5px solid var(--ws-text-subtle);
    border-bottom: 1.5px solid var(--ws-text-subtle);
    transform: rotate(45deg);
    transition: transform 120ms ease;
  }
}

details:not([open]) > .ws-filters__legend::after { transform: rotate(-45deg); }
```

- [ ] **Step 3: Build + verify**

`npm run build` → PASS. Browser: each group collapses/expands; all open by default; selects inside still work; keyboard (Enter/Space on summary) toggles.

- [ ] **Step 4: Commit**

```bash
git add src/pages/marketplace/Browse.tsx src/styles/_marketplace.scss
git commit -m "feat(browse): collapsible filter groups"
```

---

### Task 7: Full-app sweep + docs

**Files:**
- Possibly modify: any `src/**` file with a theme straggler found in Step 1/2
- Modify: `CLAUDE.md` (this repo, "Styling" section)
- Modify: `../CLAUDE.md` (workspace — platform modes table + "For web app sessions" bullet)
- Modify: `../design-system/README.md` (which-theme-per-app note)

**Interfaces:** none — verification and documentation.

- [ ] **Step 1: Grep for stragglers**

```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src --include=*.tsx --include=*.scss | grep -vi "F97316" | grep -v _tokens.scss
grep -rn "Space Grotesk\|shop-light\|espresso\|coral\|#F0502F" src --include=*.tsx --include=*.scss | grep -v _tokens.scss
```

Expected survivors only: the sanctioned literals (`.ws-badge--ink` white, inbox count white, `.ws-pcard__save` overlay, scrim), `_ds.scss`'s `[data-ws-theme='shop-light']` chevron override (kept deliberately — the mode still exists in tokens), and `_tokens.scss` itself. Fix anything else to a `var(--ws-*)` value. Also check `src/components/common/VoiceButton.scss`.

- [ ] **Step 2: Visual pass over every surface**

With mock + dev running, walk: `/` (browse, filters, sort, pills, cards, pagination, skeletons — throttle network to see them), a listing detail, a store page, `/login`, `/register`, `/account`, `/account/messages`, `/vendor` (needs a signed-in Clerk user; if unavailable this session, note it in the commit message rather than skipping silently), `/admin` likewise, the mobile drawer (narrow viewport), and the empty state (`/listings?search=zzzzz`). Everything should sit on the near-black ladder with gold accents; fix stragglers as they appear (token substitutions only, no structural edits).

- [ ] **Step 3: Update this repo's `CLAUDE.md`**

In the "Styling" section: replace the "Shop is dark-first…espresso…coral…Space Grotesk/Inter" paragraph with the platform-theme facts: `data-ws-theme="platform"` on `<html>`, page `#0B0B0F` / surface `#15151A`, gold `#FFCC29`, Poppins + Public Sans, and note that `shop`/`shop-light` remain in the token file as legacy modes. Update the `shop-light` chevron sentence to say the override is legacy. Update the "Design tokens (canonical)" bullet that says Shop uses `data-ws-theme="shop"`.

- [ ] **Step 4: Update workspace docs**

`../CLAUDE.md`: in the platform-modes table, move Shop into the **Platform** row (`Academy · Social · Vision · Arcade · Shop`) and mark the **Shop** / **Shop Light** rows as legacy/opt-in; update the "For web app sessions" bullet `Social/Academy → "platform"; Shop → "shop"` to `Social/Academy/Shop → "platform"`, and the fonts bullet (Shop no longer uses Space Grotesk/Inter — that pairing stays for Xstream only).

`../design-system/README.md`: update the which-theme-each-app-uses line for Shop the same way. (These are sibling-repo files — commit them in the workspace repo if it is one, otherwise just save; check `git -C .. rev-parse --git-dir` first.)

- [ ] **Step 5: Final gate**

Run: `npm run build` and `npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add -A CLAUDE.md src
git commit -m "chore(theme): sweep remaining surfaces onto platform tokens, update docs"
```

(Workspace-level doc files are outside this repo — handle per Step 4's note.)

---

## Memory update

After completion, update the auto-memory file `shop-dark-theme-default.md` (it says `data-ws-theme="shop"` = espresso dark is the default — now stale) to record that Shop ships on `data-ws-theme="platform"`.
