# Changelog

All notable changes to worldshop-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.33.0] - 2026-07-27

### Removed — The ecommerce buyer surface

The last pre-pivot territory in the client. **Eighteen pages deleted**: Home,
ProductListing, ProductDetail, Category, Categories, SearchResults, Store
(legacy), Cart, Checkout + its four outcome pages, MockPayment, and
account/{OrderHistory, OrderDetail, Addresses, Wishlist, Downloads}.

- **`/` is now the marketplace.** The browse page renders at the root — the
  marketplace is the site, not a feature of it
- Legacy URLs redirect rather than 404: `/products`, `/category/:slug`,
  `/categories`, `/search`, `/cart`, `/checkout/*` → `/listings`;
  `/store/:slug` → `/stores/:slug` keeping the slug, since the store backfill
  preserved it
- **Header rewritten**: cart button, wishlist badge and sale tabs removed;
  search feeds `/listings?search=`; a Messages icon appears when signed in; nav
  is Marketplace · **Sell on WorldStreet**. The category mega-menu and mobile
  menu now link to `/listings?categoryId=` (browse filters by id, not slug)
- Account menu and mobile menu pruned to Messages · Profile
- **Orphan sweep, verified by consumer counts before each deletion**:
  `components/cart`, all twelve `components/product` files, AddressFormModal,
  WalletBalanceBanner; stores `cartStore`, `wishlistStore`, `addressStore`,
  `productCacheStore`; services `cartService`, `orderService`,
  `paymentService`, `downloadService`, `addressService`, `mockApi`,
  `mockCartApi`. `authStore` no longer merges guest carts on login, and
  `App.tsx` no longer seeds a guest-cart session id
- Fixed the seven remaining lint items in kept files — **`src` now lints
  completely clean** (was 66 errors before the pivot cleanup began)

## [0.32.0] - 2026-07-26

### Changed — Vendor dashboard rebound to the marketplace model

First client-side change of the pivot. The dashboard answered "how much did I
sell", which is no longer a question — nothing is sold on the platform.

- `services/storeService.ts` (new) — typed client for `/stores/me/dashboard`, `/stores/me`, and subscription charge/cancel
- `pages/vendor/Dashboard.tsx` — one call to `GET /stores/me/dashboard` replaces `getAnalytics()` + `getBalance()`
  - Tiles: **Days Remaining**, **Live Listings**, **Inquiries This Period**, **Unread Messages** (was Total Orders / Total Sales / Net Revenue / Available Balance)
  - Visibility state in the header, worded plainly — "DRAFT" means nothing to a vendor, "Not visible yet" does
  - Prioritised alert bar with an inline **Pay $5.00** action on the ones that mean the store is dark
  - "How buyers see you": response rate, average reply time, rating, views — the signals shown on the public store page
  - Subscription panel: plan, period, auto-renew, last payment, and store credit (only when non-zero)
  - Quick links drop **View Orders** and **Withdraw Funds**; "Manage Products" becomes "Manage Listings"; adds "View Public Store" when live
- Subscription amounts render in USD; the old `formatPrice` hardcoded `₦`, which is right for listings and wrong for the plan
- Activation asks for confirmation with the amount stated, since it charges a real wallet. A 402 is surfaced as "top up and try again" rather than an error

### Fixed
- `VendorRoute` gated on the identity profile's `isVendor` flag, which the pivot no longer sets for anyone — the entire `/vendor` section was unreachable. It now resolves the caller's store via `GET /stores/me`, redirects to store creation when there is none, and reads BANNED/SUSPENDED from the store rather than the legacy `vendorStatus`

### Changed — Store creation

- `pages/vendor/Registration.tsx` — now creates a marketplace store via `POST /stores` instead of registering a vendor via `POST /vendor/register`. Adds **state** (required — buyers browse by it), city, shop address, phone, WhatsApp and website; drops nothing the API still accepts
- Pricing is shown *before* the form (`GET /stores/plans`), not sprung after: "$5.00 per month to stay visible… creating your store is free, it stays private until you activate"
- Redirects to the dashboard if the user already has a store, rather than letting them fill in a form that would 409 on submit
- Empty optional fields are omitted rather than sent as `""` — the API validates email/URL/phone formats, and an empty string is a value, not an absence
- `pages/account/Account.tsx` — the seller CTA resolves the store instead of reading `user.isVendor` / `user.storeName`, which are no longer set. "Become a Vendor" → "Open a Store", and store owners see "Store Dashboard" with a visibility hint

### Changed — Manage Listings

- `services/storeService.ts` — `listingService` covering the full owner surface: list/get/create/update/delete, publish/unpublish, `form-spec`, and multipart image upload
- `pages/vendor/Products.tsx` — listings table with status tabs (All/Published/Draft/Hidden/Removed), search, publish/hide/delete row actions, and **Views + Inquiries columns** (the numbers that justify the subscription). Shows a banner when the store itself is unpaid, since a vendor who published everything and sees nothing live otherwise has no way to know which of the two gates is closed
- `pages/vendor/ProductEdit.tsx` — rewritten as the listing editor:
  - **Two-level category picker** rebuilt from the flat `/categories` response; parents with no children are hidden, because selecting one strands the vendor on an empty subcategory list and listings cannot be filed against a top-level category anyway
  - **Category attributes** rendered dynamically from `form-spec` — SELECT/TEXT/NUMBER, required markers, and the explanation that buyers filter on them
  - **Custom fields** — unlimited label/value rows up to 30, stated as display-only
  - **Variants** — only shown when the category defines variant-level attributes, with per-variant price and availability
  - Price type (fixed / range / contact for price), negotiable flag, condition, per-listing location defaulting to the store's
  - Image upload via the new store-scoped endpoint
  - **Save as draft** and **Save & publish** are separate. Publish rejections list every unmet requirement and are shown in place rather than as a toast that vanishes before the vendor can act on it
- Empty numeric and attribute values are omitted rather than sent as `0` / `""` — zero is a real price, and an empty string looks like an answer to a required field

### Added — Messages inbox

- `services/chatService.ts` — conversations, thread, send, mark-read, archive, unread summary
- `components/chat/Inbox.tsx` — shared two-pane inbox (conversation list + thread). The thread is symmetrical between buyer and vendor, so one component serves both; the **side is an explicit prop, never inferred**, because a user can be both and an inbox mixing "things I asked about" with "customers asking about my stock" is unreadable
- `pages/vendor/Messages.tsx` at `/vendor/messages` (selling) and `pages/account/Messages.tsx` at `/account/messages` (buying)
- Opening a thread marks it read, which is what clears the dashboard badge. Only the counterpart's messages are stamped — a "Read" receipt on your own message would be meaningless
- Sent messages append locally rather than triggering a refetch, so a reply appears the instant it is accepted
- Handles a listing deleted out from under a conversation ("This listing has been deleted") — the thread outlives the listing by design, since it carries the vendor's response record
- `BLOCKED` threads show a closed notice instead of a composer

### Changed — Vendor navigation
- Sidebar: **Orders** and **Withdrawals** removed (nothing is ordered or paid for on the platform), **Products** renamed to **Listings**, **Messages** added
- Dashboard: the Unread Messages tile is now a link, and Messages joins the quick links
- Account menu: **My Messages** added as the first item

### Added — Public marketplace pages

The buyer side of the loop. Nothing is bought here — the pages exist to give a
buyer enough to decide whether to make contact, then make contact easy.

- `pages/marketplace/ListingDetail.tsx` at `/listings/:idOrSlug` — gallery,
  price (fixed / range / "Contact for price" + negotiable), location, view
  count, description, **one Details table** merging category attributes with
  the seller's custom fields (the split matters to search, not to the person
  reading), an options table for variants, and tags
- `pages/marketplace/StorePage.tsx` at `/stores/:slug` — storefront with the
  seller's catalogue, description, banner, and contact block
- `components/marketplace/ContactSeller.tsx` — the primary action. Pre-filled
  in-platform message as the default, because that is what feeds the seller's
  response rate, verifies reviews and gives the buyer a record. Phone is
  reveal-on-click and WhatsApp deep-links with a pre-written message; both are
  offered *underneath* rather than instead, since hiding them just pushes
  people to ask for a number in the first message. Signed-out users are routed
  to login with a return URL
- `components/marketplace/SellerCard.tsx` — the four signals that replace a
  transaction record: verification tier, rating, **% of messages replied to**,
  and typical reply time
- Both pages carry a safety note: WorldStreet does not handle payment or
  delivery

### Added — Marketplace browse

- `pages/marketplace/Browse.tsx` at `/listings` — search, two-level category
  navigation, state and condition filters, and **attribute facets**
- **All filter state lives in the URL.** Not a nicety: a buyer narrows to
  "Phones in Lagos, 128GB, Used" and that result set has to survive being
  shared, bookmarked, or reached with the back button after opening a listing
- Facets appear only once a **subcategory** is chosen, because attributes are
  defined per category — there is no meaningful "Storage" filter across the
  whole marketplace. Only `SELECT` attributes marked filterable are offered.
  Choosing a top-level category shows "Pick a subcategory to filter by size,
  brand and other details"
- Facets are keyed by the category they were fetched for, so a stale set is
  never rendered while a new fetch is in flight
- Any filter change resets to page 1; leaving someone on page 7 of a narrower
  result set shows an empty page and looks broken
- Empty state distinguishes "nothing matches these filters" (offers a clear
  button) from "no listings yet" (offers **Open a store**, since an empty
  marketplace is a supply problem)
- `components/marketplace/ListingCard.tsx` + `utils/listingFormat.ts` — shared
  card and price/image helpers, now used by both browse and the storefront so
  the two cannot drift on price formatting

### Fixed
- `CategoryAttribute` in `product.types.ts` was missing `isFilterable`, which
  the public attributes endpoint does return — the browse facets could not have
  read it

### Added — Reviews on the listing page

- `services/marketplaceReviewService.ts` — listing/store review lists,
  eligibility, own review, create/update/delete, vendor reply
- `components/marketplace/ListingReviews.tsx` — rating summary with star
  distribution bars, review list, and the write/edit form

Two things this had to say that an ecommerce review list does not:

- **The badge reads "Contacted this seller"**, not "Verified purchase" — nothing
  was purchased here, and the badge means the seller actually replied to that
  buyer. A hover title spells it out. There is also a filter: *"Only show
  reviews from buyers the seller replied to"*, shown only when it would
  actually narrow the list
- **The gate is stated before any writing happens.** `eligibility` is fetched up
  front, so a buyer who has not messaged the seller sees *"Message the seller
  about this item before reviewing it"* rather than losing 300 words to a 403.
  If they can review but the seller has not replied yet, the form warns that it
  will post unverified
- The **seller's reply** renders nested under the review — their only answer to
  an unfair one, since they have no refund or resolution lever
- `FLAGGED` reviews show "Reported — under review" and stay visible, matching
  the server's decision to keep a disputed review public while it is open
- Empty state explains the anchor: *"Reviews here come from buyers who have
  actually contacted this seller"*
- A failed review fetch does not take the listing page down with it

### Added — Report buttons

The moderation queue had no way to receive anything from the buyer side.

- `services/reportService.ts` — create + own history, with **reasons scoped per
  target type**. The server accepts the full enum, but offering "Fake review" on
  a listing or "Miscategorised" on a store just invites mis-filed reports, and
  the queue is ranked and filtered by reason
- `components/marketplace/ReportButton.tsx` — a plain text link that opens a
  dialog with radio reasons, optional detail, and a confirmation state
- Mounted in three places: **Report this listing** (end of the listing page),
  **Report this store** (under the seller card), and **Report review** on each
  review — hidden on your own review, since reporting yourself is meaningless
- Deliberately understated. A prominent report control invites idle clicking,
  and the queue is ranked by *distinct* reporters, so noise degrades the exact
  signal an admin works from
- Two responses that are not errors and are not worded as such: **409** ("You
  have already reported this — our team is looking at it") is the dedupe guard
  working, and **401** routes to login with a return URL instead of failing
- The dialog is honest about what happens next: *"we will not always be able to
  tell you the outcome"*, and *"the seller is not told who reported them"*

### Changed — Vendor reviews page

- `pages/vendor/Reviews.tsx` — rewritten against `GET /stores/me/reviews`
  instead of the dead `/vendor/reviews`. Its real job is the **right of reply**,
  which had no UI at all: a vendor has no refund, no resolution and no way to
  make anything right, so a public response is their only answer to an unfair
  review. "Reply publicly" is therefore the primary action on every unanswered
  review, not a buried one
- Replies can be edited or removed; removing one leaves the review standing, and
  the confirm says so
- **"Only show reviews I have not replied to"** filter, and the dashboard's
  unreplied-review alert now links here with `?unreplied=1` so arriving from it
  lands on the filtered view rather than page one of everything
- Reply placeholder is a nudge, not a hint: *"Buyers read this alongside the
  review, so a calm, factual reply reads better than a defensive one"*
- **Report this review** on each unanswered review — the seller is usually the
  one who spots a fake, and the server now permits it
- Badge reads "Contacted you" from the vendor's side; `FLAGGED` reviews show
  "Reported — under review"
- Empty state explains the causal chain rather than just being empty: reviews
  come from buyers who messaged you, so answering messages is what produces them
  — with a link to the inbox

### Removed — Dead vendor pages

- `pages/vendor/Orders.tsx`, `OrderDetail.tsx`, `Withdrawals.tsx` deleted, along
  with their routes — they targeted removed features (`/vendor/orders`,
  `/vendor/withdrawals`) and would only ever have rendered errors
- A `*` catch-all under `/vendor` sends stale bookmarks to the dashboard
  instead of the router's unmatched-route error
- `vendorService` is now consumed only by `Settings.tsx` (four profile /
  withdrawal-account methods); everything else in it is dead code that goes
  when Settings is rewritten against `PATCH /stores/me`

### Changed — Store settings rewritten; vendorService deleted

- `pages/vendor/Settings.tsx` — now edits the store via `PATCH /stores/me`
  instead of the vendor fields on UserProfile (behind a gate that 403s for
  everyone) and a bank withdrawal account (a removed feature). Sections:
  store link (copy + public-page link, or "not visible yet" pointing at the
  dashboard), identity, branding (logo/banner upload), contact channels, and
  location. Nothing financial lives here — the subscription is on the dashboard
- **Emptied fields clear.** `""` in an input is sent as `null` (unset), never as
  an empty-string value
- **Renaming does not silently change the store URL.** A rename reveals an
  opt-in checkbox that says plainly: "This changes your URL — anywhere you have
  shared the old link will stop working." It disarms after every save
- `services/vendorService.ts` **deleted** — Settings was its last consumer
- `storeService` gains `updateStore` and `uploadBranding` (same upload rail as
  listing images, separate folder)

### Removed / Changed — Admin pages

Nine of twelve admin pages targeted the ecommerce model and are deleted:
`Products`, `ProductEdit`, `Orders`, `OrderDetail`, `Inventory`, `Vendors`,
`VendorDetail`, `Withdrawals`, `Commission`. Their routes are gone and a `*`
catch-all under `/admin` sends stale bookmarks to the dashboard. The admin nav
shrinks to Dashboard · Categories · Users.

- `pages/admin/Dashboard.tsx` — rewritten. The old one led with Total Orders
  and Total Revenue; nothing is transacted on the platform, so the admin's job
  is **moderation**. It now shows the report queue's numbers (open reports,
  reported targets, in review, resolved) and the most-reported table from
  `GET /admin/reports/stats`, with quick links to Categories, Users and the
  marketplace. It says plainly that the full queue screen (claim / dismiss /
  action) is the next admin build — the API exists, the page does not
- `services/reportService.ts` gains `adminReportService.stats`
- `Categories.tsx` / `Users.tsx` kept (their endpoints are live) and their
  `any`-typed catches fixed — the admin section now lints clean

### Still pre-pivot
`Orders.tsx`, `OrderDetail.tsx` and `Withdrawals.tsx` target removed features
and are now unlinked but still routed. `Products.tsx` / `ProductEdit.tsx` still
call the old vendor product endpoints and have no support for category
attributes or custom fields. There are no Messages or Subscription pages yet.

## [0.31.0] - 2026-07-17

### Added — Delivery Tracking & Fulfilment UI (Test 7)

- `src/pages/vendor/OrderDetail.tsx` — full fulfilment workflow: action-labelled transitions (Start Processing → Mark as Packaged → Mark as Shipped → Out for Delivery → Mark as Delivered / Delivery Failed), required tracking-number input when shipping, Shipment card (method, tracking with carrier link, expected-by date), and a "Delivery Delayed?" form that pushes back the expected date with a customer-visible reason (emails the buyer)
- `src/pages/account/OrderDetail.tsx` — click-to-copy tracking number, "Track with <partner>" button using the carrier's tracking URL, new stage labels in the timeline, and failed-delivery guidance (re-attempt or contact support for a refund)
- `src/pages/account/OrderHistory.tsx`, `vendor/Orders.tsx`, `admin/Orders.tsx` — filter options and badges for the new stages
- `src/pages/admin/OrderDetail.tsx` — transition map mirrors the server (incl. DELIVERY_FAILED → re-attempt/refund/cancel)
- `src/services/vendorService.ts` — `updateOrderStatus` widened to all fulfilment stages + trackingNumber; new `extendDeliveryDate`
- `src/types/order.types.ts` — `OrderStatus` gains PACKAGED/OUT_FOR_DELIVERY/DELIVERY_FAILED; Order gains `trackingNumber`/`trackingUrl`

## [0.30.0] - 2026-07-17

### Added — Delivery Details at Checkout (Test 6)

- `src/pages/Checkout.tsx` — Delivery Method section in the review step: radio list of active methods showing partner, price (and free-over threshold), and arrival window; changing the method re-prices the preview server-side; the chosen method is sent with checkout confirmation
- `src/components/product/ProductInfo.tsx` — product page shows "Estimated delivery: Jul 20 – Jul 22 via GIG Logistics · from ₦2,500" for physical products (cheapest active method)
- `src/pages/CheckoutSuccess.tsx` — replaced the hardcoded "3–5 business days" with the real expected delivery date + partner from the created order (hidden when unknown)
- `src/pages/account/OrderDetail.tsx` — Delivery card: method, partner, expected-by date
- `src/services/orderService.ts` — `getShippingMethods()`; `previewSession(shippingMethodId?)`
- `src/types/order.types.ts` — dead `ShippingRate` replaced with `ShippingMethodSummary`; preview gains `shippingMethod`; Order gains delivery snapshot fields

## [0.29.0] - 2026-07-17

### Added — Listing Standards & Structured Attributes (Tests 2 & 8)

- `src/pages/vendor/ProductEdit.tsx` — category is now required and loads the category's listing-standard attributes; variants get structured attribute inputs (Size/Color dropdowns from category options, text/number fields otherwise) with the variant name auto-derived from attribute values ("L / Navy"); new Product Details section (Brand, Material, Weight in grams, Dimensions L×W×H cm/in — physical only); physical products require ≥1 image before submit; non-compliant saved listings show a "no longer meets the listing requirements" banner listing exactly what to fix
- `src/pages/vendor/Products.tsx` — "Update required" badge on non-compliant listings (hover shows the problems)
- `src/components/product/ProductInfo.tsx` — Specifications table (Brand, Material, Weight, Dimensions) on the product detail page
- `src/services/productService.ts` — `categoryService.getCategoryAttributes(categoryId)`
- `src/services/vendorService.ts` — `VendorCreateProductData` now requires `categoryId`, adds brand/material/weightGrams/dimensions
- `src/types/product.types.ts` — `CategoryAttribute`, `ProductDimensions`, `ListingCompliance` types; Product gains material/weightGrams/dimensions/compliance

## [0.28.0] - 2026-07-17

### Added — Brand Filtering (Test 3)

- `src/components/product/ProductFilters.tsx` — new collapsible Brands section (single-select checkboxes, hidden while no brands exist), fed by the previously-unused `productService.getBrands()`
- `src/pages/ProductListing.tsx` — parses/serializes `brand`, `featured`, and `sale` URL params, passes them to `getProducts` (server already filtered on `brand`/`isFeatured`/`onSale`), includes brand in active-filter detection, and titles the page "Featured Products" / "Deals & Sale" for those views
- `src/types/product.types.ts` — `ProductFilters.brands?: string[]` corrected to `brand?: string` (matches the server's singular param); added `onSale?: boolean`

### Fixed — Dead Nav Tabs (Test 4)

- `src/components/layout/Header.tsx` — removed the dead "Featured Brands" and "Gift Cards" tabs; "Super Deals" now points at the working `?sale=true` filter, "Featured" at `?featured=true`, and "Trending Styles" replaced with "All Products"
- `src/components/layout/Footer.tsx` — shop links pointed at the nonexistent `/shop` route; now `/products` (Featured/New Arrivals links work)
- Mobile menu Featured/Sale links now actually filter (same params, now parsed)

## [0.27.0] - 2026-07-17

### Changed — Wallet-First Checkout (Test 1)

- `src/pages/Checkout.tsx` — payment method is now the WorldStreet Wallet by default (Flutterwave and Crypto options removed; Mock stays dev-only). Shows the buyer's live USD balance and the converted order total (₦ at the quoted rate), disables Place Order with a top-up prompt when the balance is insufficient (optional `VITE_WALLET_TOPUP_URL` renders a Top Up link)
- `src/services/paymentService.ts` — added `getWalletBalance(amountNgn?)` (`GET /payments/wallet/balance`) with `WalletBalanceQuote` types
- `src/styles/_pages.scss` — wallet balance/insufficient-funds styles in the payment selector
- Removed stale Paystack references in CheckoutSuccess/CheckoutFailure comments

## [0.26.0] - 2026-04-10

### Added — Marketplace Phase 6 & 7: Vendor Dashboard, Settings, Reviews & Admin Vendor Management

#### Vendor Dashboard (complete rewrite)
- `src/pages/vendor/Dashboard.tsx` — replaced stub with full dashboard: 4 stat cards (total orders, total sales, net revenue, available balance), commission info bar, earnings-over-time table with date range filter, quick links grid to Products/Orders/Reviews/Settings

#### Vendor Settings Page (new)
- `src/pages/vendor/Settings.tsx` — store settings form with editable store name and description, read-only store URL slug, account status badge, save with profile sync

#### Vendor Reviews Page (new)
- `src/pages/vendor/Reviews.tsx` — paginated customer reviews list with rating filter (1–5 stars), sort options (newest/oldest/highest/lowest), star display, verified purchase badge, product link

#### Admin Vendor Management (new)
- `src/pages/admin/Vendors.tsx` — vendor list with search, status filter (ACTIVE/SUSPENDED/BANNED), sort options, paginated table showing store name, owner, status, product count, earnings
- `src/pages/admin/VendorDetail.tsx` — vendor detail with info grid, store description, status management buttons (activate/suspend/ban with confirmation), recent orders table, products table with approval status, stats sidebar
- `src/pages/admin/Commission.tsx` — commission rate setting form, platform summary cards (total orders, sales, commission earned, net to vendors), vendor breakdown table

#### Services
- `src/services/vendorService.ts` — added types: `VendorBalanceSummary`, `VendorAnalytics`, `LedgerEntry`, `VendorEarningsFilters`, `VendorReview`, `VendorReviewFilters`; added methods: `getAnalytics()`, `getEarnings()`, `getBalance()`, `getReviews()`
- `src/services/adminService.ts` — added types: `AdminVendorFilters`, `AdminVendor`, `AdminVendorDetail`, `CommissionReport`, `CommissionSetting`; added methods: `getVendors()`, `getVendor()`, `updateVendorStatus()`, `getVendorProducts()`, `getCommissionReport()`, `getCommissionRate()`, `updateCommissionRate()`

#### Router & Navigation
- `src/router/index.tsx` — added lazy imports and routes: `/vendor/settings`, `/vendor/reviews`, `/admin/vendors`, `/admin/vendors/:id`, `/admin/settings/commission`
- `src/layouts/VendorLayout.tsx` — added Reviews nav item
- `src/layouts/AdminLayout.tsx` — added Vendors nav item

#### Types
- `src/types/user.types.ts` — added optional vendor fields to UserProfile: `storeName`, `storeSlug`, `storeDescription`

### Fixed
- Vendor pages (Products, Orders, ProductEdit, OrderDetail) — fixed `res.data.data` → `res.data` data access pattern (api helper already unwraps axios response)
- `src/services/vendorService.ts` — changed `VendorCreateProductData.images` to inline type without `id` (not available at creation time)
- `src/styles/_pages.scss` — fixed undefined Sass variables: `$background-alt` → `$bg-secondary`, `$warning-bg` → `lighten($warning-color, 35%)`

## [0.25.0] - 2026-04-10

### Added — Phase 5: Vendor Order Fulfillment

#### Vendor Orders Page
- `src/pages/vendor/Orders.tsx` — Paginated order list with status filtering, search by order number, sort options. Shows order number, date, item count, total, status badge. Links to order detail.

#### Vendor Order Detail Page
- `src/pages/vendor/OrderDetail.tsx` — Full order detail with line items, order summary, customer name (no email/phone per spec), shipping address, status timeline. Vendor-restricted status update controls: PAID → PROCESSING → DELIVERED only. Optional note on status change.

#### Services
- `src/services/vendorService.ts` — Added `VendorOrderFilters` type, `getOrders()`, `getOrder()`, `updateOrderStatus()` methods for vendor order API

#### Router
- `src/router/index.tsx` — Added lazy-loaded `VendorOrders` and `VendorOrderDetail` pages. Routes: `/vendor/orders`, `/vendor/orders/:id`

## [0.24.0] - 2026-04-10

### Changed — Phase 4: Multi-Vendor Cart & Order Splitting + Mock Payment

#### Cart Page (vendor grouping)
- `src/pages/Cart.tsx` — items now grouped by vendor with "From [Store Name]" section headers linking to vendor store pages; platform products shown as "From WorldShop"

#### Checkout Page (complete rewrite)
- `src/pages/Checkout.tsx` — new flow: preview checkout session → vendor-grouped order review → confirm + pay → redirect to mock payment. Uses `checkoutService.previewSession()` for vendor groups + snapshot token, `confirmSession()` for atomic order creation (handles 409 cart-changed), `initializePayment()` for mock redirect. Preview sidebar shows vendor-level subtotals and shipping.

#### Mock Payment Page (new)
- `src/pages/MockPayment.tsx` — simulated payment gateway page at `/checkout/mock-payment?session=xxx&ref=yyy`. Shows session/reference details with Confirm/Decline buttons. Calls `paymentService.sendWebhook()` then redirects to success/failure pages.

#### Checkout Success Page (adapted)
- `src/pages/CheckoutSuccess.tsx` — updated for mock payment verification (replaces Paystack). Shows multiple order numbers for split-vendor checkouts. Uses `VerifyPaymentResult` type with `orders[]` array.

#### Types
- `src/types/order.types.ts` — `Order` gained `vendorId?`, `checkoutSessionId?`. Added: `CheckoutIssue`, `VendorGroup`, `CheckoutSessionPreview`, `ConfirmCheckoutSessionInput`, `CheckoutSessionResult`, `InitPaymentResult`, `VerifyPaymentResult`

#### Services
- `src/services/orderService.ts` — `checkoutService` gained `previewSession()`, `confirmSession()`, `initializePayment()`. Legacy `validateCart()` kept.
- `src/services/paymentService.ts` — rewritten: removed all Paystack types/methods. Added `verifyPayment(transactionRef)` and `sendWebhook(checkoutSessionId, action)`.

#### Router & Styles
- `src/router/index.tsx` — added `/checkout/mock-payment` route (lazy, protected)
- `src/styles/_pages.scss` — added `.vendor-group`, `.vendor-group-header`, `.vendor-order-group`, `.vendor-group-totals`, `.mock-payment-page`, `.mock-payment-card`, `.mock-payment-header`, `.mock-payment-details`, `.mock-payment-actions` styles

## [0.23.0] - 2026-04-09

### Added — Phase 3: Public Store Pages

#### Store Page
- `src/pages/Store.tsx` — vendor storefront page with store header (name, description, product count), product grid, sorting, and pagination; fetches via `/api/v1/store/:slug`
- `src/router/index.tsx` — added `/store/:slug` route with lazy-loaded StorePage

#### Store Service
- `src/services/productService.ts` — added `storeService.getStoreBySlug()` for fetching vendor store data with product pagination

#### Vendor Attribution on Products
- `src/types/product.types.ts` — added `vendor?: { storeName, storeSlug }` to Product type; added `StoreInfo` interface
- `src/components/product/ProductCard.tsx` — displays vendor store name below category with link to `/store/:slug`
- `src/components/product/ProductInfo.tsx` — "Sold by [Vendor Name]" link below product meta on detail page

#### Styles
- `src/styles/_product.scss` — `.product-card-vendor` and `.product-info-vendor` / `.product-info-vendor-link` styles
- `src/styles/_pages.scss` — `.store-page`, `.store-header`, `.store-toolbar` styles

## [0.22.0] - 2026-04-08

### Added — Phase 2: Vendor Product Management (Client)

#### Vendor Product Pages
- `src/pages/vendor/Products.tsx` — vendor product list with search, filters, pagination, active/inactive toggle, edit/delete actions
- `src/pages/vendor/ProductEdit.tsx` — create/edit product form (name, description, price, tags, variants, images) with react-hook-form + Zod validation

#### Vendor Service Extensions
- `src/services/vendorService.ts` — added product CRUD endpoints: `getProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `toggleProduct`

#### Type Updates
- `src/types/product.types.ts` — added `vendorId` and `approvalStatus` fields to Product type

#### Styles
- `src/styles/_vendor.scss` — expanded with product list, product form, variant editor styles

## [0.21.0] - 2026-04-07

### Added — Phase 1: Vendor Identity & Onboarding (Client)

#### Auth & User Types
- `src/types/user.types.ts` — added vendor fields: `isVendor`, `vendorStatus`, `storeName`, `storeSlug`, `storeDescription`, `vendorSince`
- `src/store/authStore.ts` — maps vendor fields from API to Zustand store

#### Vendor Service
- `src/services/vendorService.ts` — `register`, `getProfile`, `updateProfile` API wrappers

#### Route Guards & Layout
- `src/components/auth/VendorRoute.tsx` — route guard checking isVendor + vendorStatus
- `src/layouts/VendorLayout.tsx` — sidebar layout for vendor dashboard

#### Vendor Pages
- `src/pages/vendor/Dashboard.tsx` — vendor dashboard with welcome message and quick stats
- `src/pages/vendor/Registration.tsx` — vendor registration form with store name/description

#### Router & Navigation
- `src/router/index.tsx` — added `/vendor/register` (ProtectedRoute) and `/vendor/*` (VendorRoute) routes
- `src/pages/account/Account.tsx` — "Become a Vendor" CTA for non-vendor users

#### Styles
- `src/styles/_vendor.scss` — vendor dashboard, registration form, sidebar styles

## [0.20.0] - 2026-02-13

### Changed — Storefront UI Improvements

#### Header & Cart
- `src/components/layout/Header.tsx` — cart icon SVG increased from 22×22 to 26×26 for better visibility
- `src/styles/_layout.scss` — `.cart-btn` set to `width: auto` with padding and gap; `.cart-total` font bumped from `$font-size-xs` to `$font-size-sm`, margin increased to 6px

#### Hero Slider
- `src/pages/Home.tsx` — removed prev/next arrow buttons from hero slider; now auto-slides only (6s interval) with pagination dots; removed `prevBanner` and `nextBanner` handler functions

### Added — Main Dashboard Navigation

#### Desktop & Mobile
- `src/components/layout/Header.tsx` — added external "Main Dashboard" link (`https://dashboard.worldstreetgold.com`) in header bottom nav bar with grid icon SVG
- `src/components/layout/MobileMenu.tsx` — added "Main Dashboard" link with `dashboard` Material Icon in mobile slide-out nav
- `src/styles/_layout.scss` — added `.header-dashboard-link` styles (yellow text, subtle background, hover effect)

### Changed — Admin Pagination (15 per page)

#### Dashboard
- `src/pages/admin/Dashboard.tsx` — added server-side pagination for recent orders (15 per page); `useCallback` fetch with `page` dependency; Previous/Next pagination UI controls
- `src/services/adminService.ts` — `getDashboardStats()` now accepts `(page, limit)` params, passes as query params; added `recentOrdersPagination` field to `DashboardStats` type (`page, limit, total, totalPages, hasPrevPage, hasNextPage`)

#### Orders & Products
- `src/pages/admin/Orders.tsx` — default pagination limit changed from 20 to 15
- `src/pages/admin/Products.tsx` — default pagination limit changed from 20 to 15

## [0.19.0] - 2026-02-12

### Added — Digital Products & Downloads Support

#### Types & Interfaces
- `src/types/product.types.ts` — added `DigitalAsset` interface (`id, productId, fileName, r2Key?, signedUrl?, mimeType, fileSize, sortOrder, createdAt?`), added `digitalAssets?: DigitalAsset[]` and `type` field to `Product` interface
- `src/types/order.types.ts` — `Order.shippingAddress` changed to `ShippingAddress | null` (optional for digital orders), `CreateOrderRequest.shippingAddress` made optional
- `src/types/download.types.ts` — **new file**: `DownloadRecord` interface (with nested `asset` and `orderItem`), `DownloadUrl` interface (`downloadUrl, fileName, expiresAt, downloadsRemaining`)
- Exported from `src/types/index.ts`

#### Services
- `src/services/adminService.ts` — `UploadResult.url` renamed to `UploadResult.signedUrl`; added methods: `uploadDigitalFiles`, `getDigitalAssets`, `attachDigitalAssets`, `deleteDigitalAsset`
- `src/services/downloadService.ts` — **new file**: `getMyDownloads()`, `getOrderDownloads(orderId)`, `generateDownloadUrl(downloadId)`
- `src/services/paymentService.ts` — added `hasDigitalProducts?: boolean` to `VerifyPaymentData`
- Exported from `src/services/index.ts`

#### Checkout Flow (Digital-Aware)
- `src/pages/Checkout.tsx` — detects `isDigitalOnly` carts, auto-skips shipping step, conditionally sends `shippingAddress`, review section shows "Digital Delivery" for digital orders, back button navigates to cart for digital
- `src/pages/CheckoutSuccess.tsx` — digital-specific "What's Next" messaging (download page link, 2-download/7-day limit notice), hides estimated delivery for digital orders

#### Downloads Page
- `src/pages/account/Downloads.tsx` — **new page**: loading skeleton, empty state, download cards with file info (name, size, mime type), order link, download count/limit, expiry date, download button with disabled states
- `src/pages/account/Account.tsx` — added "Downloads" menu item with `cloud_download` icon
- `src/router/index.tsx` — added `/account/downloads` route with lazy loading

#### Order Detail (Digital Downloads)
- `src/pages/account/OrderDetail.tsx` — fetches order downloads for paid/processing/shipped/delivered orders, "Digital Downloads" section with download buttons, shipping address guarded (shows "Digital Delivery" when null)

#### Admin Product Edit (Digital Products)
- `src/pages/admin/ProductEdit.tsx` — product type selector (`PHYSICAL` / `DIGITAL`), digital file upload UI with file list (name, size, mime type, remove button), auto-sets stock to 999999 for digital, hides inventory section for digital, attaches temp digital assets on product creation; fixed `r.url` → `r.signedUrl` for image uploads
- `src/pages/admin/Products.tsx` — added "Type" column with Physical/Digital badge
- `src/pages/admin/Categories.tsx` — fixed `results[0].url` → `results[0].signedUrl` for category image upload

#### Product UI Components (Digital Badges)
- `src/components/product/ProductCard.tsx` — "Digital" badge in product card badges section
- `src/components/product/ProductInfo.tsx` — shows "Digital Product" badge instead of stock status, "Instant Download" + "Email Delivery" features instead of "Free Shipping" + "30-Day Returns"

### Fixed
- `TS6196`: Removed unused `ShippingAddress` import from `Checkout.tsx`
- `TS2339`: Fixed `results[0].url` → `results[0].signedUrl` in `Categories.tsx` (matching updated `UploadResult` type)

## [0.18.0] - 2026-02-12

### Added — Phase 5: Admin Panel (Products & Categories)

#### Admin API Service
- `src/services/adminService.ts` — complete admin API client with types
  - `DashboardStats`, `AdminProductFilters`, `CreateProductData`, `UpdateProductData`, `AdminCategory`, `CreateCategoryData`, `UpdateCategoryData`, `UploadResult`
  - Methods: `getDashboardStats`, `getProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `getCategories`, `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`, `uploadImages`, `deleteUploadedImages`

#### Admin Dashboard (wired to real API)
- Stat cards: Total Orders, Revenue, Active/Total Products, Categories
- Out of Stock & Low Stock alert cards (conditional rendering)
- Recent Orders table with links to order detail
- Loading skeleton states

#### Admin Products (wired to real API)
- Product listing with thumbnails, SKU, category, price (sale support), stock badges, active status
- Filter by category, status (active/inactive/all), stock level
- Search by name/SKU
- Pagination controls
- Delete with confirmation dialog + toast notifications

#### Admin Product Edit (wired to real API)
- Full create/edit form: name, description, shortDesc, SKU, category, brand, tags, pricing, stock, flags
- Image upload to Cloudflare R2 via `adminService.uploadImages`
- Image management: set primary, remove (with R2 cleanup), grid display
- Auto-loads product data in edit mode

#### Admin Categories (wired to real API)
- Category list with thumbnails, product counts, parent display
- Selected/inactive visual states
- Create/edit form: name, description, image upload, icon, parent select, sort order, active toggle
- Delete (soft deactivation) with confirmation

#### Admin SCSS Additions
- `.category-item`, `.category-item-info`, `.category-item-actions` — interactive list items
- `.category-image-preview` — preview with remove button
- `.product-cell`, `.product-thumb` — table cell with thumbnail
- `.uploaded-images-grid`, `.uploaded-image`, `.primary-badge`, `.image-actions` — image management grid
- `.btn-icon`, `.btn-icon-danger`, `.btn-icon-sm` — icon-only action buttons
- `.stat-card--danger`, `.stat-card--warning` — alert stat card variants
- `.badge-secondary`, `.skeleton-row`, `.checkbox-label`, `.text-muted` — utilities

## [0.17.0] - 2026-02-11

### Added — Admin Dashboard Navigation
- Dashboard link in header navigation for admin users (conditional rendering based on user role)
- Dashboard icon (grid icon) with active state highlighting
- Styled with primary color theme in `_layout.scss`
- Automatically shown/hidden based on `user?.role === 'ADMIN'`

### Changed — Wishlist UI Redesign
- Complete redesign of wishlist page with modern card-based layout
- Product cards now feature:
  - Hover effects with shadow transitions
  - Clickable product images and titles (navigate to product detail)
  - Remove button (X icon) positioned top-right
  - Sale badges showing discount percentage
  - Out of stock badges for unavailable items
  - Stock warnings for low inventory (≤5 items)
  - Price display with original/sale price strikethrough
  - Add to cart buttons with icons and disabled states
- Responsive grid layout: 2 columns (mobile), auto-fill 280px cards (desktop)
- All wishlist styles added to `_pages.scss` with proper SCSS variables

### Fixed
- TypeScript error: Removed category property from wishlist items (not returned by backend)
- Product navigation from wishlist now fully functional

## [0.16.0] - 2026-02-10

### Added — Reviews Integration (Service 9)
- `reviewService.ts` — real API client for product reviews (`getProductReviews`, `getSummary`, `getMyReview`, `create`, `update`, `delete`)
- Connected to backend at `/api/v1/products/:productId/reviews`

### Changed — ProductDetail Reviews
- `ProductDetail.tsx` — replaced `reviewApi` (mockApi) import with real `reviewService`
- Review summary now uses `ReviewSummary` type from reviewService (with `totalCount` and `distribution` object)
- Review fetch wrapped in try/catch — gracefully falls back to empty state if no reviews exist
- Review submission calls `reviewService.create(productId, data)` with proper payload shape

### Changed — Wishlist Integration (Service 10)
- `wishlistStore.ts` — fixed response extraction to use `response.data.wishlist` instead of `response.data` (backend returns `{ success, wishlist }`)
- `Wishlist.tsx` — added `useEffect` to call `fetchWishlist()` on mount, added loading state before content renders

## [0.15.0] - 2026-02-09

### Changed — Order Pages Redesign (Electro-Inspired)
- `OrderHistory.tsx` completely rewritten — WooCommerce-style order table with product thumbnails, status badges, responsive card layout on mobile, skeleton loading, status filter tabs
- `OrderDetail.tsx` completely rewritten — sectioned layout with order info header, items table with images, shipping address card, order timeline with status markers, order summary totals, cancel button for CREATED orders
- Created `_orders.scss` — comprehensive SCSS partial for customer-facing order pages

### Styles — Order Pages
- `.orders-page` with status filter tabs, skeleton loading, empty state
- `.order-card` with product thumbnail strip, status badges (CREATED/PAID/PROCESSING/SHIPPED/DELIVERED/CANCELLED/REFUNDED), responsive mobile layout
- `.order-detail-page` with info header, items table, address card, timeline, summary section
- Status badge colors: yellow (CREATED), green (PAID/DELIVERED), blue (PROCESSING/SHIPPED), red (CANCELLED/REFUNDED)
- Responsive: table → stacked cards on mobile, timeline adapts for small screens
- Follows existing design system: `$primary-color`, `$secondary-color`, `@include card` mixin, BEM naming

## [0.14.0] - 2026-02-09

### Added — Payments Integration (Service 8: Paystack)
- `paymentService.ts` — API client for payment operations (`initializePayment`, `verifyPayment`)
- `InitializePaymentData`, `VerifyPaymentData` TypeScript interfaces
- Exported from `services/index.ts` barrel

### Changed — Checkout Flow
- `Checkout.tsx` now initializes Paystack payment after creating order, then redirects to Paystack hosted payment page via `window.location.href`
- Order creation + payment initialization flow: Create Order (CREATED) → Initialize Payment → Redirect to Paystack

### Changed — Checkout Success Page
- `CheckoutSuccess.tsx` now handles `?reference=` / `?trxref=` URL params from Paystack redirect
- Auto-verifies payment on mount via `paymentService.verifyPayment(reference)`
- Shows verification spinner while confirming payment
- Displays payment-specific success message ("Your payment was successful and your order has been confirmed")
- Handles failed/abandoned payment states with appropriate messaging and retry links
- Handles verification errors with fallback UI

### Changed — Checkout Failure Page
- `CheckoutFailure.tsx` now reads `?reference=` / `?trxref=` URL params from Paystack failed redirects
- Shows Paystack-specific error message when reference param is present

## [0.13.0] - 2026-02-09

### Added — Addresses System (Service 6)
- `addressService.ts` — API client for address CRUD (`getAddresses`, `getAddress`, `createAddress`, `updateAddress`, `deleteAddress`, `setDefault`)
- `nigerianStates.ts` — shared `NIGERIAN_STATES` constant (37 states), `STATE_DISPLAY_NAMES` map, `getStateDisplayName()` helper
- `AddressFormModal.tsx` — modal form component for create/edit addresses (Nigerian states dropdown, validation, loading states)
- `Address`, `CreateAddressRequest`, `UpdateAddressRequest` types in `user.types.ts`

### Changed — Addresses Page
- Completely rewrote `Addresses.tsx` from stub to full CRUD page
- Address cards with default badge, edit/delete/set-default actions
- Max 5 limit notice, loading skeletons (3 cards), empty state with SVG icon + "Add Your First Address" CTA
- Confirm dialog before delete, toast notifications for all actions

### Changed — Checkout Saved Address Picker
- Checkout.tsx now fetches saved addresses on mount
- Auto-selects default address and populates shipping form
- Saved address cards shown above shipping form (click to select and populate)
- "Use a different address" link to clear and enter new address manually
- Replaced hardcoded `<option>` elements with shared `NIGERIAN_STATES` from `nigerianStates.ts`

### Styles
- `.addresses-page` grid layout, `.address-card` with default badge, skeleton loading, empty state styles
- `.address-form` modal form styles (form groups, rows, checkbox, error states)
- `.saved-addresses-picker` and `.saved-address-card` styles for checkout page
- `skeleton-pulse` keyframe animation

## [0.12.0] - 2026-02-09

### Added — Cart & Orders Integration (Service 5)
- Cart store (`cartStore.ts`) connected to real backend API
- `cartService.ts` — real API client replacing `mockCartApi.ts`
- `orderService.ts` — order creation, listing, detail, cancellation
- `checkoutService` — cart validation before order placement
- Cart sidebar, Cart page, and Checkout page connected to live backend
- Order history and order detail pages connected to real API
- Guest cart with session ID + merge on login
- Currency normalized to NGN (₦) across all cart and order displays

## [0.11.0] - 2026-02-09

### Changed — Electro Template Home Page Redesign
- Completely rewrote Home.tsx to replicate the Electro HTML template home page layout
- Hero slider redesigned: static background image, product images per slide, CSS slide-in animations (slideInLeft/slideInRight), 3 rotating slides with 6s interval
- Removed `bannerApi` dependency — hero now uses static `heroSlides` data (no API calls)
- Promo banner cards section with 4 promotional tiles
- Deals section with countdown timer + tabbed product grid (Featured / On Sale / Top Rated)
- Tab products grid improved: bordered cells with padding instead of 1px gap, smart nth-child border removal per breakpoint
- Category showcase section with image cards
- Full-width promotional banner section
- Featured products carousel section
- Features strip (free shipping, money back, support, secure payment)

### Changed — ProductCard Electro Redesign
- Restructured ProductCard.tsx to match Electro template card layout
- New layout order: category → product name → rating → image → price + cart icon
- Body/footer structure: `.product-card-body` wraps content, `.product-card-footer` has price left + cart icon right
- Product name color changed to Electro blue (#2874f0)
- Cart button changed from full-width text to icon-only yellow circle (36px)
- Removed border-radius on cards, images use `object-fit: contain` with transparent background
- Hover shows shadow + z-index elevation (no transform)
- List variant updated for new body/footer structure

### Styles
- Complete _product.scss card section rewrite (Electro-inspired styles)
- New _pages.scss hero slider with static background, keyframe animations, slide-offer pricing display
- Tab products grid bordered cell layout with responsive nth-child border rules
- Removed `.hero-fallback` styles (no longer needed)

## [0.10.0] - 2026-02-09

### Added — Products & Categories Integration
- Product and category pages now use real API data for listings, detail, and search flows
- Shared category store for navigation and mobile menu

### Changed — Navigation & Branding
- Simplified header layout with inline nav and improved category dropdown
- Logo applied across header, mobile menu, and footer
- Favicon and web manifest wired to new brand assets

### Fixed
- Wishlist price display now supports base/sale price and legacy mock fields
- Mock product helpers now handle base price and average rating naming

## [0.9.0] - 2026-02-08

### Added — Profile Integration (Service 2)
- `profileService.ts` — API client for `GET /profile` and `PATCH /profile` on worldshop-server
- `UserProfile`, `Gender`, `UpdateProfileRequest` types in `user.types.ts`
- Profile page now fetches real data from the backend on mount
- New profile fields: date of birth, gender
- Profile auto-creates on first backend access (syncs from auth user)

### Changed — Profile Page UI Redesign
- Two-column layout: sidebar with avatar/info/quick links + main form area
- Avatar with gradient initials fallback
- Breadcrumb navigation (My Account / Profile)
- Modern form fields with focus states, error highlighting, and disabled styling
- Quick links sidebar for Orders, Addresses, Wishlist
- Security section links to external WorldStreet auth for password changes
- Loading spinner state while fetching profile
- Save button with inline spinner + disabled state when form is clean
- Responsive: collapses to single column on smaller screens

### Changed — API Configuration
- `VITE_API_BASE_URL` updated to point to worldshop-server at `http://localhost:8000/api/v1`

### Styles
- Complete profile page SCSS rewrite with BEM naming
- New `.form-field` component styles (input, select, error, hint, disabled states)
- `.profile-card`, `.profile-nav`, `.profile-section`, `.profile-breadcrumb` components
- Custom select dropdown arrow via SVG background
- Spinner animation keyframes

## [0.8.0] - Previous

### Added
- External auth integration with WorldStreet Identity (HttpOnly cookies)
- Protected routes with `ProtectedRoute` and `AdminRoute`
- Auth store with verify → refresh → redirect flow
- Cleaned all auth console logs and dev tools
