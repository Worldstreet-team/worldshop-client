# worldshop-client

React + TypeScript + Vite SPA. The **Shop** platform of the WorldStreet ecosystem — a
classifieds-style **marketplace**, not a webshop.

Workspace-level notes (design system, ecosystem map) live in `../CLAUDE.md`. This file
covers only what is specific to this repo.

## Commands

```bash
npm run dev       # Vite dev server → http://localhost:5173
npm run mock      # Local mock API  → http://localhost:8787/api/v1  (see "Backend" below)
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # serve the production build
```

There is no test runner and no test files in the repo. `npm run build` (which typechecks
via `tsc -b`) is the only automated gate.

## Running it locally

Two processes. Start the mock first, then Vite:

```bash
npm run mock      # terminal 1
npm run dev       # terminal 2
```

`.env.local` already points `VITE_API_BASE_URL` at the mock. It is gitignored (`*.local`),
so local config never lands in a commit.

## Backend

**The real API is offline.** Both `shop-api.worldstreetgold.com` and
`api.worldstreetgold.com` return `503 "This service has been suspended"` (header
`x-render-routing: suspend` — the Render services are suspended, not sleeping). Nothing in
the client is wrong when every page shows empty state; check the API before debugging.

`mock-api/` stands in for it — zero dependencies, node builtins only:

- `mock-api/server.mjs` — ~56 routes, matched top-to-bottom so literal segments must be
  registered before `:param` ones (`/stores/plans` and `/stores/me/*` before `/stores/:slug`).
- `mock-api/data.mjs` — seed data. Shapes are copied from the client's own types, so
  anything a page destructures exists.
- Unhandled routes log `⚠ unhandled` and return an empty-but-well-formed envelope rather
  than erroring, so a missing handler degrades one section instead of crashing a page.
- Writes (send a message, publish a listing, edit profile) persist in memory until restart.
- `mock-api/images/` holds 26 real CC-licensed product photos (~2.4 MB), served at
  `/images/<file>.jpg`. They came from Wikimedia Commons (branded goods — phones, laptops,
  cars) and Openverse (generic goods — furniture, clothing), and **each one was checked by
  eye against the product it is attached to**. That check matters: a keyword photo service
  returned a shopfront for "iPhone" and a shoe for "JBL speaker".
- Each listing carries exactly one photo. Padding the gallery would mean showing a
  different product under the same title.
- Records with no photo fall back to a generated SVG at `/img/*.svg`, so nothing 404s.
- To re-point a listing at a different photo, change its `photoFile` in `data.mjs`.
- `MOCK_LATENCY=0 npm run mock` removes the artificial 120ms delay; `PORT=9000` moves it.

When the real backend returns, delete `VITE_API_BASE_URL` from `.env.local`.

## Environment

Vite only exposes `VITE_`-prefixed vars, **and every one is bundled into client JS** — never
put a secret in any of them. `.env.example` documents all of them.

| Var | Notes |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Required** — `src/main.tsx` throws at boot without it |
| `VITE_API_BASE_URL` | Falls back to `http://localhost:3000/api` |
| `VITE_AUTH_SERVICE_URL` / `VITE_LOGIN_URL` / `VITE_REGISTER_URL` | Legacy external-auth redirects |
| `VITE_OPENAI_API_KEY` | Optional voice agent. Leaving it blank only disables `VoiceButton` |

Note: `.env` is **tracked by git**. Put local values in `.env.local` (gitignored, and Vite
loads it after `.env` so it wins).

## Architecture

```
src/
  router/index.tsx     all routes, lazy-loaded, wrapped in <SuspenseWrapper>
  layouts/             MainLayout · AuthLayout · VendorLayout · AdminLayout
  pages/               marketplace/ account/ vendor/ admin/ auth/
  components/          auth/ chat/ common/ layout/ marketplace/ ui/
  services/            one module per API domain; all go through services/api.ts
  store/               zustand: authStore (persisted) · categoryStore · uiStore
  types/               shared interfaces; mirror the backend Prisma fields directly
  styles/              SCSS partials, all imported by main.scss
```

`@/` is aliased to `src/` (`vite.config.ts` + `tsconfig.app.json`).

### It is a marketplace, not a shop

The product pivoted. Buying flows are **gone** — there is no cart, checkout, order, or
payment. The root route `/` renders `Browse`. Sales move off-platform; what the product
provides is discovery plus buyer↔vendor chat.

Legacy ecommerce URLs (`/cart`, `/checkout/*`, `/products/:slug`, `/category/:slug`,
`/search`) redirect to `/listings`; `/store/:slug` → `/stores/:slug`. Removed vendor/admin
pages fall through a `*` route to their dashboard rather than a route error.

Dead weight still in the tree: cart/order/download types, `userService` wishlist calls, and
the order/inventory/withdrawal half of `adminService`. They are unreferenced by the router.
Do not build on them without checking they are still wanted.

### Auth

Clerk (`@clerk/clerk-react`) is the live path — `ClerkProvider` in `main.tsx`, and
`ClerkTokenProvider` hands Clerk's `getToken` to the axios layer via `setClerkTokenGetter`.
This app is a Clerk **satellite** of `worldstreetgold.com`.

`services/externalAuthService.ts` and the `VITE_LOGIN_URL` redirects are the older
identity-hub path, still wired but pointing at a suspended service.

Route gates:
- `ProtectedRoute` — signed in.
- `AdminRoute` — `user.role === 'ADMIN'` from `authStore`.
- `VendorRoute` — **fetches `GET /stores/me`**. Owning a store is what makes someone a
  seller; the legacy `isVendor` profile flag is no longer set for anyone. 404 → redirect to
  `/vendor/register`. `BANNED`/`SUSPENDED` render their own states.

So `/vendor/*` and `/admin/*` need a signed-in Clerk user — they are not reachable
anonymously even with the mock running.

### API layer

Every service calls the shared `api` helper in `services/api.ts`. Two things it does that
callers depend on:

1. **The response interceptor rejects with a flat object, not an axios error.** `err.response`
   never exists on what a `catch` block receives. Always normalize with `toApiError(err, fallback)`
   and read `{ message, statusCode, errors }`. This is the established convention across the
   marketplace, vendor, and admin components — match it.
2. **`FormData` requests get their `Content-Type` deleted.** Axios v1 would otherwise
   serialize the FormData to JSON via `formDataToJSON()` and silently drop the files.

Response envelopes are not uniform — check the service's declared type:
- `ApiResponse<T>` → `{ success, data }`
- lists → `{ success, data: T[], pagination }`
- review/conversation lists add `meta` (`ReviewSummary` / `{ unreadTotal }`)

On a 401 the interceptor retries **once** with a fresh Clerk token before rejecting with
"Session expired."

### Listings

- Price is three-state: `FIXED`, `RANGE`, or `ON_REQUEST`. "Contact for price" is a
  legitimate value, not missing data. Use `priceLabel()` / `firstImage()` from
  `utils/listingFormat.ts` rather than formatting inline.
- `attributes` (admin-defined, controlled vocabulary) drive browse facets.
  `customFields` (vendor-invented free text) are display-only and never filterable.
- Browse keeps **all filter state in the URL** so a filtered result set survives sharing,
  bookmarking, and the back button. Attribute facets only appear once a *subcategory* is
  selected, since attributes are defined per category.

## Conventions

- Comments explain **why**, not what — see `services/api.ts` and `router/index.tsx`. Match
  that bar: document the non-obvious constraint, skip the narration.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `style:`, `chore:`).
- Icons are **`lucide-react`**, everywhere. Material Icons and Open Sans were removed with
  the Electro layer; a bare `<span className="material-icons">` will render literal
  ligature text like `search_off`.

## Styling

Four SCSS layers, in `main.scss` order. Nothing else exists:

| Layer | File | What it owns |
|---|---|---|
| tokens | `_tokens.scss` | the semantic variables, per `data-ws-theme`. **Generated — do not hand-edit** |
| base | `_base.scss` | reset + element defaults, all token-driven |
| ds | `_ds.scss` | the design-system components, `ws-*`, specs 1:1 from `design-system/04-components.md` |
| marketplace | `_marketplace.scss` | marketplace-specific compositions built on ds |

Every screen is on `ws-*`. The Electro partials (`_components`, `_pages`, `_product`,
`_orders`, `_layout`, `_vendor`, `_admin`, `_variables`, `_mixins` — ~12.9k lines) were
deleted; they hardcoded the old light palette and could not survive the dark theme.

Inline `style={{}}` is used for one-off layout (gaps, widths, grid spans) and always with
`var(--ws-*)` values. **A raw hex in a component is a bug** — the only sanctioned literals
are things that sit on photography or are theme-independent by definition (the rating-star
orange `#F97316`, the scrim over listing photos), and each is commented where it appears.

To refresh tokens after a design-system change:

```bash
cp ../design-tokens/tokens.css src/styles/_tokens.scss   # then re-add the header comment
```

### Design tokens (canonical)

Do **not** invent palettes. Per `../CLAUDE.md`, the source of truth is the workspace token
files, mirrored into `src/styles/_tokens.scss` so this app stays deployable on its own:

- `../design-tokens/tokens.css` — CSS variables, 6 modes selected by
  `data-ws-theme="shell|platform|platform-light|shop|shop-light|xstream"`.
  **Shop uses `data-ws-theme="platform"`, set on `<html>` in `index.html`.**
  Users can switch to `platform-light` via the header toggle; the choice
  persists in localStorage (`ws:theme`) and an inline script in `index.html`
  applies it before first paint. Runtime toggling lives in `src/utils/theme.ts`
  — keep the two in sync.
- `../design-tokens/tailwind.preset.cjs` — semantic classes (`bg-page`, `bg-surface`,
  `text-primary`, `text-muted`, `bg-brand`, `border-hairline`, `rounded-lg` = 10px).

**Shop ships on the Platform theme as of 2026-08-03** — the same mode as
Academy/Social/Vision/Arcade, so the ecosystem's web apps read as one brand: page
`#0B0B0F` → sunken `#08080A` → surface `#15151A` → raised `#1F1F26`, ink `#FAFAFA`, gold
`#FFCC29` as brand. Fonts are **Poppins** (display) + **Public Sans** (UI). Money and
stats always use tabular numerals (`.ws-num`).

The legacy `shop` (espresso + coral) and `shop-light` (paper) modes remain in the token
file but nothing in the app selects them. `_ds.scss` still carries a
`[data-ws-theme='shop-light']` override for the one thing that cannot read a CSS variable
(the `.ws-select` chevron, a data-URI SVG); the default chevron stroke is Platform's
text/muted `#8E8E97` — keep both in sync if the palette moves.

The desktop reference screen is **"Shop Browse"** on the Figma page *Screens / Web* — follow
its layout and density; the palette there predates the move to Platform.

Note: Tailwind is **not currently installed here**, so the preset is aspirational until
someone wires it up; `tokens.css` can be imported as-is.

## Deploy

Vercel, SPA rewrite in `vercel.json` (`/(.*)` → `/index.html`). `nixpacks.toml` exists for
a Nixpacks builder. `mock-api/` is dev-only — never point a deployed build at it.

## Gotchas

- `src/main.tsx` listens for Vite's `vite:preloadError` and reloads once (guarded by
  `sessionStorage`) so a stale tab after a deploy recovers from a missing lazy chunk.
- `src/data/mockData.json` is old fixture data, unrelated to `mock-api/`.
- `README.md` is stale — it describes the pre-pivot ecommerce app (cart, checkout, orders,
  React Query) and lists dependencies that are not installed. Trust this file over it.
