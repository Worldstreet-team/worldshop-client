# Changelog

All notable changes to worldshop-client will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
